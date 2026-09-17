// FarmVista Grain Operations — one planner for a newly scanned/saved ticket.
// Hauling and contract decisions are calculated from the same state snapshot.
import { buildAutomaticHaulingAssignment } from '../hauling/hauling-allocation.js';
import { planContractAllocation } from '../contracts/contract-allocation.js';
import { ticketReviewReasons } from '../core/grain-validation.js';
export function planTicketAllocation(ticket,state){const hauling=buildAutomaticHaulingAssignment(ticket,state);const contracts=planContractAllocation(ticket,state?.contracts||[],state?.tickets||[]);const reviewReasons=ticketReviewReasons(ticket);return{hauling,contracts,reviewReasons,needsReview:reviewReasons.length>0}}
