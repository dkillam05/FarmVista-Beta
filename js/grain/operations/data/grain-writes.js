// FarmVista Grain Operations — single Firestore write gateway
// UI modules never write directly to Firestore.
import { ready, getFirestore, doc, setDoc, updateDoc, serverTimestamp } from '/js/firebase/firebase-init.js';
import { COLLECTIONS, refreshGrainOperations } from './grain-store.js';
import { clean, round2 } from '../core/grain-rules.js';

async function db(){await ready;return getFirestore()}
async function patch(collectionName,id,data){const store=await db();await updateDoc(doc(store,collectionName,clean(id)),{...data,updatedAt:serverTimestamp()});await refreshGrainOperations()}
async function put(collectionName,id,data){const store=await db();await setDoc(doc(store,collectionName,clean(id)),{...data,updatedAt:serverTimestamp()},{merge:true});await refreshGrainOperations()}

export const saveHaulingJob=(id,data)=>put(COLLECTIONS.haulingJobs,id,data);
export const saveContract=(id,data)=>put(COLLECTIONS.contracts,id,data);
export const patchTicket=(id,data)=>patch(COLLECTIONS.tickets,id,data);

export async function assignWholeTicketToJob(ticket,targetJob){
  const bushels=round2(ticket?.effectiveBushels??ticket?.netBushels??ticket?.netBu??ticket?.bushels);
  return patchTicket(ticket.id,{haulingJobId:clean(targetJob.id),haulingJobName:clean(targetJob.jobName),haulingJobSplitAllocations:[],allocationModelVersion:2,manualHaulingOverride:true,manualHaulingOverrideAt:serverTimestamp(),assignedBushels:bushels});
}
export async function unassignTicketFromJob(ticket){return patchTicket(ticket.id,{haulingJobId:null,haulingJobName:null,haulingJobSplitAllocations:[],manualHaulingOverride:true,manualHaulingOverrideAt:serverTimestamp()})}
export async function assignWholeTicketToContract(ticket,contract){
  const bushels=round2(ticket?.effectiveBushels??ticket?.netBushels??ticket?.netBu??ticket?.bushels);
  return patchTicket(ticket.id,{contractId:clean(contract.id),contractNumber:clean(contract.contractNumber||contract.number),contractAllocations:[{contractId:clean(contract.id),contractNumber:clean(contract.contractNumber||contract.number),bushels}],manualContractOverride:true,manualContractOverrideAt:serverTimestamp()});
}
