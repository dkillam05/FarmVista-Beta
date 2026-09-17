// FarmVista Grain Operations — centralized drag/drop allocation decisions.
// DOM code asks this controller; compatibility and capacity stay out of UI files.
import { clean,round2,ticketBushels,isVoided,compatibleHaulingJob,jobTarget,effectiveJobTotals,isSpotHaulingJob,normalizeSplitAllocations } from '../core/grain-rules.js';
import { compatibleContract } from '../contracts/contract-allocation.js';
import { contractTarget } from '../core/grain-rules.js';
import { deliveredToContract } from '../contracts/contract-model.js';

const otherTickets=(ticket,state)=>(state?.tickets||[]).filter(x=>clean(x?.id)!==clean(ticket?.id));
const contractAllocations=ticket=>(Array.isArray(ticket?.contractAllocations)?ticket.contractAllocations:[])
  .map(a=>({contractId:clean(a?.contractId),bushels:Math.max(0,round2(a?.bushels))}))
  .filter(a=>a.contractId&&a.bushels>0);
const contractAllocatedBushels=ticket=>round2(contractAllocations(ticket).reduce((sum,a)=>sum+a.bushels,0));
const contractUnallocatedBushels=ticket=>Math.max(0,round2(ticketBushels(ticket)-contractAllocatedBushels(ticket)));
const haulingMovedBushels=ticket=>round2(normalizeSplitAllocations(ticket)
  .filter(x=>x.allocationType==='job'||x.allocationType==='unassigned')
  .reduce((sum,x)=>sum+Math.max(0,Number(x.bushels)||0),0));
const haulingSourceBushels=ticket=>Math.max(0,round2(ticketBushels(ticket)-haulingMovedBushels(ticket)));

export function canAssignTicketToHaulingJob(ticket,job,state={}){
  if(!ticket||!job||isVoided(ticket)||isVoided(job))return{ok:false,reason:'Unavailable'};
  if(!compatibleHaulingJob(job,ticket))return{ok:false,reason:'Crop, destination, Sold Under, or delivery dates do not match'};
  const sourceCapacity=haulingSourceBushels(ticket);
  if(sourceCapacity<=0)return{ok:false,reason:'No unallocated source bushels remain on this ticket'};
  if(isSpotHaulingJob(job))return{ok:true,reason:'',capacity:sourceCapacity,spotLoadOnly:true};
  const used=effectiveJobTotals(otherTickets(ticket,state)).get(clean(job.id))||0;
  const jobCapacity=Math.max(0,round2(jobTarget(job)-used));
  const capacity=Math.min(sourceCapacity,jobCapacity);
  if(jobCapacity<=0)return{ok:false,reason:'Hauling job is full'};
  if(capacity<=0)return{ok:false,reason:'No bushels to assign'};
  return{ok:true,reason:'',capacity};
}

export function planManualHaulingMove(ticket,targetJob,{bushels,state}={}){
  const allowed=canAssignTicketToHaulingJob(ticket,targetJob,state);
  if(!allowed.ok)return{...allowed,changes:null};
  const requested=Math.max(0,round2(bushels??allowed.capacity));
  const amount=Math.min(requested,allowed.capacity);
  if(amount<=0)return{ok:false,reason:'No bushels to assign',changes:null};
  return{ok:true,reason:'',changes:{targetHaulingJobId:clean(targetJob.id),bushels:round2(amount),manualOverride:true,spotLoadOnly:allowed.spotLoadOnly===true},remainingBushels:round2(haulingSourceBushels(ticket)-amount)};
}

export function planUnassignHaulingPortion(ticket,{bushels}={}){
  const available=haulingSourceBushels(ticket),amount=Math.max(0,Math.min(available,round2(bushels??available)));
  return{ok:amount>0,reason:amount>0?'':'No bushels to unassign',changes:amount>0?{bushels:amount,allocationType:'unassigned'}:null};
}

export function canAssignTicketToContract(ticket,contract,state={}){
  if(!ticket||!contract||isVoided(ticket)||isVoided(contract))return{ok:false,reason:'Unavailable'};
  if(!compatibleContract(contract,ticket))return{ok:false,reason:'Crop, destination, Sold Under, or delivery dates do not match'};
  const ticketCapacity=contractUnallocatedBushels(ticket);
  if(ticketCapacity<=0)return{ok:false,reason:'Ticket is fully allocated to contracts'};
  const target=contractTarget(contract);
  if(target<=0)return{ok:true,reason:'',capacity:ticketCapacity,spotLoadOnly:true};
  const contractCapacity=Math.max(0,round2(target-deliveredToContract(contract.id,otherTickets(ticket,state))));
  if(contractCapacity<=0)return{ok:false,reason:'Contract is full'};
  return{ok:true,reason:'',capacity:Math.min(ticketCapacity,contractCapacity)};
}

export function planContractMove(ticket,contract,{bushels,state}={}){
  const allowed=canAssignTicketToContract(ticket,contract,state);
  if(!allowed.ok)return{...allowed,changes:null};
  const requested=Math.max(0,round2(bushels??allowed.capacity)),amount=Math.min(requested,allowed.capacity);
  return{ok:amount>0,reason:amount>0?'':'No bushels to assign',changes:amount>0?{contractId:clean(contract.id),bushels:round2(amount)}:null,remainingBushels:round2(contractUnallocatedBushels(ticket)-amount)};
}
