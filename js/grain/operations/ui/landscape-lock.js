// FarmVista Grain Operations — mandatory phone landscape gate.
// Portrait uses a page-level notice outside the Grain Operations workspace so no workspace card/container can show through.
const STYLE_ID='fv-grain-operations-landscape-lock-style';
const GATE_ID='fv-grain-operations-landscape-gate';

export function installLandscapeLock(){
  if(!document.getElementById(STYLE_ID)){
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      #${GATE_ID}{display:none}
      #${GATE_ID} .fv-rotate-icon{font-size:52px;line-height:1;margin-bottom:14px}
      #${GATE_ID} .fv-rotate-title{font-size:1.25rem;font-weight:900;margin-bottom:8px}
      #${GATE_ID} .fv-rotate-copy{font-size:.92rem;line-height:1.45;opacity:.72;max-width:360px}
      @media (max-width:700px) and (orientation:portrait){
        html:has(body.fv-grain-operations-locked),body.fv-grain-operations-locked{height:100%;overflow:hidden!important;overscroll-behavior:none}
        body.fv-grain-operations-locked fv-shell{height:100dvh;overflow:hidden}
        body.fv-grain-operations-locked .contracts-page{display:none!important}
        body.fv-grain-operations-locked #${GATE_ID}{
          display:flex!important;
          position:fixed;
          left:0;
          right:0;
          top:var(--fv-shell-header-height,102px);
          bottom:var(--fv-shell-footer-height,64px);
          z-index:900;
          align-items:center;
          justify-content:center;
          flex-direction:column;
          padding:24px;
          text-align:center;
          background:var(--page-bg,var(--background,#fff));
          color:inherit;
          border:0;
          box-shadow:none;
          overflow:hidden;
        }
      }
    `;
    document.head.appendChild(style);
  }

  let gate=document.getElementById(GATE_ID);
  if(!gate){
    gate=document.createElement('div');
    gate.id=GATE_ID;
    gate.setAttribute('role','region');
    gate.setAttribute('aria-label','Rotate phone to use Grain Operations');
    gate.innerHTML='<div class="fv-rotate-icon">↻</div><div class="fv-rotate-title">Rotate your phone</div><div class="fv-rotate-copy">Grain Operations is designed for landscape view. Rotate your phone to continue.</div>';
    document.body.appendChild(gate);
  }

  const sync=()=>document.body.classList.toggle('fv-grain-operations-locked',matchMedia('(max-width:700px) and (orientation:portrait)').matches);
  sync();
  addEventListener('orientationchange',sync,{passive:true});
  addEventListener('resize',sync,{passive:true});
  return sync;
}
