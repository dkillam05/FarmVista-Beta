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

function ticketCard(t,amount,extra=''){
  return `<div class="fv-go-ticket-card fv-go-hauling-ticket" draggable="true" data-hauling-ticket-id="${esc(t.id)}" data-ticket-detail="${esc(t.id)}"><div><strong>${esc(t.ticketNumber||t.ticketNo||t.id)}</strong><span>${bu(amount)} bu</span></div><small>${esc(t.crop||t.commodity||'—')} · ${esc(t.buyerName||t.deliveryLocationName||'—')} · ${esc(t.customerName||t.soldUnder||'—')}${extra?` · ${esc(extra)}`:''}</small></div>`;
}

function render(host){
  const model=getWorkspaceModel();
  if(!model||!host)return;
  const tickets=(model.tickets||[]).filter(live);
  const unassigned=tickets.filter(fullyUnassigned);
  const unassignedCards=unassigned.map(t=>ticketCard(t,ticketBushels(t),unassignedBushels(t)>0?'Unassigned':'' )).join('');
  const jobs=(model.haulingJobs||[]).filter(j=>!['voided','closed'].includes(clean(j.effectiveStatus).toLowerCase()));
  const jobCards=jobs.map(j=>{
    const assigned=tickets.map(t=>({t,amount:allocatedToJob(t,j.id)})).filter(x=>x.amount>.005);
    const cards=assigned.map(({t,amount})=>ticketCard(t,amount,spotBushels(t)>0?'SPLIT / SPOT':'' )).join('');
    return `<div class="fv-go-hauling-job-drop" data-hauling-job-drop="${esc(j.id)}"><div class="fv-go-hauling-job-head"><div><strong>${esc(j.jobName||j.displayName||j.deliveryLocationName||'Hauling Job')}</strong><small>${esc(j.buyerName||'—')} · ${esc(j.crop||j.commodity||'—')} · ${esc(j.customerName||j.soldUnder||'—')}</small></div><span>${bu(j.remainingBushels)} bu remaining</span></div><details class="fv-go-assigned-details"><summary>Assigned Tickets <strong>${assigned.length}</strong></summary><div class="fv-go-hauling-assigned-body">${cards||'<div class="fv-go-empty">No tickets assigned.</div>'}</div></details>${j.remainingBushels<=.005?'<div class="fv-go-spot-label">Spot Loads / Overhaul Allowed</div>':''}</div>`;
  }).join('');
  host.innerHTML=`<div class="fv-go-block"><div class="fv-go-block-head"><div><h3>Assign / Move Grain Tickets to Hauling Jobs</h3><p>Operational ticket assignment. Drag an unassigned ticket onto a hauling job, move a ticket to another compatible hauling job, or drop it back into Unassigned. Contract assignments are not changed here.</p></div></div><div class="fv-go-two-col fv-go-hauling-ticket-grid"><div class="fv-go-dnd-col fv-go-hauling-unassigned" data-hauling-unassigned><div class="fv-go-dnd-head">Unassigned Tickets <span>${unassigned.length}</span></div><div class="fv-go-dnd-body">${unassignedCards||'<div class="fv-go-empty">No unassigned tickets.</div>'}</div></div><div class="fv-go-dnd-col"><div class="fv-go-dnd-head">Hauling Jobs <span>${jobs.length}</span></div><div class="fv-go-dnd-body">${jobCards||'<div class="fv-go-empty">No hauling jobs available.</div>'}</div></div></div></div>`;
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
  let dragged='';
  details.addEventListener('dragstart',e=>{const card=e.target.closest('[data-hauling-ticket-id]');if(!card)return;dragged=card.dataset.haulingTicketId;card.classList.add('dragging');e.dataTransfer.effectAllowed='move'});
  details.addEventListener('dragend',e=>{e.target.closest('[data-hauling-ticket-id]')?.classList.remove('dragging');details.querySelectorAll('.drag-over').forEach(x=>x.classList.remove('drag-over'));dragged=''});
  details.addEventListener('dragover',e=>{const target=e.target.closest('[data-hauling-job-drop],[data-hauling-unassigned]');if(!target||!dragged)return;e.preventDefault();e.dataTransfer.dropEffect='move';target.classList.add('drag-over')});
  details.addEventListener('dragleave',e=>e.target.closest('[data-hauling-job-drop],[data-hauling-unassigned]')?.classList.remove('drag-over'));
  details.addEventListener('drop',async e=>{
    const target=e.target.closest('[data-hauling-job-drop],[data-hauling-unassigned]');if(!target||!dragged)return;e.preventDefault();target.classList.remove('drag-over');
    const model=getWorkspaceModel(),ticket=model.tickets.find(t=>clean(t.id)===clean(dragged));if(!ticket)return;
    try{
      if(target.hasAttribute('data-hauling-unassigned')){
        if(clean(ticket.haulingJobId))await unassignTicketFromJob(ticket);
        return;
      }
      const job=model.haulingJobs.find(j=>clean(j.id)===clean(target.dataset.haulingJobDrop));if(!job)return;
      const plan=planManualHaulingMove(ticket,job,{state:model});
      if(!plan.ok){alert(plan.reason||'That ticket cannot be moved to this hauling job.');return}
      if(!clean(ticket.haulingJobId))await assignWholeTicketToJob(ticket,job);
      else await moveTicketPortion(ticket,job,plan.changes.bushels);
    }catch(error){alert(error?.message||'The hauling ticket assignment was not changed.')}
  });
  return {render:()=>render(host)};
}
