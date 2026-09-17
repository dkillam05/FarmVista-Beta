/* FarmVista — Grain Ticket OCR Verification Entry Point
   Dedicated Document OCR stays generic. Known elevator interpretation belongs
   to GitHub templates. Legacy cleanup is retained only for older OCR responses. */

import { normalizeGrainTicketGrades as normalizeLegacyGrades } from "../legacy/grain-ticket-ocr-grade-normalizer-legacy.js";
import { applyGrainTicketTemplate } from "./template-dispatcher.js?v=20260917-3";

export function normalizeGrainTicketGrades(result) {
  if (!result || typeof result !== "object") return result;

  const isDocumentOcr =
    result.ocrEngine === "google_document_ai_document_ocr" ||
    result.grainTicket?.ocrEngine === "google_document_ai_document_ocr" ||
    result.ocrTransport?.source === "farmvista_grain_ticket_ocr";

  if (isDocumentOcr) {
    if (!result.grainTicket || typeof result.grainTicket !== "object") result.grainTicket = {};
    result.grainTicket.rawText = String(result.documentText || result.grainTicket.rawText || "");
    result.grainTicket.ocrEngine = result.ocrEngine || "google_document_ai_document_ocr";
    if (Array.isArray(result.pages)) result.grainTicket.ocrPages = result.pages;
  } else {
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
      repairedGenericValidation: true
    };

    console.log("[Grain Ticket] Template verified repaired OCR ticket:", result.templateValidation);
  }

  return result;
}
