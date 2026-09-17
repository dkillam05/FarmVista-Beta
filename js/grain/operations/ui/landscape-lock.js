// FarmVista Grain Operations — mandatory phone landscape gate.
// Desktop/tablet remain available; phone portrait cannot expose the operations workspace.
const STYLE_ID='fv-grain-operations-landscape-lock-style';
const GATE_ID='fv-grain-operations-landscape-gate';

export function installLandscapeLock(){
  if(!document.getElementById(STYLE_ID)){
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      #${GATE_ID}{display:none;position:fixed;inset:0;z-index:2147483646;background:var(--surface,#fff);color:inherit;align-items:center;justify-content:center;padding:28px;text-align:center}
      #${GATE_ID} .fv-rotate-card{max-width:360px}
      #${GATE_ID} .fv-rotate-icon{font-size:52px;line-height:1;margin-bottom:14px}
      #${GATE_ID} .fv-rotate-title{font-size:1.25rem;font-weight:900;margin-bottom:8px}
      #${GATE_ID} .fv-rotate-copy{font-size:.92rem;line-height:1.45;opacity:.72}
      @media (max-width:700px) and (orientation:portrait){
        body.fv-grain-operations-locked{overflow:hidden!important}
        body.fv-grain-operations-locked #${GATE_ID}{display:flex!important}
      }
    `;
    document.head.appendChild(style);
  }
  let gate=document.getElementById(GATE_ID);
  if(!gate){
    gate=document.createElement('div');
    gate.id=GATE_ID;
    gate.setAttribute('role','dialog');
    gate.setAttribute('aria-modal','true');
    gate.innerHTML='<div class="fv-rotate-card"><div class="fv-rotate-icon">↻</div><div class="fv-rotate-title">Rotate your phone</div><div class="fv-rotate-copy">Grain Operations is designed for landscape view. Rotate your phone to continue.</div></div>';
    document.body.appendChild(gate);
  }
  const sync=()=>document.body.classList.toggle('fv-grain-operations-locked',matchMedia('(max-width:700px) and (orientation:portrait)').matches);
  sync();
  addEventListener('orientationchange',sync,{passive:true});
  addEventListener('resize',sync,{passive:true});
  return sync;
}
