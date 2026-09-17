// FarmVista Grain Operations — centralized domain rules
// One authoritative place for hauling, contract, ticket and settlement relationships.

export const EPS = 0.005;
export const clean = value => String(value ?? '').trim();
export const key = value => clean(value).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
export const number = value => Number.isFinite(Number(value)) ? Number(value) : 0;
export const round2 = value => Math.round((number(value) + Number.EPSILON) * 100) / 100;

export const ticketBushels = ticket => Math.max(0, round2(ticket?.netBushels ?? ticket?.netBu ?? ticket?.bushels));
export const jobTarget = job => Math.max(0, round2(job?.startingBushels ?? job?.jobBushels ?? job?.bushels));
export const contractTarget = contract => Math.max(0, round2(contract?.bushels ?? contract?.contractBushels ?? contract?.quantity));

export function isVoided(record){
  return record?.voided === true || ['void','voided','cancelled','canceled'].includes(key(record?.status));
}

export function sameCrop(a,b){ return !!key(a) && key(a) === key(b); }
export function sameBuyer(job,ticket){
  const ids = [clean(job?.buyerId), clean(job?.deliveryLocationId)].filter(Boolean);
  const ticketIds = [clean(ticket?.buyerId), clean(ticket?.deliveryLocationId)].filter(Boolean);
  if(ids.length && ticketIds.length && ids.some(id => ticketIds.includes(id))) return true;
  return key(job?.buyerName ?? job?.deliveryLocationName) === key(ticket?.buyerName ?? ticket?.deliveryLocationName);
}
export function sameCustomer(job,ticket){
  const a = clean(job?.customerId ?? job?.grainCustomerId);
  const b = clean(ticket?.customerId ?? ticket?.grainCustomerId);
  if(a && b) return a === b;
  return key(job?.customerName ?? job?.soldUnder) === key(ticket?.customerName ?? ticket?.soldUnder);
}

export function normalizeSplitAllocations(ticket){
  const sourceJobId = clean(ticket?.haulingJobId);
  const raw = Array.isArray(ticket?.haulingJobSplitAllocations) ? ticket.haulingJobSplitAllocations : [];
  return raw.map(item => ({
    sourceJobId: clean(item?.sourceJobId || sourceJobId),
    haulingJobId: clean(item?.haulingJobId),
    contractId: clean(item?.contractId),
    bushels: Math.max(0, round2(item?.bushels)),
    allocationType: ['job','spot','unassigned'].includes(key(item?.allocationType)) ? key(item?.allocationType) : 'job'
  })).filter(item => item.sourceJobId && item.bushels > EPS);
}

// Effective job totals: a physical ticket starts on its source job. Portions moved to another
// job are subtracted from the source and added to the target. Genuine Spot remains on the
// source so operational overhaul is visible. Unassigned portions are removed from the source.
export function effectiveJobTotals(tickets){
  const totals = new Map();
  const add = (id,bu) => { if(id && Math.abs(bu) > EPS) totals.set(id, round2((totals.get(id)||0)+bu)); };
  for(const ticket of tickets || []){
    if(isVoided(ticket)) continue;
    const source = clean(ticket?.haulingJobId);
    const total = ticketBushels(ticket);
    if(source && total > EPS) add(source,total);
    for(const allocation of normalizeSplitAllocations(ticket)){
      if(allocation.sourceJobId === source && allocation.allocationType === 'unassigned') add(source,-allocation.bushels);
      if(allocation.sourceJobId === source && allocation.allocationType === 'job' && allocation.haulingJobId && allocation.haulingJobId !== source){
        add(source,-allocation.bushels);
        add(allocation.haulingJobId,allocation.bushels);
      }
    }
  }
  return totals;
}

export function haulingStatus(job,tickets,now=new Date()){
  if(isVoided(job) || job?.active === false) return 'closed';
  const target = jobTarget(job);
  const used = effectiveJobTotals(tickets).get(clean(job?.id)) || 0;
  if(target > EPS && used + EPS >= target) return used > target + EPS ? 'overhauled' : 'completed';
  const start = clean(job?.deliveryStartDate);
  if(start && new Date(`${start}T00:00:00`) > now) return 'upcoming';
  return 'active';
}

export function compatibleHaulingJob(job,ticket){
  if(!job || !ticket || isVoided(job) || jobTarget(job) <= EPS) return false;
  if(!sameCrop(job?.crop ?? job?.commodity,ticket?.crop ?? ticket?.commodity)) return false;
  if(!sameBuyer(job,ticket) || !sameCustomer(job,ticket)) return false;
  const date = clean(ticket?.date ?? ticket?.ticketDate);
  if(date && job?.deliveryStartDate && date < clean(job.deliveryStartDate)) return false;
  if(date && job?.deliveryEndDate && date > clean(job.deliveryEndDate)) return false;
  return true;
}

export function planHaulingAllocation(ticket,jobs,tickets){
  let remaining = ticketBushels(ticket);
  const totals = effectiveJobTotals(tickets);
  const eligible = (jobs||[]).filter(job => compatibleHaulingJob(job,ticket) && haulingStatus(job,tickets)==='active')
    .sort((a,b) => clean(a.deliveryStartDate).localeCompare(clean(b.deliveryStartDate)) || clean(a.createdAt).localeCompare(clean(b.createdAt)) || clean(a.id).localeCompare(clean(b.id)));
  const allocations=[];
  for(const job of eligible){
    if(remaining <= EPS) break;
    const capacity = Math.max(0,round2(jobTarget(job)-(totals.get(clean(job.id))||0)));
    if(capacity <= EPS) continue;
    const bushels = Math.min(remaining,capacity);
    allocations.push({haulingJobId:clean(job.id),bushels:round2(bushels),allocationType:'job'});
    remaining=round2(remaining-bushels);
  }
  return {allocations,spotBushels:Math.max(0,round2(remaining))};
}
