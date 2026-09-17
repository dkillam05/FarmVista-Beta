/* FarmVista Beta — Grain Ticket OCR Verification Entry Point
   Dedicated Document OCR returns evidence only. Known elevator interpretation
   belongs to GitHub templates, not the legacy generic Cloud-era parser. */

import { normalizeGrainTicketGrades as normalizeLegacyGrades } from "../legacy/grain-ticket-ocr-grade-normalizer-legacy.js";
import { applyGrainTicketTemplate } from "./template-dispatcher.js";

export function normalizeGrainTicketGrades(result) {
  if (!result || typeof result !== "object") return result;

  const dedicatedDocumentOcr =
    result?.ocrEngine === "google_document_ai_document_ocr" ||
    (Array.isArray(result?.pages) && typeof result?.documentText === "string");

  /*
    The new dedicated service intentionally returns raw OCR evidence only.
    Do not run that evidence through the old Cloud-era/legacy grade parser;
    doing so can apply stale assumptions before the elevator template sees it.
  */
  if (dedicatedDocumentOcr) {
    result.grainTicket =
      result.grainTicket && typeof result.grainTicket === "object"
        ? result.grainTicket
        : {};

    result.grainTicket.rawText = String(result.documentText || result.grainTicket.rawText || "");
    result.grainTicket.ocrPages = Array.isArray(result.pages) ? result.pages : [];
    result.grainTicket.ocrEngine = result.ocrEngine || "google_document_ai_document_ocr";
  } else {
    /* Preserve legacy behavior for any older/non-dedicated OCR response. */
    normalizeLegacyGrades(result);
  }

  const dispatch = applyGrainTicketTemplate(result);

  if (dispatch?.matched === true && dispatch?.complete === true) {
    result.scanValid = true;
    result.scanErrors = [];

    if (result.grainTicket && typeof result.grainTicket === "object") {
      result.grainTicket.scanValid = true;
      result.grainTicket.scanErrors = [];
    }

    result.templateValidation = {
      source: "github_template",
      template: dispatch.template,
      repairedGenericValidation: true,
      dedicatedDocumentOcr
    };

    console.log("[Grain Ticket] Template verified OCR ticket:", result.templateValidation);
  } else if (dedicatedDocumentOcr) {
    /* Dedicated OCR has no Cloud scanValid contract. An incomplete template
       must stay reviewable instead of being silently treated as a good scan. */
    result.scanValid = false;
    result.scanErrors = Array.isArray(result.scanErrors) ? result.scanErrors : [];
    if (!result.scanErrors.length) {
      result.scanErrors.push("Known ticket template did not verify every required field.");
    }

    console.warn("[Grain Ticket] Dedicated OCR template incomplete:", {
      template: dispatch?.template || null,
      matched: dispatch?.matched === true,
      ticket: result.grainTicket
    });
  }

  return result;
}
