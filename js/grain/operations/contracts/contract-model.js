// FarmVista Grain Operations — contract read model
import { clean, round2, contractTarget, isVoided } from '../core/grain-rules.js';

function allocationBushels(ticket,contractId){
  const id=clean(contractId);
  const allocations=Array.isArray(ticket?.contractAllocations)?ticket.contractAllocations:[];
  const allocated=allocations.reduce((sum,a)=>clean(a?.contractId)===id?sum+Number(a?.bushels||0):sum,0);
  if(allocated>0) return allocated;
  if(clean(ticket?.contractId)===id) return Number(ticket?.netBushels ?? ticket?.netBu ?? ticket?.bushels ?? 0);
  return 0;
}

export function deliveredToContract(contractId,tickets){
  return round2((tickets||[]).reduce((sum,ticket)=>isVoided(ticket)?sum:sum+allocationBushels(ticket,contractId),0));
}

export function buildContractRows(state){
  return (state?.contracts||[]).map(contract=>{
    const target=contractTarget(contract);
    const delivered=deliveredToContract(contract.id,state?.tickets||[]);
    const remaining=Math.max(0,round2(target-delivered));
    const over=Math.max(0,round2(delivered-target));
    const raw=clean(contract?.status ?? contract?.contractStatus).toLowerCase();
    let effectiveStatus=isVoided(contract)?'voided':raw||'open';
    if(!isVoided(contract) && target>0 && delivered>=target) effectiveStatus=over>0?'overhauled':'completed';
    return {...contract,targetBushels:target,deliveredBushels:delivered,remainingBushels:remaining,overBushels:over,effectiveStatus};
  });
}
