// FarmVista Grain Operations — mandatory phone landscape gate.
// The FarmVista shell stays usable in portrait so the user can always open the menu and leave.
const STYLE_ID='fv-grain-operations-landscape-lock-style';
const GATE_ID='fv-grain-operations-landscape-gate';

export function installLandscapeLock(){
  if(!document.getElementById(STYLE_ID)){
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      #${GATE_ID}{display:none;position:absolute;inset:0;z-index:900;background:var(--surface,#fff);color:inherit;align-items:center;justify-content:center;padding:28px;text-align:center;min-height:calc(100vh - 60px)}
      #${GATE_ID} .fv-rotate-card{max-width:360px}
      #${GATE_ID} .fv-rotate-icon{font-size:52px;line-height:1;margin-bottom:14px}
      #${GATE_ID} .fv-rotate-title{font-size:1.25rem;font-weight:900;margin-bottom:8px}
      #${GATE_ID} .fv-rotate-copy{font-size:.92rem;line-height:1.45;opacity:.72}
      @media (max-width:700px) and (orientation:portrait){
        html:has(body.fv-grain-operations-locked),body.fv-grain-operations-locked{height:100%;overflow:hidden!important;overscroll-behavior:none}
        body.fv-grain-operations-locked fv-shell{height:100dvh;overflow:hidden}
        body.fv-grain-operations-locked .contracts-page{position:relative;height:calc(100dvh - var(--fv-shell-header-height,60px));min-height:0!important;overflow:hidden!important;padding-bottom:0!important}
        body.fv-grain-operations-locked #grain-operations-central{position:relative;height:100%;min-height:0!important;overflow:hidden!important}
        body.fv-grain-operations-locked #${GATE_ID}{display:flex!important;min-height:0;height:100%;overflow:hidden}
        body.fv-grain-operations-locked #grain-operations-central>*:not(#${GATE_ID}){visibility:hidden!important;pointer-events:none!important}
      }
    `;
    document.head.appendChild(style);
  }
  const host=document.getElementById('grain-operations-central');
  let gate=document.getElementById(GATE_ID);
  if(!gate){
    gate=document.createElement('div');
    gate.id=GATE_ID;
    gate.setAttribute('role','region');
    gate.setAttribute('aria-label','Rotate phone to use Grain Operations');
    gate.innerHTML='<div class="fv-rotate-card"><div class="fv-rotate-icon">↻</div><div class="fv-rotate-title">Rotate your phone</div><div class="fv-rotate-copy">Grain Operations is designed for landscape view. Rotate your phone to continue.</div></div>';
    (host||document.body).appendChild(gate);
  }
  const sync=()=>document.body.classList.toggle('fv-grain-operations-locked',matchMedia('(max-width:700px) and (orientation:portrait)').matches);
  sync();
  addEventListener('orientationchange',sync,{passive:true});
  addEventListener('resize',sync,{passive:true});
  return sync;
}
