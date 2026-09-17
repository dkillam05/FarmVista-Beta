/* FarmVista Beta — Template-guided OCR regional reread
   Cloud OCR remains generic. For a supported ticket layout, this browser layer
   takes focused crops from the ORIGINAL photo and uses only the OCR document
   text from those crop responses as extra evidence for the GitHub template.

   Important: regional structured fields are intentionally ignored. This module
   never guesses, repairs, or assigns a number. */

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

async function sourceBitmap(base64, mimeType) {
  return createImageBitmap(base64ToBlob(base64, mimeType));
}

async function cropBitmapToBase64(bitmap, region) {
  const sx = Math.max(0, Math.round(bitmap.width * region.x));
  const sy = Math.max(0, Math.round(bitmap.height * region.y));
  const sw = Math.max(1, Math.min(bitmap.width - sx, Math.round(bitmap.width * region.w)));
  const sh = Math.max(1, Math.min(bitmap.height - sy, Math.round(bitmap.height * region.h)));

  /* Upscale the actual source pixels. No sharpening or number reconstruction is
     performed; OCR receives the same photographed characters, just larger. */
  const scale = Math.max(2, Math.min(4, 2400 / Math.max(sw, sh)));
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
    canvas.toBlob(b => b ? resolve(b) : reject(new Error("Crop encoding failed")), "image/jpeg", 0.99);
  });
  const buffer = new Uint8Array(await out.arrayBuffer());
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < buffer.length; i += chunk) {
    binary += String.fromCharCode(...buffer.subarray(i, i + chunk));
  }
  return btoa(binary);
}

async function rereadRegion(nativeFetch, url, bitmap, region) {
  const content = await cropBitmapToBase64(bitmap, region);
  const response = await nativeFetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode: "grain_ticket", content, mimeType: "image/jpeg" })
  });
  if (!response.ok) return null;

  /* Deliberately ignore result.grainTicket/result.fields here. A crop is not a
     complete grain ticket, so its generic structured parse is not authoritative.
     We retain only Google's raw document reading for the elevator template. */
  const result = await response.json();
  const text = rawText(result).trim();
  return text ? { name: region.name, text } : null;
}

async function enrichScoular(nativeFetch, url, requestBody, firstResult) {
  /* Coordinates are based on the verified Scoular-Waverly SCALE TICKET layout.
     They are intentionally tight enough to enlarge small digits while retaining
     their printed labels. Small overlap tolerates normal handheld framing/tilt.

     Header: date/ticket/customer/crop.
     Grades: Test Weight/Moisture/Damaged Kernels/BCFM and value column.
     Scale: Gross/Tare/Net plus Gross/Net Bushels.

     Three focused reads replace the previous four broad reads. They run together
     so a supported ticket does not wait through several full OCR latencies. */
  const regions = [
    { name: "SCOULAR IDENTITY", x: 0.32, y: 0.12, w: 0.52, h: 0.31 },
    { name: "SCOULAR GRADES",   x: 0.025, y: 0.39, w: 0.31, h: 0.20 },
    { name: "SCOULAR SCALE",    x: 0.36, y: 0.49, w: 0.45, h: 0.20 }
  ];

  let bitmap;
  try {
    bitmap = await sourceBitmap(requestBody.content, requestBody.mimeType);
    const settled = await Promise.allSettled(
      regions.map(region => rereadRegion(nativeFetch, url, bitmap, region))
    );

    const reads = [];
    settled.forEach((item, index) => {
      if (item.status === "fulfilled" && item.value) {
        reads.push(item.value);
      } else if (item.status === "rejected") {
        console.warn(`[Grain Ticket] Regional OCR reread failed (${regions[index].name}):`, item.reason);
      }
    });

    if (!reads.length) return firstResult;

    const original = rawText(firstResult);
    const evidence = reads
      .map(r => `\n--- ${r.name} RAW OCR EVIDENCE ---\n${r.text}`)
      .join("\n");

    firstResult.documentText = `${original}${evidence}`.trim();
    firstResult.regionalOcr = {
      attempted: regions.map(r => r.name),
      completed: reads.map(r => r.name),
      source: "focused_original_image_crops_raw_document_text_only",
      structuredCropFieldsUsed: false,
      guessedValues: false
    };

    console.log("[Grain Ticket] Scoular focused raw OCR evidence added:", firstResult.regionalOcr);
    return firstResult;
  } finally {
    bitmap?.close?.();
  }
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
      /* Regional enhancement can never break the normal full-ticket scan. */
      console.warn("[Grain Ticket] Regional OCR layer fell back to full-ticket OCR:", error);
      return response;
    }
  };
}
