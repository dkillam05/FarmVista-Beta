// FarmVista Grain Operations — centralized drag/drop allocation decisions
// DOM drag/drop code calls this controller; business rules stay out of UI files.
import { clean, round2, ticketBushels, isVoided } from '../core/grain-rules.js';

export function canAssignTicketToHaulingJob(ticket,job){
  if(!ticket||!job||isVoided(ticket)||isVoided(job))return {ok:false,reason:'Unavailable'};
  const ticketCrop=clean(ticket?.crop??ticket?.commodity).toLowerCase();
  const jobCrop=clean(job?.crop??job?.commodity).toLowerCase();
  if(ticketCrop&&jobCrop&&ticketCrop!==jobCrop)return {ok:false,reason:'Crop does not match'};
  const ticketBuyer=clean(ticket?.buyerId??ticket?.deliveryLocationId);
  const jobBuyer=clean(job?.buyerId??job?.deliveryLocationId);
  if(ticketBuyer&&jobBuyer&&ticketBuyer!==jobBuyer)return {ok:false,reason:'Destination does not match'};
  return {ok:true,reason:''};
}

export function planManualHaulingMove(ticket,targetJob,{bushels}={}){
  const allowed=canAssignTicketToHaulingJob(ticket,targetJob);
  if(!allowed.ok)return {...allowed,changes:null};
  const total=ticketBushels(ticket);
  const amount=Math.max(0,Math.min(total,round2(bushels??total)));
  if(amount<=0)return {ok:false,reason:'No bushels to assign',changes:null};
  return {ok:true,reason:'',changes:{targetHaulingJobId:clean(targetJob.id),bushels:amount,manualOverride:true}};
}

export function planUnassignHaulingPortion(ticket,{bushels}={}){
  const total=ticketBushels(ticket);
  const amount=Math.max(0,Math.min(total,round2(bushels??total)));
  return {ok:amount>0,reason:amount>0?'':'No bushels to unassign',changes:amount>0?{bushels:amount,allocationType:'unassigned'}:null};
}

export function planContractMove(ticket,contract,{bushels}={}){
  if(!ticket||!contract||isVoided(ticket)||isVoided(contract))return {ok:false,reason:'Unavailable',changes:null};
  const tc=clean(ticket?.crop??ticket?.commodity).toLowerCase();
  const cc=clean(contract?.crop??contract?.commodity).toLowerCase();
  if(tc&&cc&&tc!==cc)return {ok:false,reason:'Crop does not match',changes:null};
  const total=ticketBushels(ticket);
  const amount=Math.max(0,Math.min(total,round2(bushels??total)));
  return {ok:amount>0,reason:amount>0?'':'No bushels to assign',changes:amount>0?{contractId:clean(contract.id),bushels:amount}:null};
}
