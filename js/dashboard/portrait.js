/* Keep existing widgets, permission gates and event handlers; only change presentation. */
(() => {
  'use strict';
  const byId = id => document.getElementById(id);
  const mobile = () => innerWidth < 900 && !(innerHeight <= 650 && matchMedia('(orientation: landscape)').matches);
  function toggle(section, content, label = 'View more', less = 'View less') {
    if (!section || !content) return;
    if (!content.id) content.id = `${section.id}-content`;
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'portrait-toggle';
    button.textContent = label;
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-controls', content.id);
    section.querySelector('.section-head').append(button);
    button.addEventListener('click', () => {
      const open = section.classList.toggle('is-expanded');
      button.setAttribute('aria-expanded', String(open));
      button.textContent = open ? less : label;
      if (section.id === 'ai-section' && open) byId('ai-input')?.focus();
      if (!open && section.getBoundingClientRect().top < 0) section.scrollIntoView({block:'start'});
    });
    return button;
  }
  const quick = byId('quick-links');
  const quickGrid = quick.querySelector('.ql-grid');
  const quickToggle = toggle(quick, quickGrid);
  const hint = document.createElement('p');
  hint.className = 'portrait-note portrait-swipe'; hint.textContent = 'Swipe for more shortcuts';
  quick.querySelector('.section-body').append(hint);
  const shortNames = {'ql-equipment-service-mobile':'Equipment Repair','ql-boundaries-mobile':'Boundary Correction','ql-maint-add-mobile':'Field Repair'};
  Object.entries(shortNames).forEach(([id,label]) => {byId(id).querySelector('.ql-title').textContent = label;});
  function syncQuick() {
    const count = [...quickGrid.children].filter(el => !el.hidden && !el.classList.contains('perm-hidden') && el.style.display !== 'none').length;
    quickToggle.hidden = count <= 3;
    hint.hidden = count <= 3;
  }
  new MutationObserver(syncQuick).observe(quickGrid,{subtree:true,attributes:true,attributeFilter:['class','hidden','style']});
  syncQuick();
  const markets = byId('markets-section');
  toggle(markets, byId('fv-markets'));
  const ai = byId('ai-section');
  const aiTitle = ai.querySelector('strong');
  const aiSub = ai.querySelector('.sub');
  const originalAITitle = aiTitle.textContent, originalAISub = aiSub.textContent;
  toggle(ai, ai.querySelector('.ai-body'), 'Open', 'Close');
  const attention = byId('attention-section');
  const attentionGrid = attention.querySelector('.kpi-grid');
  const attentionToggle = toggle(attention, attentionGrid);
  const orderNote = document.createElement('p');
  orderNote.className = 'kpi-order-note';
  orderNote.textContent = 'Drag the handles to choose your top four';
  attention.querySelector('.section-body').prepend(orderNote);
  const attentionTitle = attention.querySelector('strong');
  const originalAttentionTitle = attentionTitle.textContent;

  const attentionCards = () => [...attentionGrid.querySelectorAll(':scope > .dash-kpi')];
  const orderKey = () => {
    const ctx = window.FVUserContext?.get?.() || {};
    return `fv:dashboard:kpi-order:${ctx.uid || 'device'}:${window.FV_FARM_KEY || 'farm'}`;
  };
  function saveAttentionOrder(){
    try { localStorage.setItem(orderKey(), JSON.stringify(attentionCards().map(card => card.id).filter(Boolean))); } catch {}
  }
  function restoreAttentionOrder(){
    try {
      const order = JSON.parse(localStorage.getItem(orderKey()) || '[]');
      if (!Array.isArray(order)) return;
      const cards = new Map(attentionCards().map(card => [card.id,card]));
      order.forEach(id => { const card = cards.get(id); if (card) attentionGrid.append(card); });
    } catch {}
    syncAttentionCards();
  }
  function cardCanShow(card){
    return !card.hidden && !card.classList.contains('perm-hidden') &&
      card.getAttribute('aria-hidden') !== 'true' && card.style.display !== 'none';
  }
  function syncAttentionCards(){
    const visible = attentionCards().filter(cardCanShow);
    visible.forEach((card,index) => card.classList.toggle('portrait-overflow',index >= 4));
    attentionToggle.hidden = false;
  }
  function addDragHandles(){
    attentionCards().forEach(card => {
      if (card.querySelector('.kpi-drag-handle')) return;
      const handle = document.createElement('span');
      handle.className = 'kpi-drag-handle';
      handle.textContent = '⠿';
      handle.setAttribute('aria-hidden','true');
      card.prepend(handle);
      let active = false, moved = false;
      const finish = () => {
        if (!active) return;
        active = false;
        card.classList.remove('kpi-dragging');
        if (moved) {
          card.dataset.suppressClick = '1';
          setTimeout(() => delete card.dataset.suppressClick,250);
          saveAttentionOrder();
          syncAttentionCards();
        }
      };
      handle.addEventListener('pointerdown',event => {
        if (!attention.classList.contains('is-expanded')) return;
        active = true; moved = false;
        card.classList.add('kpi-dragging');
        handle.setPointerCapture?.(event.pointerId);
        event.preventDefault();
      });
      handle.addEventListener('pointermove',event => {
        if (!active) return;
        const target = document.elementFromPoint(event.clientX,event.clientY)?.closest?.('#attention-section .dash-kpi');
        if (target && target !== card && target.parentElement === attentionGrid) {
          const rect = target.getBoundingClientRect();
          const before = event.clientY < rect.top + rect.height / 2 ||
            (Math.abs(event.clientY - (rect.top + rect.height / 2)) < rect.height / 3 && event.clientX < rect.left + rect.width / 2);
          attentionGrid.insertBefore(card,before ? target : target.nextSibling);
          moved = true;
        }
        event.preventDefault();
      });
      handle.addEventListener('pointerup',finish);
      handle.addEventListener('pointercancel',finish);
      card.addEventListener('click',event => {
        if (card.dataset.suppressClick === '1') { event.preventDefault(); event.stopPropagation(); }
      },true);
    });
  }
  addDragHandles();
  restoreAttentionOrder();
  new MutationObserver(() => requestAnimationFrame(syncAttentionCards)).observe(attentionGrid,{subtree:false,childList:true,attributes:true,attributeFilter:['hidden','style','aria-hidden']});
  document.addEventListener('fv:user-ready',restoreAttentionOrder);
  document.addEventListener('fv:dash-perms-ready',()=>{addDragHandles();restoreAttentionOrder();});
  function layoutLabels(){
    attentionTitle.textContent = mobile() ? 'At a glance' : originalAttentionTitle;
    aiTitle.textContent = mobile() ? 'FarmVista AI' : originalAITitle;
    aiSub.textContent = mobile() ? 'Ask about your farm' : originalAISub;
  }
  layoutLabels(); addEventListener('resize', layoutLabels);
  let firstName = '';
  async function greeting(){
    try {
      const ctx = await window.FVUserContext?.ready?.();
      const person = ctx?.employee || ctx?.profile || {};
      const name = String(person.firstName || person.first || person.fullName || ctx?.displayName || '').trim();
      firstName = name && !name.includes('@') && !/^\+?\d/.test(name) ? name.split(/\s+/)[0] : '';
    } catch { firstName = ''; }
    const now = new Date();
    const hour = Number(new Intl.DateTimeFormat('en-US',{timeZone:'America/Chicago',hour:'numeric',hourCycle:'h23'}).format(now));
    const period = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
    byId('portrait-greeting').textContent = `Good ${period}${firstName ? ', ' + firstName : ''}`;
    byId('portrait-date').textContent = new Intl.DateTimeFormat('en-US',{timeZone:'America/Chicago',weekday:'long',month:'long',day:'numeric'}).format(now);
  }
  greeting(); document.addEventListener('fv:user-ready',greeting);
  document.addEventListener('fv:dash-perms-ready',greeting);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden) greeting();});
  const weather = byId('fv-weather');
  weather.tabIndex = 0; weather.setAttribute('role','button'); weather.setAttribute('aria-label','Open weather forecast and location settings');
  weather.addEventListener('keydown',e=>{if(e.target === weather && ['Enter',' '].includes(e.key)){e.preventDefault();weather.click();}});
  // Mirror the existing inspection query, rather than issuing another collection read.
  const total = byId('logistics-total'), count = byId('portrait-pretrip-count');
  const syncTotal = () => {count.textContent = total.textContent;};
  new MutationObserver(syncTotal).observe(total,{childList:true,characterData:true,subtree:true});
  syncTotal();
})();
