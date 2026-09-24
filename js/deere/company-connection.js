import { ready, getAuth } from '/js/firebase/firebase-init.js';

const api = 'https://farmvista-copilot-300398089669.us-central1.run.app/deere/beta';
const status = document.getElementById('deereStatus');
const result = document.getElementById('deereResult');
const connect = document.getElementById('deereConnect');
const test = document.getElementById('deereTest');
const params = new URLSearchParams(location.search);
if (params.get('deere') === 'connected') result.textContent = 'John Deere returned to FarmVista. Verifying the connection…';
if (params.get('deere') === 'error') result.textContent = 'The connection was not completed. Please try again or contact Deere support.';
if (params.has('deere')) {
  params.delete('deere');
  history.replaceState(null, '', `${location.pathname}${params.size ? `?${params}` : ''}${location.hash}`);
}

async function call(path, method = 'GET') {
  await ready;
  const projectId = window.FV_FIREBASE_CONFIG?.projectId;
  const user = getAuth()?.currentUser;
  if (!projectId || !user || typeof user.getIdToken !== 'function') throw new Error('Sign in to a FarmVista farm first.');
  const options = { method, cache: 'no-store', headers: { Authorization: `Bearer ${await user.getIdToken()}` } };
  let url = `${api}/${path}`;
  if (method === 'POST') {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify({ projectId });
  } else {
    url += `?projectId=${encodeURIComponent(projectId)}`;
  }
  const response = await fetch(url, options);
  const body = await response.json();
  if (!response.ok || !body.ok) throw new Error(body.error || `Connection check failed (${response.status}).`);
  return body;
}

async function refresh() {
  try {
    const data = await call('status');
    status.textContent = data.connected
      ? `Connected to ${data.organization || 'John Deere organization'} (ID ${data.organizationId}).`
      : 'Not connected yet. Use the button below, then select your organization on John Deere.';
    connect.textContent = data.connected ? 'Reconnect John Deere' : 'Connect to John Deere';
    connect.disabled = false;
    test.hidden = !data.connected;
  } catch (e) {
    status.textContent = e.message;
    connect.disabled = true;
    test.hidden = true;
  }
}
connect.addEventListener('click', async () => {
  connect.disabled = true;
  status.textContent = 'Opening John Deere…';
  try {
    const data = await call('start', 'POST');
    const destination = new URL(data.url);
    if (destination.origin !== 'https://signin.johndeere.com') throw new Error('Unexpected sign-in destination.');
    location.assign(destination.href);
  } catch (e) { status.textContent = e.message; connect.disabled = false; }
});
test.addEventListener('click', async () => {
  test.disabled = true;
  result.textContent = 'Reading a small sample of fields from John Deere…';
  try {
    const data = await call('test');
    const names = data.fields.map(f => f.name).filter(Boolean);
    result.textContent = `${data.message} ${names.length ? `Example fields: ${names.join(', ')}.` : 'No field names returned.'}`;
  } catch (e) { result.textContent = e.message; }
  finally { test.disabled = false; }
});
refresh();
