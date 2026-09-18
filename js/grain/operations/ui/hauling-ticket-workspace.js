// FarmVista Grain Operations — operational ticket ↔ hauling-job workspace.
// Contracts are intentionally not referenced here: hauling remains independently operable.
import {getWorkspaceModel} from './workspace-controller.js';
import {assignWholeTicketToJob,moveTicketPortion,unassignTicketFromJob} from '../data/grain-writes.js';
import {planManualHaulingMove} from '../drag-drop/allocation-controller.js';
import {clean,ticketBushels,normalizeSplitAllocations,round2} from '../core/grain-rules.js';

const esc=v=>clean(v).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
const bu=v=>Number(v||0).toLocaleString('en-US',{maximumFractionDigits:2});
const live=t=>!t?.isVoided&&!t?.voided&&clean(t?.status).toLowerCase()!=='voided';
const splitRows=t=>normalizeSplitAllocations(t);
const movedFromSource=t=>round2(splitRows(t).filter(x=>['job','unassigned','spot'].includes(x.allocationType)).reduce((s,x)=>s+Math.max(0,Number(x.bushels)||0),0));
const sourceBushels=t=>Math.max(0,round2(ticketBushels(t)-movedFromSource(t)));
const jobSplitBushels=(t,id)=>round2(splitRows(t).filter(x=>x.allocationType==='job'&&clean(x.haulingJobId)===clean(id)).reduce((s,x)=>s+Math.max(0,Number(x.bushels)||0),0));
const allocatedToJob=(t,id)=>round2((clean(t?.haulingJobId)===clean(id)?sourceBushels(t):0)+jobSplitBushels(t,id));
const unassignedBushels=t=>round2(splitRows(t).filter(x=>x.allocationType==='unassigned').reduce((s,x)=>s+Math.max(0,Number(x.bushels)||0),0));
const spotBushels=t=>round2(splitRows(t).filter(x=>x.allocationType==='spot').reduce((s,x)=>s+Math.max(0,Number(x.bushels)||0),0));
const fullyUnassigned=t=>!clean(t?.haulingJobId)&&splitRows(t).filter(x=>x.allocationType==='job').length===0;

function ticketCard(t,amount,extra='',selectable=false){
  const ticketNo=esc(t.ticketNumber||t.ticketNo||t.id),crop=esc(t.crop||t.commodity||'—'),buyer=esc(t.buyerName||t.deliveryLocationName||'—'),sold=esc(t.customerName||t.soldUnder||'—'),date=esc(clean(t.date||t.ticketDate||t.deliveryDate||t.createdDate).slice(0,10)||'—'),location=esc(t.deliveryLocationName||t.deliveryCity||t.buyerName||'—'),driver=esc(t.driverName||t.driver||t.submittedByName||'');
  return `<div class="fv-go-ticket-card fv-go-hauling-ticket" draggable="true" data-hauling-ticket-id="${esc(t.id)}" data-ticket-detail="${esc(t.id)}">${selectable?`<label class="fv-go-ticket-select"><input type="checkbox" data-hauling-select="${esc(t.id)}"><span>Select</span></label>`:''}<div class="fv-go-hauling-ticket-top"><strong>Ticket ${ticketNo}</strong><span class="fv-go-ticket-job-pill">JOB</span><b>${bu(amount)} bu</b></div><div class="fv-go-hauling-ticket-meta">${date} · ${crop}</div><div class="fv-go-hauling-ticket-meta">${buyer} · ${location}${driver?` · ${driver}`:''}</div><div class="fv-go-hauling-ticket-sold"><strong>Sold Under:</strong> ${sold}</div>${extra?`<div class="fv-go-hauling-ticket-extra">${esc(extra)}</div>`:''}</div>`;
}

