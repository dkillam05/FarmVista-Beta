// FarmVista Grain Operations — single future entry point
// This file is intentionally not wired into the live Beta page until the centralized UI
// replacement is complete. That keeps the known-good baseline testable while the rebuild is assembled.
import { loadGrainOperations, grainState, subscribe } from './data/grain-store.js';
import * as rules from './core/grain-rules.js';
import { settlementStatus } from './settlements/settlement-engine.js';

export const GrainOperations = Object.freeze({ load:loadGrainOperations, state:grainState, subscribe, rules, settlementStatus });
window.FVGrainOperations = GrainOperations;
console.info('[FarmVista Beta] Central Grain Operations foundation loaded.');
