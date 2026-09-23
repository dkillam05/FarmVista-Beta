import { nextHistory } from './loading-history.js';

let active = null;
function createPanel(){
  let panel = document.getElementById('frLoadProgress');
  if (panel) return panel;
  const grid = document.getElementById('fieldsGrid');
  if (!grid) return null;
  panel = document.createElement('section');
  panel.id = 'frLoadProgress';
  panel.className = 'fr-load-progress';
  panel.setAttribute('aria-label', 'Field loading progress');
  panel.innerHTML = `<div class="fr-load-heading" role="status" aria-live="polite"><span class="fr-load-spinner" aria-hidden="true"></span><strong data-progress-label>Finding your selected fields…</strong></div><progress aria-label="Fields loaded"></progress><p class="muted fr-load-helper">More selected fields may take longer to load.</p><aside class="fr-load-history" hidden><strong>A moment in agriculture</strong><p data-history-text></p><small><a data-history-source target="_blank" rel="noopener noreferrer"></a> · <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener noreferrer">CC BY-SA</a></small></aside>`;
  grid.before(panel);
  if (!document.getElementById('frLoadStyles')){
    const style = document.createElement('style'); style.id='frLoadStyles';
    style.textContent=`.fr-load-progress{border:1px solid var(--border);border-radius:14px;padding:14px 16px;margin:8px 0 14px;background:var(--surface);color:var(--text)}.fr-load-progress[hidden],.fr-load-history[hidden]{display:none}.fr-load-heading{display:flex;align-items:center;gap:10px;font-size:14px}.fr-load-progress progress{width:100%;height:7px;margin-top:10px;accent-color:#3b7e46}.fr-load-helper{font-size:12px;margin:6px 0 0}.fr-load-history{border-top:1px solid var(--border);margin-top:12px;padding-top:12px;font-size:13px;line-height:1.5}.fr-load-history p{margin:6px 0}.fr-load-history a{color:var(--text);text-decoration:underline}.fr-load-spinner{width:14px;height:14px;border:2px solid var(--border);border-top-color:#3b7e46;border-radius:50%;animation:frLoadSpin .8s linear infinite;flex:none}@keyframes frLoadSpin{to{transform:rotate(360deg)}}@media(prefers-reduced-motion:reduce){.fr-load-spinner{animation:none}}`;
    document.head.appendChild(style);
  }
  return panel;
}
export function beginFieldLoading(){
  active?.stop();
  const panel=createPanel();
  let stopped=false, controller=null, tick=null;
  const grid=document.getElementById('fieldsGrid');
  grid?.setAttribute('aria-busy','true');
  if (panel){panel.hidden=false;panel.querySelector('aside').hidden=true;panel.querySelector('[data-progress-label]').textContent='Finding your selected fields…';panel.querySelector('progress').removeAttribute('value');}
  const history=async()=>{
    if(stopped || document.hidden) return;
    controller=new AbortController();
    const timeout=setTimeout(()=>controller?.abort(),5000);
    try{
      const item=await nextHistory(controller.signal);
      if(stopped || !item || !panel) return;
      panel.querySelector('[data-history-text]').textContent=item.text;
      const link=panel.querySelector('[data-history-source]');link.textContent=`Wikipedia: ${item.title}`;link.href=item.url;
      panel.querySelector('aside').hidden=false;
    }catch(_){clearInterval(tick);}finally{clearTimeout(timeout);}
  };
  const delayed=setTimeout(()=>{history();tick=setInterval(history,15000);},8000);
  const session={
    update(done,total,phase='Loading'){
      if(stopped || !panel) return;
      panel.querySelector('[data-progress-label]').textContent=`${phase} ${done} of ${total} fields…`;
      const bar=panel.querySelector('progress');bar.max=Math.max(1,total);bar.value=done;
    },
    stop(message=''){
      if(stopped)return;stopped=true;clearTimeout(delayed);clearInterval(tick);controller?.abort();
      if(active===session){
        grid?.setAttribute('aria-busy','false');
        if(panel){panel.hidden=!message;panel.querySelector('aside').hidden=true;if(message)panel.querySelector('[data-progress-label]').textContent=message;panel.querySelector('progress').hidden=!!message;panel.querySelector('.fr-load-spinner').hidden=!!message;}
        active=null;
      }
    }
  };
  if(panel){panel.querySelector('progress').hidden=false;panel.querySelector('.fr-load-spinner').hidden=false;}
  active=session;return session;
}
window.addEventListener('pagehide',()=>active?.stop());
