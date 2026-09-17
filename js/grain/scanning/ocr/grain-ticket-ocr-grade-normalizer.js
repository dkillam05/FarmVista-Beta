/* FarmVista — Grain Ticket OCR Verification Entry Point
   Keep the scanner page simple: generic verification first, then the
   GitHub elevator-template dispatcher gets final authority for known layouts. */

import { normalizeGrainTicketGrades as normalizeLegacyGrades } from "./legacy/grain-ticket-ocr-grade-normalizer-legacy.js";
import { applyGrainTicketTemplate } from "./grain-ticket-template-dispatcher.js";

export function normalizeGrainTicketGrades(result) {
  normalizeLegacyGrades(result);
  applyGrainTicketTemplate(result);
  return result;
}
