// FarmVista Grain Operations — centralized Firestore store
import { ready, db, collection, getDocs } from '/js/firebase/firebase-init.js';

export const COLLECTIONS = Object.freeze({
  haulingJobs:'grain_hauling_jobs',
  contracts:'grain_contracts',
  tickets:'grain_tickets',
  buyers:'grain_buyers',
  customers:'grain_customers',
  locations:'grain_delivery_locations'
});

const state = {
  loaded:false,
  loading:false,
  error:null,
  haulingJobs:[], contracts:[], tickets:[], buyers:[], customers:[], locations:[]
};
const listeners = new Set();
export const grainState = () => state;
export const subscribe = fn => { listeners.add(fn); return () => listeners.delete(fn); };
const emit = () => listeners.forEach(fn => { try{ fn(state); }catch(err){ console.error('[Grain Operations] subscriber failed',err); } });

async function read(name){
  const snap = await getDocs(collection(db,name));
  return snap.docs.map(doc => ({id:doc.id,...doc.data()}));
}

export async function loadGrainOperations({force=false}={}){
  if(state.loading) return state;
  if(state.loaded && !force) return state;
  state.loading=true; state.error=null; emit();
  try{
    await ready;
    const [haulingJobs,contracts,tickets,buyers,customers,locations] = await Promise.all([
      read(COLLECTIONS.haulingJobs), read(COLLECTIONS.contracts), read(COLLECTIONS.tickets),
      read(COLLECTIONS.buyers), read(COLLECTIONS.customers), read(COLLECTIONS.locations)
    ]);
    Object.assign(state,{haulingJobs,contracts,tickets,buyers,customers,locations,loaded:true});
  }catch(error){ state.error=error; console.error('[Grain Operations] central load failed',error); }
  finally{ state.loading=false; emit(); }
  return state;
}
