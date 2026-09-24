import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../js/dashboard/copilot/copilot-viewport.js',import.meta.url),'utf8');
const {chatViewportBounds}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
test('opening with no keyboard keeps the composer above the fixed footer',()=>{
  assert.deepEqual(chatViewportBounds({layoutHeight:844,viewport:{height:844,offsetTop:0,scale:1},focused:true,mobile:true,footer:{top:770,height:74}}),{top:12,bottom:758,keyboard:false,gap:0});
});
test('iPhone keyboard excludes floating footer and reserves enough scroll room',()=>{
  assert.deepEqual(chatViewportBounds({layoutHeight:844,viewport:{height:450,offsetTop:80,scale:1},focused:true,mobile:true,footer:{top:330,height:74}}),{top:92,bottom:518,keyboard:true,gap:394});
});
test('footer restores after keyboard dismissal or leaving the chat',()=>{
  assert.equal(chatViewportBounds({layoutHeight:844,viewport:{height:844,scale:1},focused:true,mobile:true}).keyboard,false);
  assert.equal(chatViewportBounds({layoutHeight:844,viewport:{height:450,scale:1},focused:false,mobile:true}).keyboard,false);
});
test('desktop resizing, phone browser bars and pinch zoom do not hide the footer',()=>{
  assert.equal(chatViewportBounds({layoutHeight:844,viewport:{height:450,scale:1},focused:true,mobile:false}).keyboard,false);
  assert.equal(chatViewportBounds({layoutHeight:844,viewport:{height:750,scale:1},focused:true,mobile:true}).keyboard,false);
  assert.equal(chatViewportBounds({layoutHeight:844,viewport:{height:450,scale:2},focused:true,mobile:true}).keyboard,false);
});
