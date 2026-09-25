import test from 'node:test';import assert from 'node:assert/strict';
import {issuePayload} from '../js/dashboard/copilot/copilot-issues.js';
test('report snapshots stop at selected answer, retain context, and exclude credentials and continuation data',()=>{
const history=Array.from({length:30},(_,i)=>({role:i%2?'assistant':'user',text:'Message '+i,continuation:'secret',proof:{token:'private'}}));
const data=issuePayload(history,25,'Wrong acres','request-test-123456');assert.equal(data.messages.length,20);assert.equal(data.messages.at(-1).text,'Message 25');assert.equal(JSON.stringify(data).includes('secret'),false);assert.equal(JSON.stringify(data).includes('Message 26'),false);assert.throws(()=>issuePayload(history,24,'','id'));});
