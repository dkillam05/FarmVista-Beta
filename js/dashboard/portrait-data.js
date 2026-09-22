import {ready,getFirestore,collection,getDocs} from '/js/firebase/firebase-init.js';
import {grainSummary} from './grain-summary.js';
const $ = id => document.getElementById(id);
const grain = $('portrait-grain'), hauling = $('portrait-hauling'), list = $('portrait-hauling-list'), toggle = $('hauling-toggle');
const esc = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt = value => value.toLocaleString('en-US',{maximumFractionDigits:2});
let jobs = null, tickets = null, failed = false, expanded = false, generation = 0, identity = '', loading = false;
const canView = () => Boolean(window.FV_DASH_CAN?.('cap-kpi-grain','view') && window.FV_DASH_CAN?.('grain-ctr','view'));
function render() {
  if (!canView()) return;
  if (failed || !jobs || !tickets) {
    $('portrait-grain-totals').textContent = failed ? 'Grain totals are unavailable. Open the hauling workspace to check records.' : 'Loading remaining bushels…';
    list.textContent = failed ? 'Hauling jobs could not be loaded.' : 'Loading hauling jobs…';
    toggle.hidden = true;
    return;
  }
  const summary = grainSummary(jobs,tickets);
  $('portrait-grain-totals').innerHTML = Object.entries(summary.totals).map(([crop,total])=>`<a class="portrait-grain-tile" href="pages/grain/grain-contracts.html?dashboardCrop=${encodeURIComponent(crop)}"><span>${crop === 'Corn' ? '🌽' : '🌱'} ${esc(crop)} remaining</span><strong>${fmt(total)} <small>bu</small></strong><small>View hauling jobs →</small></a>`).join('');
  const shown = expanded ? summary.rows : summary.rows.slice(0,2);
  let group = '';
  list.innerHTML = shown.map(row=>{
    const heading = row.status !== group && row.status !== 'active' ? `<h3 class="portrait-job-group">${row.status === 'upcoming' ? 'Upcoming jobs' : 'Past due'}</h3>` : '';
    group = row.status;
    const state = row.status === 'active' ? 'Active' : row.status === 'upcoming' ? 'Upcoming' : 'Past due';
    return `${heading}<a class="portrait-job" href="pages/grain/grain-contracts.html?dashboardJob=${encodeURIComponent(row.id)}"><div class="portrait-job-title"><strong>${esc(row.title)} · ${esc(row.crop)}</strong><span class="portrait-job-status ${row.status}">${state}</span></div><small>${row.spot ? `Spot loads · ${fmt(row.ticketed)} bu hauled` : `${fmt(row.remaining)} bu remaining · ${fmt(row.ticketed)} of ${fmt(row.total)} bu hauled`}</small>${row.spot ? '' : `<progress value="${Math.min(row.ticketed,row.total)}" max="${row.total}" aria-label="Hauling progress"></progress>`}${row.start || row.end ? `<small>${esc(row.start || 'Open start')} – ${esc(row.end || 'Open end')}</small>` : ''}</a>`;
  }).join('') || '<p class="portrait-note">No open hauling jobs.</p>';
  toggle.hidden = summary.rows.length <= 2;
  toggle.textContent = expanded ? 'View less' : 'View more';
  toggle.setAttribute('aria-expanded',String(expanded));
}
toggle.addEventListener('click',()=>{expanded = !expanded;render();if(!expanded && hauling.getBoundingClientRect().top < 0) hauling.scrollIntoView({block:'start'});});
function stop(){identity='';jobs=null;tickets=null;generation++;loading=false;}
async function sync(refresh = false){
  const allowed = canView();
  grain.hidden = !allowed; hauling.hidden = !allowed;
  if (!allowed) {stop();$('portrait-grain-totals').replaceChildren();list.replaceChildren();return;}
  const context = window.FVUserContext?.get?.();
  const key = `${context?.uid || ''}:${window.FV_FARM_KEY || ''}`;
  if (identity === key && (loading || refresh !== true)) return;
  if (identity !== key) {stop();identity=key;}
  failed=false;loading=true;render();
  const request=generation;
  try {
    await ready;
    if (request !== generation || !canView()) return;
    const db=getFirestore();
    const snapshots = await Promise.all([
      getDocs(collection(db,'grain_hauling_jobs')),
      getDocs(collection(db,'grain_tickets'))
    ]);
    if (request !== generation || !canView()) return;
    [jobs,tickets] = snapshots.map(snapshot=>snapshot.docs.map(doc=>({...doc.data(),id:doc.id})));
    render();
  } catch(error){if(request !== generation) return;console.warn('[dashboard] Grain overview unavailable',error);failed=true;render();}
  finally {if(request === generation) loading=false;}
}
document.addEventListener('fv:dash-perms-ready',sync);
document.addEventListener('fv:user-ready',sync);
addEventListener('pagehide',stop);
addEventListener('pageshow',()=>sync(true));
addEventListener('focus',()=>sync(true));
setInterval(()=>{if(!document.hidden) sync(true);},60000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden) sync(true);});
sync();
