// FarmVista Grain Operations — ticket model shared by hauling, contracts and future settlements.
import { clean, ticketBushels, isVoided } from '../core/grain-rules.js';

export function buildTicketRows(state){
  return (state?.tickets||[]).map(ticket=>({
    ...ticket,
    effectiveBushels:ticketBushels(ticket),
    effectiveHaulingJobId:clean(ticket?.haulingJobId),
    isVoided:isVoided(ticket),
    splitAllocations:Array.isArray(ticket?.haulingJobSplitAllocations)?ticket.haulingJobSplitAllocations:[],
    contractAllocations:Array.isArray(ticket?.contractAllocations)?ticket.contractAllocations:[]
  }));
}
