/* FarmVista Beta — Grain Ticket OCR compatibility entry point
   The active scanner still references this historical module path.
   Keep all OCR implementation organized under /core; this file only
   forwards the scanner import so the template dispatcher runs normally. */

export { normalizeGrainTicketGrades } from "./core/grade-normalizer.js";
