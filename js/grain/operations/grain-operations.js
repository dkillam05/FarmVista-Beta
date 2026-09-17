// FarmVista Grain Operations — single centralized entry point
// The live legacy page is not switched to this entry point until the replacement UI is complete.
import { loadGrainOperations, refreshGrainOperations, grainState, subscribe } from './data/grain-store.js';
import * as rules from './core/grain-rules.js';
import { buildHaulingRows, ticketsForHaulingJob } from './hauling/hauling-model.js';
import { buildContractRows, deliveredToContract } from './contracts/contract-model.js';
import { buildTicketRows } from './tickets/ticket-model.js';
import { settlementStatus } from './settlements/settlement-engine.js';
import { installLandscapeLock } from './ui/landscape-lock.js';

export const GrainOperations = Object.freeze({
  load:loadGrainOperations,
  refresh:refreshGrainOperations,
  state:grainState,
  subscribe,
  rules,
  hauling:Object.freeze({rows:()=>buildHaulingRows(grainState()),ticketsForJob:id=>ticketsForHaulingJob(id,grainState())}),
  contracts:Object.freeze({rows:()=>buildContractRows(grainState()),delivered:id=>deliveredToContract(id,grainState().tickets)}),
  tickets:Object.freeze({rows:()=>buildTicketRows(grainState())}),
  settlementStatus,
  installLandscapeLock
});

window.FVGrainOperations=GrainOperations;
console.info('[FarmVista Beta] Central Grain Operations domain ready.');
