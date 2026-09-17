// FarmVista Grain Operations — single centralized entry point
// The live legacy page is not switched to this entry point until the replacement UI is complete.
import { loadGrainOperations, refreshGrainOperations, grainState, subscribe } from './data/grain-store.js';
import * as rules from './core/grain-rules.js';
import { buildHaulingRows, ticketsForHaulingJob } from './hauling/hauling-model.js';
import { buildContractRows, deliveredToContract } from './contracts/contract-model.js';
import { buildTicketRows } from './tickets/ticket-model.js';
import { settlementStatus } from './settlements/settlement-engine.js';
import { installLandscapeLock } from './ui/landscape-lock.js';
import { buildWorkspaceModel } from './ui/workspace-model.js';
import { startGrainWorkspace, getWorkspaceModel, onWorkspaceChange } from './ui/workspace-controller.js';
import * as allocation from './drag-drop/allocation-controller.js';

export const GrainOperations = Object.freeze({
  load:loadGrainOperations, refresh:refreshGrainOperations, state:grainState, subscribe, rules,
  hauling:Object.freeze({rows:()=>buildHaulingRows(grainState()),ticketsForJob:id=>ticketsForHaulingJob(id,grainState())}),
  contracts:Object.freeze({rows:()=>buildContractRows(grainState()),delivered:id=>deliveredToContract(id,grainState().tickets)}),
  tickets:Object.freeze({rows:()=>buildTicketRows(grainState())}),
  workspace:Object.freeze({build:()=>buildWorkspaceModel(grainState()),start:startGrainWorkspace,get:getWorkspaceModel,subscribe:onWorkspaceChange}),
  allocation:Object.freeze(allocation), settlementStatus, installLandscapeLock
});
window.FVGrainOperations=GrainOperations;
console.info('[FarmVista Beta] Central Grain Operations domain ready.');
