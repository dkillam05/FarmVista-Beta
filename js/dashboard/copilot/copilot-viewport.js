// The iPhone keyboard shrinks the visual viewport, while the fixed shell
// footer and document can still use the full layout viewport.
export function chatViewportBounds({layoutHeight, viewport, focused, mobile, footer}) {
  const top=viewport?.offsetTop || 0;
  const height=viewport?.height || layoutHeight;
  const gap=Math.max(0,layoutHeight-height);
  const keyboard=!!(mobile && focused && gap>140 && (viewport?.scale || 1)<=1.05);
  const screenBottom=top+height;
  const footerTop=!keyboard && footer?.height>0 && footer.top>top && footer.top<screenBottom ? footer.top : screenBottom;
  return {top:top+12,bottom:footerTop-12,keyboard,gap:keyboard?gap:0};
}

export function wireChatViewport({section,input,form,log,doc=document,win=window}) {
  const root=doc.documentElement;
  const shell=section.closest('fv-shell');
  const style=doc.createElement('style');
  style.textContent=`
    #ai-section .ai-body,#ai-section .ai-log,#ai-section .ai-form{background:var(--surface,#fff)}
    #ai-section .ai-form{scroll-margin-block:16px}
    @media(max-width:899px){
      #ai-section .ai-input{font-size:16px}
      html.fv-copilot-keyboard fv-shell::part(footer){visibility:hidden;pointer-events:none}
      html.fv-copilot-keyboard #ai-section{margin-bottom:var(--fv-chat-keyboard-space,0px)!important}
    }
  `;
  doc.head.appendChild(style);
  const mobile=()=>win.innerWidth<900;
  const focused=()=>doc.activeElement===input;
  const expanded=()=>section.classList.contains('is-expanded');
  let frame=0, disposed=false, revealUntil=0;
  let baselineWidth=win.innerWidth, baselineHeight=win.innerHeight;
  const listeners=[],timers=[];
  function on(target,name,fn){target?.addEventListener(name,fn,{passive:true});listeners.push(()=>target?.removeEventListener(name,fn));}
  function bounds(){
    if (Math.abs(win.innerWidth-baselineWidth)>80 || !focused()) {
      baselineWidth=win.innerWidth;baselineHeight=win.innerHeight;
    }
    const state=chatViewportBounds({
      layoutHeight:Math.max(win.innerHeight,doc.documentElement.clientHeight,baselineHeight),
      viewport:win.visualViewport,focused:focused(),mobile:mobile(),
      footer:shell?.shadowRoot?.querySelector('[part~="footer"]')?.getBoundingClientRect()
    });
    root.classList.toggle('fv-copilot-keyboard',state.keyboard);
    if(state.keyboard) section.style.setProperty('--fv-chat-keyboard-space',state.gap+'px');
    else section.style.removeProperty('--fv-chat-keyboard-space');
    return state;
  }
  function scrollParent(){
    for(let node=form.parentElement;node;node=node.assignedSlot || node.parentElement || node.getRootNode?.().host){
      if(node.scrollHeight>node.clientHeight && /auto|scroll/.test(win.getComputedStyle(node).overflowY)) return node;
    }
    return doc.scrollingElement || root;
  }
  function reveal(){
    frame=0;if(disposed)return;
    const visible=bounds();
    if(!mobile() || !expanded() || win.performance.now()>revealUntil)return;
    form.scrollIntoView({block:'end',behavior:'instant'});
    // Account for the keyboard/panned visual viewport after normal DOM scrolling.
    const rect=form.getBoundingClientRect();
    const target=rect.height>visible.bottom-visible.top ? input.getBoundingClientRect() : rect;
    const delta=target.bottom>visible.bottom ? target.bottom-visible.bottom : target.top<visible.top ? target.top-visible.top : 0;
    if(Math.abs(delta)>1) scrollParent().scrollTop+=delta;
  }
  function schedule(){if(!disposed && !frame)frame=win.requestAnimationFrame(reveal);}
  function clearTimers(){timers.splice(0).forEach(id=>win.clearTimeout(id));}
  function bringIntoView(latest=false){
    if(!mobile() || !expanded())return;
    if(latest)log.scrollTop=log.scrollHeight;
    revealUntil=win.performance.now()+1000;
    schedule();clearTimers();
    // iOS finishes its focus pan and keyboard animation after the click handler.
    [180,450].forEach(delay=>timers.push(win.setTimeout(schedule,delay)));
  }
  on(section,'fv:copilot-toggle',event=>{
    if(event.detail?.open)bringIntoView(true);
    else {revealUntil=0;clearTimers();schedule();}
  });
  on(input,'focus',()=>bringIntoView(true));
  on(input,'pointerdown',()=>{if(focused())bringIntoView();});
  on(input,'blur',()=>{revealUntil=0;clearTimers();schedule();});
  on(win.visualViewport,'resize',()=>{if(focused() && revealUntil>0)bringIntoView();schedule();});
  on(win.visualViewport,'scroll',()=>{if(win.performance.now()<revealUntil)schedule();});
  on(win,'resize',()=>{if(focused() && revealUntil>0)bringIntoView();schedule();});
  // Once the user starts browsing the conversation, never pull them back down.
  on(section,'touchstart',event=>{if(!form.contains(event.target)){revealUntil=0;clearTimers();}});
  on(section,'wheel',()=>{revealUntil=0;clearTimers();});
  bounds();
  return {destroy(){
    disposed=true;listeners.forEach(remove=>remove());clearTimers();
    win.cancelAnimationFrame(frame);root.classList.remove('fv-copilot-keyboard');
    section.style.removeProperty('--fv-chat-keyboard-space');style.remove();
  }};
}
