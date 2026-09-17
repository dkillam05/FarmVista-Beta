// FarmVista Grain Operations — ticket detail/read model
import { clean, normalizeSplitAllocations, ticketBushels } from '../core/grain-rules.js';
import { ticketReviewReasons } from '../core/grain-validation.js';
const find=(rows,id)=>(rows||[]).find(x=>clean(x.id)===clean(id));
export function buildTicketDetail(ticket,state){if(!ticket)return null;const sourceJob=find(state?.haulingJobs,ticket.haulingJobId);const contract=find(state?.contracts,ticket.contractId);const splits=normalizeSplitAllocations(ticket).map(x=>({...x,job:x.haulingJobId?find(state?.haulingJobs,x.haulingJobId):null}));return{...ticket,effectiveBushels:ticketBushels(ticket),sourceJob,contract,splits,reviewReasons:ticketReviewReasons(ticket),needsReview:ticketReviewReasons(ticket).length>0,buyerDisplay:clean(ticket.buyerName??ticket.deliveryLocationName),customerDisplay:clean(ticket.customerName??ticket.soldUnder),ticketDisplay:clean(ticket.ticketNumber??ticket.ticketNo??ticket.id)}}