function render(host){
  const model=getWorkspaceModel();
  if(!model||!host)return;
  const tickets=(model.tickets||[]).filter(live);
  const unassigned=tickets.filter(fullyUnassigned);
  const unassignedCards=unassigned.map(t=>ticketCard(t,ticketBushels(t),unassignedBushels(t)>0?'Unassigned':'',true)).join('');
  const jobs=(model.haulingJobs||[]).filter(j=>clean(j.effectiveStatus).toLowerCase()!=='voided');
  const buyers=[...new Set(jobs.map(j=>clean(j.buyerName)).filter(Boolean))].sort();
  const customers=[...new Set(jobs.map(j=>clean(j.customerName||j.soldUnder)).filter(Boolean))].sort();
  const jobCards=jobs.map(j=>{
    const rawStatus=clean(j.effectiveStatus||j.status).toLowerCase(),displayStatus=rawStatus==='closed'?'completed':(rawStatus||'—');
    const assigned=tickets.map(t=>({t,amount:allocatedToJob(t,j.id)})).filter(x=>x.amount>.005);
    const cards=assigned.map(({t,amount})=>ticketCard(t,amount,spotBushels(t)>0?'SPLIT / SPOT':'',true)).join('');
    return `<div class="fv-go-hauling-job-drop" data-hauling-job-drop="${esc(j.id)}"><div class="fv-go-hauling-job-head"><div><strong>${esc(j.jobName||j.displayName||j.deliveryLocationName||'Hauling Job')}</strong><span class="fv-go-hauling-job-status ${esc(displayStatus)}">${esc(displayStatus)}</span><small>${esc(j.buyerName||'—')} · ${esc(j.crop||j.commodity||'—')} · ${esc(j.customerName||j.soldUnder||'—')}</small></div><span>${bu(j.remainingBushels)} bu remaining</span></div><details class="fv-go-assigned-details"><summary>Assigned Tickets <strong>${assigned.length}</strong></summary><div class="fv-go-hauling-assigned-body">${cards||'<div class="fv-go-empty">No tickets assigned.</div>'}</div></details>${j.remainingBushels<=.005?'<div class="fv-go-spot-label">Spot Loads / Overhaul Allowed</div>':''}</div>`;
  }).join('');
  host.innerHTML=`<div class="fv-go-block"><div class="fv-go-block-head"><div><h3>Assign / Move Grain Tickets to Hauling Jobs</h3><p>Operational ticket assignment. Drag an unassigned ticket onto a hauling job, move a ticket to another compatible hauling job, or drop it back into Unassigned. Contract assignments are not changed here.</p></div></div><div class="fv-go-hauling-filters"><input data-hauling-filter="search" placeholder="Search hauling jobs…"><select data-hauling-filter="buyer"><option value="">All Buyers</option>${buyers.map(v=>`<option>${esc(v)}</option>`).join('')}</select><select data-hauling-filter="crop"><option value="">All Crops</option><option>Corn</option><option>Soybeans</option></select><select data-hauling-filter="customer"><option value="">All Sold Under</option>${customers.map(v=>`<option>${esc(v)}</option>`).join('')}</select></div><div class="fv-go-two-col fv-go-hauling-ticket-grid"><div class="fv-go-dnd-col fv-go-hauling-unassigned" data-hauling-unassigned data-hauling-unassign-zone><div class="fv-go-dnd-head"><label class="fv-go-select-all"><input type="checkbox" data-hauling-select-all> Select All</label><span>Unassigned Tickets · ${unassigned.length}</span></div><div class="fv-go-dnd-body">${unassignedCards||'<div class="fv-go-empty">No unassigned tickets.</div>'}</div></div><div class="fv-go-dnd-col"><div class="fv-go-dnd-head">Hauling Jobs <span>${jobs.length}</span></div><div class="fv-go-dnd-body">${jobCards||'<div class="fv-go-empty">No hauling jobs available.</div>'}</div></div></div></div>`;
}

