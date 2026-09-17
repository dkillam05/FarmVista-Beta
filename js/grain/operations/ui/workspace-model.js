// FarmVista Grain Operations — centralized workspace view model
import { buildHaulingRows } from '../hauling/hauling-model.js';
import { buildContractRows } from '../contracts/contract-model.js';
import { buildTicketRows } from '../tickets/ticket-model.js';
import { clean, round2 } from '../core/grain-rules.js';

const sum=(rows,field)=>round2((rows||[]).reduce((total,row)=>total+Number(row?.[field]||0),0));

export function buildWorkspaceModel(state){
  const haulingJobs=buildHaulingRows(state);
  const contracts=buildContractRows(state);
  const tickets=buildTicketRows(state);
  const contractsByJob=new Map();
  contracts.forEach(contract=>{
    const jobId=clean(contract?.haulingJobId);
    if(!jobId)return;
    const list=contractsByJob.get(jobId)||[];
    list.push(contract);
    contractsByJob.set(jobId,list);
  });
  const hauling=haulingJobs.map(job=>({
    ...job,
    linkedContracts:contractsByJob.get(clean(job.id))||[],
    linkedContractCount:(contractsByJob.get(clean(job.id))||[]).length
  }));
  return {
    haulingJobs:hauling,
    contracts,
    tickets,
    buyers:state?.buyers||[], customers:state?.customers||[], locations:state?.locations||[],
    summary:{
      haulingJobs:hauling.length,
      haulingStarting:sum(hauling,'targetBushels'),
      haulingTicketed:sum(hauling,'hauledBushels'),
      haulingRemaining:sum(hauling,'remainingBushels'),
      haulingOverhaul:sum(hauling,'overhaulBushels'),
      contracts:contracts.length,
      contractBushels:sum(contracts,'targetBushels'),
      contractDelivered:sum(contracts,'deliveredBushels'),
      contractRemaining:sum(contracts,'remainingBushels'),
      tickets:tickets.filter(ticket=>!ticket.isVoided).length
    }
  };
}
