/* FarmVista Beta — Grain Ticket OCR compatibility entry point
   The active scanner still references this historical module path.
   OCR implementation lives under /core. */

import { installTemplateGuidedRegionalReread } from "./core/regional-reread.js?v=20260917-1";
export { normalizeGrainTicketGrades } from "./core/grade-normalizer.js?v=20260917-1";

/* Install before the driver captures a ticket. The normal full-ticket OCR call
   remains first; supported templates can then request higher-resolution OCR
   evidence from important regions of the original image. */
installTemplateGuidedRegionalReread();
