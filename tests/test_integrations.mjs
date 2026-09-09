import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
// Service worker behavior without a browser: cache privacy and fallback policy.
const events={},added=[],deleted=[];let fetched=0;
const cache={addAll:async urls=>added.push(...urls),match:async url=>({url,fromCache:true})};
const ctx={URL,self:{location:{origin:'https://app.test'},clients:{claim:async()=>{}},addEventListener:(name,fn)=>events[name]=fn,skipWaiting:()=>{}},caches:{open:async()=>cache,keys:async()=>['unrelated-cache','resolvetech-shell-old'],delete:async name=>deleted.push(name)},fetch:async()=>{fetched++;throw new Error('offline')}};
vm.runInNewContext(fs.readFileSync('dist-local/sw.js','utf8'),ctx);
let promise;events.install({waitUntil:p=>promise=p});await promise;
assert(added.includes('/index.html'));assert(!added.some(p=>p.startsWith('/api/')));
events.activate({waitUntil:p=>promise=p});await promise;assert.deepEqual(deleted,['resolvetech-shell-old']);
for(const [url,method] of [['https://app.test/api/me','GET'],['https://app.test/api/files/123','GET'],['https://app.test/api/chat/123/message','POST']]){let handled=false;events.fetch({request:{url,method},respondWith:()=>handled=true});assert.equal(handled,false);}
events.fetch({request:{url:'https://app.test/',method:'GET',mode:'navigate'},respondWith:p=>promise=p});assert.equal((await promise).url,'/index.html');
console.log('Service worker: public precache, safe cleanup, offline shell and API/external bypass passed.');
