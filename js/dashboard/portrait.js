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
  const attentionTitle = attention.querySelector('strong');
  const originalAttentionTitle = attentionTitle.textContent;
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