export function installHaulingTicketWorkspace(root){
  const hauling=root?.querySelector('.fv-go-workflow.hauling');
  if(!hauling)return;
  let details=hauling.querySelector('[data-hauling-ticket-workspace]');
  if(!details){
    details=document.createElement('details');
    details.className='fv-go-collapse';
    details.dataset.haulingTicketWorkspace='';
    details.innerHTML='<summary><span><strong>Assign / Move Tickets to Hauling Jobs</strong><small>Operational ticket assignment and corrections</small></span><span class="fv-go-chevron" aria-hidden="true">⌄</span></summary><div data-panel="hauling-ticket-workspace"></div>';
    const planning=hauling.querySelector('[data-panel="planning-links"]')?.closest('details');
    hauling.insertBefore(details,planning||null);
  }
  const host=details.querySelector('[data-panel="hauling-ticket-workspace"]');
  render(host);
  let dragged='';let draggedIds=[];
  const applyFilters=()=>{const search=clean(details.querySelector('[data-hauling-filter="search"]')?.value).toLowerCase(),buyer=clean(details.querySelector('[data-hauling-filter="buyer"]')?.value).toLowerCase(),crop=clean(details.querySelector('[data-hauling-filter="crop"]')?.value).toLowerCase(),customer=clean(details.querySelector('[data-hauling-filter="customer"]')?.value).toLowerCase();details.querySelectorAll('[data-hauling-job-drop]').forEach(card=>{const job=getWorkspaceModel()?.haulingJobs?.find(j=>clean(j.id)===clean(card.dataset.haulingJobDrop));const text=clean(job?.jobName||job?.displayName||job?.deliveryLocationName).toLowerCase();card.hidden=!!((search&&!text.includes(search))||(buyer&&clean(job?.buyerName).toLowerCase()!==buyer)||(crop&&clean(job?.crop||job?.commodity).toLowerCase()!==crop)||(customer&&clean(job?.customerName||job?.soldUnder).toLowerCase()!==customer))})};
  details.addEventListener('input',e=>{if(e.target.matches('[data-hauling-filter]'))applyFilters()});details.addEventListener('change',e=>{if(e.target.matches('[data-hauling-filter]'))applyFilters();if(e.target.matches('[data-hauling-select-all]')){const checked=e.target.checked;details.querySelectorAll('[data-hauling-select]').forEach(x=>x.checked=checked)}});
  details.addEventListener('dragstart',e=>{const card=e.target.closest('[data-hauling-ticket-id]');if(!card)return;dragged=card.dataset.haulingTicketId;const selected=[...details.querySelectorAll('[data-hauling-select]:checked')].map(x=>x.dataset.haulingSelect);draggedIds=selected.includes(dragged)?selected:[dragged];card.classList.add('dragging');e.dataTransfer.effectAllowed='move'});
  details.addEventListener('dragend',e=>{e.target.closest('[data-hauling-ticket-id]')?.classList.remove('dragging');details.querySelectorAll('.drag-over').forEach(x=>x.classList.remove('drag-over'));dragged='';draggedIds=[]});
  details.addEventListener('dragover',e=>{const target=e.target.closest('[data-hauling-job-drop],[data-hauling-unassign-zone]');if(!target||!dragged)return;e.preventDefault();e.dataTransfer.dropEffect='move';target.classList.add('drag-over')});
  details.addEventListener('dragleave',e=>e.target.closest('[data-hauling-job-drop],[data-hauling-unassign-zone]')?.classList.remove('drag-over'));
  details.addEventListener('drop',async e=>{
    const target=e.target.closest('[data-hauling-job-drop],[data-hauling-unassign-zone]');if(!target||!dragged)return;e.preventDefault();target.classList.remove('drag-over');
    const model=getWorkspaceModel(),ids=draggedIds.length?draggedIds:[dragged],moving=ids.map(id=>model.tickets.find(t=>clean(t.id)===clean(id))).filter(Boolean);if(!moving.length)return;
    try{
      if(target.hasAttribute('data-hauling-unassign-zone')){for(const ticket of moving)if(clean(ticket.haulingJobId)||splitRows(ticket).some(x=>x.allocationType==='job'))await unassignTicketFromJob(ticket);return}
      const job=model.haulingJobs.find(j=>clean(j.id)===clean(target.dataset.haulingJobDrop));if(!job)return;
      for(const ticket of moving){const fresh=getWorkspaceModel(),freshTicket=fresh.tickets.find(t=>clean(t.id)===clean(ticket.id))||ticket,freshJob=fresh.haulingJobs.find(j=>clean(j.id)===clean(job.id))||job,plan=planManualHaulingMove(freshTicket,freshJob,{state:fresh});if(!plan.ok)throw new Error(`${ticket.ticketNumber||ticket.ticketNo||ticket.id}: ${plan.reason||'cannot be moved'}`);if(!clean(freshTicket.haulingJobId))await assignWholeTicketToJob(freshTicket,freshJob);else await moveTicketPortion(freshTicket,freshJob,plan.changes.bushels)}
    }catch(error){alert(error?.message||'The hauling ticket assignment was not changed.')}
  });
  return {render:()=>render(host)};
}
