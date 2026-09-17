/* FarmVista Beta — Template-guided OCR regional reread
   The Cloud OCR service remains generic. For supported ticket layouts, this
   browser layer re-reads small, important regions from the ORIGINAL image and
   appends that evidence to the raw OCR text before the GitHub template parses it.

   Important: this module does not guess or alter numbers. It only obtains more
   OCR evidence from higher-resolution crops. Elevator templates remain
   responsible for interpretation and verification. */

const SCOULAR_MARKERS = /scoular|waverly|15379\s+jasmine/i;
let installed = false;

function rawText(result) {
  return String(result?.documentText || result?.document?.text || result?.grainTicket?.rawText || "");
}

function isScoular(result) {
  return SCOULAR_MARKERS.test([
    result?.grainTicket?.elevatorName,
    result?.grainTicket?.deliveryCity,
    rawText(result)
  ].filter(Boolean).join("\n"));
}

function base64ToBlob(base64, mimeType) {
  const binary = atob(String(base64 || "").replace(/^data:[^,]+,/, ""));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mimeType || "image/jpeg" });
}

async function cropToBase64(base64, mimeType, region) {
  const blob = base64ToBlob(base64, mimeType);
  const bitmap = await createImageBitmap(blob);
  try {
    const sx = Math.max(0, Math.round(bitmap.width * region.x));
    const sy = Math.max(0, Math.round(bitmap.height * region.y));
    const sw = Math.max(1, Math.min(bitmap.width - sx, Math.round(bitmap.width * region.w)));
    const sh = Math.max(1, Math.min(bitmap.height - sy, Math.round(bitmap.height * region.h)));

    /* Enlarge the crop before OCR. Small thermal-printer digits benefit from
       having substantially more pixels without inventing any content. */
    const scale = Math.max(2, Math.min(4, 2200 / Math.max(sw, sh)));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(sw * scale));
    canvas.height = Math.max(1, Math.round(sh * scale));
    const ctx = canvas.getContext("2d", { alpha: false });
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

    const out = await new Promise((resolve, reject) => {
      canvas.toBlob(b => b ? resolve(b) : reject(new Error("Crop encoding failed")), "image/jpeg", 0.98);
    });
    const buffer = new Uint8Array(await out.arrayBuffer());
    let binary = "";
    const chunk = 0x8000;
    for (let i = 0; i < buffer.length; i += chunk) {
      binary += String.fromCharCode(...buffer.subarray(i, i + chunk));
    }
    return btoa(binary);
  } finally {
    bitmap.close?.();
  }
}

async function rereadRegion(nativeFetch, url, originalBody, region) {
  const content = await cropToBase64(originalBody.content, originalBody.mimeType, region);
  const response = await nativeFetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode: "grain_ticket", content, mimeType: "image/jpeg" })
  });
  if (!response.ok) return null;
  const result = await response.json();
  const text = rawText(result);
  return text ? { name: region.name, text } : null;
}

async function enrichScoular(nativeFetch, url, requestBody, firstResult) {
  /* Scoular Waverly thermal ticket layout. Regions deliberately overlap so a
     slightly tilted/off-center photo does not cut labels or values in half. */
  const regions = [
    { name: "SCOULAR HEADER/TICKET", x: 0.04, y: 0.05, w: 0.92, h: 0.36 },
    { name: "SCOULAR GRADES",        x: 0.03, y: 0.30, w: 0.94, h: 0.38 },
    { name: "SCOULAR WEIGHTS",       x: 0.03, y: 0.52, w: 0.94, h: 0.34 },
    { name: "SCOULAR BUSHELS",       x: 0.03, y: 0.68, w: 0.94, h: 0.27 }
  ];

  const reads = [];
  /* Sequential calls are intentional: cellular connections are more reliable
     than firing four large OCR uploads simultaneously. */
  for (const region of regions) {
    try {
      const read = await rereadRegion(nativeFetch, url, requestBody, region);
      if (read) reads.push(read);
    } catch (error) {
      console.warn(`[Grain Ticket] Regional OCR reread failed (${region.name}):`, error);
    }
  }

  if (!reads.length) return firstResult;

  const original = rawText(firstResult);
  const evidence = reads.map(r => `\n--- ${r.name} REGIONAL OCR ---\n${r.text}`).join("\n");
  firstResult.documentText = `${original}${evidence}`.trim();
  firstResult.regionalOcr = {
    attempted: regions.map(r => r.name),
    completed: reads.map(r => r.name),
    source: "original_image_crops",
    guessedValues: false
  };
  console.log("[Grain Ticket] Scoular regional OCR evidence added:", firstResult.regionalOcr);
  return firstResult;
}

export function installTemplateGuidedRegionalReread() {
  if (installed || typeof window === "undefined" || typeof window.fetch !== "function") return;
  installed = true;

  const nativeFetch = window.fetch.bind(window);
  window.fetch = async function farmVistaRegionalOcrFetch(input, init) {
    const response = await nativeFetch(input, init);

    try {
      const url = typeof input === "string" ? input : String(input?.url || "");
      if (!/fv-ocr-300398089669\.us-central1\.run\.app\/fvOcr/i.test(url)) return response;
      if (String(init?.method || "GET").toUpperCase() !== "POST") return response;

      const requestBody = JSON.parse(String(init?.body || "{}"));
      if (requestBody?.mode !== "grain_ticket" || !requestBody?.content) return response;

      const firstResult = await response.clone().json();
      if (!isScoular(firstResult)) return response;

      const enriched = await enrichScoular(nativeFetch, url, requestBody, firstResult);
      return new Response(JSON.stringify(enriched), {
        status: response.status,
        statusText: response.statusText,
        headers: { "Content-Type": "application/json" }
      });
    } catch (error) {
      /* Never break the normal scanner if regional reread itself has trouble. */
      console.warn("[Grain Ticket] Regional OCR layer fell back to full-ticket OCR:", error);
      return response;
    }
  };
}
