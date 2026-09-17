/* FarmVista — Grain Ticket OCR Verification Entry Point
   Cloud OCR stays generic. FarmVista first keeps the generic cleanup,
   then gives a matching GitHub elevator template final authority over
   that known ticket layout before the scanner validates or saves it. */

import { normalizeGrainTicketGrades as normalizeLegacyGrades } from "../legacy/grain-ticket-ocr-grade-normalizer-legacy.js";
import { applyGrainTicketTemplate } from "./template-dispatcher.js";

export function normalizeGrainTicketGrades(result) {
  if (!result || typeof result !== "object") return result;

  /* Generic cleanup only. This must never contain elevator-specific rules. */
  normalizeLegacyGrades(result);

  /* Known elevator layouts are interpreted only by GitHub templates. */
  const dispatch = applyGrainTicketTemplate(result);

  /*
    The Cloud function calculated scanValid before the GitHub template ran.
    A complete template has now independently recovered and verified the
    required ticket fields from the raw OCR text/layout, so stale generic
    errors must not kill an otherwise repaired ticket.

    If no template matches, or a matched template is incomplete, we leave
    the Cloud validation untouched and the normal generic scanner rules run.
  */
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
