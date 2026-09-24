// Conversation context belongs to one Firebase project AND one signed-in user.
// Never migrate old globally stored history into a different farm/user session.
export function scopeKeys(options, projectId, uid) {
  if (!projectId || !uid) throw new Error('A signed-in farm is required');
  const scope = encodeURIComponent(projectId) + ':' + encodeURIComponent(uid);
  return Object.fromEntries(['storageKey','threadKey','contKey','lastKey'].map(key => [key, `${options[key]}:${scope}`]));
}
export function requestHistory(history, currentPrompt) {
  const messages = (Array.isArray(history) ? history : [])
    .filter(message => message && !message.failed && ['user','assistant'].includes(message.role) && typeof message.text === 'string' && !message.text.startsWith('[[FV_PDF]]:'))
    .slice(-13).map(message => ({ role:message.role, content:message.text.slice(0,3000) }));
  if (messages.at(-1)?.role === 'user' && messages.at(-1).content === currentPrompt) messages.pop();
  return messages.slice(-12);
}
const allowedPaths = new Set([
  '/pages/setup/company-details.html',
  '/pages/grain/grain-contracts.html', '/pages/grain/grain-bags.html',
  '/pages/setup/grain-bin-sites.html', '/pages/setup/fields.html',
  '/pages/setup/farms.html', '/pages/equipment/index.html', '/pages/setup/rtk-tower-information.html'
]);
export function safeSources(sources) {
  const seen = new Set();
  return (Array.isArray(sources) ? sources : []).filter(source => {
    if (!source || !allowedPaths.has(source.path) || seen.has(source.path)) return false;
    seen.add(source.path); return true;
  }).slice(0,9).map(source => ({ path:source.path, label:String(source.label || 'farm records').slice(0,80) }));
}
