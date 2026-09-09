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
for(const [url,method] of [['https://app.test/api/me','GET'],['https://app.test/api/files/123','GET'],['https://app.test/api/chat/123/message','POST'],['https://code.tidio.co/key.js','GET']]){let handled=false;events.fetch({request:{url,method},respondWith:()=>handled=true});assert.equal(handled,false);}
events.fetch({request:{url:'https://app.test/',method:'GET',mode:'navigate'},respondWith:p=>promise=p});assert.equal((await promise).url,'/index.html');
console.log('Service worker: public precache, safe cleanup, offline shell and API/external bypass passed.');
// Tidio adapter: script URL, identity, ready gate, context sending and logout reset.
const listeners=new Map();const scripts=new Map();const sent=[];let ready=false;let resets=0;
const api={on:(name,fn)=>listeners.set(name,fn),open:()=>{},hide:()=>{},show:()=>{},getStatus:()=>ready?'online':null,messageFromVisitor:message=>sent.push(message),resetVisitor:()=>{resets++;ready=false;queueMicrotask(()=>{ready=true;listeners.get('ready')?.()})}};
global.window={setTimeout,tidioChatApi:undefined};global.document={addEventListener:(name,fn)=>listeners.set(name,fn),removeEventListener:(name)=>listeners.delete(name),getElementById:id=>scripts.get(id),createElement:()=>({remove(){scripts.delete(this.id)}}),body:{appendChild(script){scripts.set(script.id,script);queueMicrotask(()=>{window.tidioChatApi=api;ready=true;listeners.get('tidioChat-ready')?.()})}}};
const source=ts.transpileModule(fs.readFileSync('lib/tidio.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {openTidio,resetTidio}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const key='a'.repeat(32),user={id:'user1',name:'Cliente',email:'cliente@example.test'};
await openTidio(key,user,'company1','Contexto aprovado');assert.equal(scripts.get('resolvetech-tidio').src,'https://code.tidio.co/'+key+'.js');assert.equal(document.tidioIdentify.distinct_id,'company1:user1');assert.deepEqual(sent,['Contexto aprovado']);
resetTidio();assert.equal(document.tidioIdentify,undefined);assert.equal(resets,1);
await openTidio(key,{...user,id:'user2'},'company1','Novo contexto');assert.equal(document.tidioIdentify.distinct_id,'company1:user2');assert(resets>=2);assert.equal(sent.at(-1),'Novo contexto');
await assert.rejects(openTidio('b'.repeat(32),user,'company2'),/recarregue/);
await assert.rejects(openTidio('../evil',user,'company1'),/configurado/);
console.log('Tidio: ready gate, identity, context, logout reset and key validation passed (mock SDK).');
