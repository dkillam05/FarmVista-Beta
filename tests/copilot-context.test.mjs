import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const source=await readFile(new URL('../js/dashboard/copilot/copilot-context.js',import.meta.url),'utf8');
const {scopeKeys,requestHistory,safeSources}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
test('chat history storage is isolated by farm and user',()=>{
  const options={storageKey:'chat',threadKey:'thread',contKey:'cont',lastKey:'last'};
  assert.notEqual(scopeKeys(options,'a','u').storageKey,scopeKeys(options,'b','u').storageKey);
  assert.notEqual(scopeKeys(options,'a','u').storageKey,scopeKeys(options,'a','v').storageKey);
  assert.throws(()=>scopeKeys(options,'a',''));
});
test('send prior turns once, exclude errors and PDF placeholders',()=>{
  const history=[{role:'user',text:'How much corn?'},{role:'assistant',text:'200 bu'},{role:'assistant',text:'API error',failed:true},{role:'assistant',text:'[[FV_PDF]]:bad'},{role:'user',text:'What about beans?'}];
  assert.deepEqual(requestHistory(history,'What about beans?'),[{role:'user',content:'How much corn?'},{role:'assistant',content:'200 bu'}]);
});
test('source links only allow known FarmVista pages, never external or script URLs',()=>{
  const sources=[{path:'javascript:alert(1)'},{path:'https://example.com'},{path:'//example.com'},{path:'/pages/setup/fields.html',label:'Fields'},{path:'/pages/setup/fields.html',label:'Duplicate'}];
  assert.deepEqual(safeSources(sources),[{path:'/pages/setup/fields.html',label:'Fields'}]);
});
