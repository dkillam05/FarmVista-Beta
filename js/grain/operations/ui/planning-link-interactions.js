// FarmVista Grain Operations — established contract -> hauling planning-link drag/drop.
import { getWorkspaceModel } from './workspace-controller.js';
import { linkContractToHaulingJob,unlinkContractFromHaulingJob } from '../data/grain-writes.js';
import { clean } from '../core/grain-rules.js';

export function installPlanningLinkInteractions(root){
  let draggedContractId='';
  root.addEventListener('dragstart',event=>{
    const card=event.target.closest('[data-planning-contract-id]');
    if(!card)return;
    draggedContractId=clean(card.dataset.planningContractId);
    card.classList.add('dragging');
    event.dataTransfer.effectAllowed='move';
  });
  root.addEventListener('dragend',event=>{
    event.target.closest('[data-planning-contract-id]')?.classList.remove('dragging');
    root.querySelectorAll('.drag-over').forEach(node=>node.classList.remove('drag-over'));
  });
  root.addEventListener('dragover',event=>{
    const target=event.target.closest('[data-planning-job-id],[data-planning-unassign]');
    if(!target||!draggedContractId)return;
    event.preventDefault();
    event.dataTransfer.dropEffect='move';
    target.classList.add('drag-over');
  });
  root.addEventListener('dragleave',event=>event.target.closest('[data-planning-job-id],[data-planning-unassign]')?.classList.remove('drag-over'));
  root.addEventListener('drop',async event=>{
    const target=event.target.closest('[data-planning-job-id],[data-planning-unassign]');
    if(!target||!draggedContractId)return;
    event.preventDefault();
    target.classList.remove('drag-over');
    const model=getWorkspaceModel(),contract=model.contracts.find(x=>clean(x.id)===draggedContractId);
    draggedContractId='';
    if(!contract)return;
    try{
      if(target.hasAttribute('data-planning-unassign')) await unlinkContractFromHaulingJob(contract);
      else{
        const job=model.haulingJobs.find(x=>clean(x.id)===clean(target.dataset.planningJobId));
        if(!job)return;
        await linkContractToHaulingJob(contract,job);
      }
    }catch(error){
      window.alert(error?.message||'That planning link could not be changed.');
    }
  });
}
