import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const root=path.resolve('dist-local');
const assets=fs.readdirSync(path.join(root,'assets')).filter(n=>!n.endsWith('.map')).map(n=>'/assets/'+n);
const files=['/','/index.html','/manifest.webmanifest','/favicon.svg','/icons/icon-192.png','/icons/icon-512.png','/icons/maskable-512.png','/icons/apple-touch-icon.png',...assets];
const version=crypto.createHash('sha256').update(files.map(f=>fs.readFileSync(path.join(root,f==='/'?'index.html':f.slice(1)))).join('|')).digest('hex').slice(0,12);
const worker=`/* ResolveTech PWA: only immutable public shell resources, never personal data. */
const CACHE='resolvetech-shell-${version}';
const SHELL=${JSON.stringify(files)};
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL))));
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const key of await caches.keys())if(key.startsWith('resolvetech-shell-')&&key!==CACHE)await caches.delete(key);await self.clients.claim();})()));
self.addEventListener('message',event=>{if(event.data?.type==='ACTIVATE_UPDATE')self.skipWaiting();});
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);
 // Authenticated APIs, attachments, uploads, Groq and Tidio are NEVER cached or replayed.
 if(request.method!=='GET'||url.origin!==self.location.origin||url.pathname.startsWith('/api/'))return;
 if(request.mode==='navigate'){
  event.respondWith((async()=>{try{return await fetch(request);}catch{return (await caches.open(CACHE)).match('/index.html');}})());return;
 }
 if(SHELL.includes(url.pathname))event.respondWith((async()=>{const cache=await caches.open(CACHE);return (await cache.match(url.pathname))||fetch(request);})());
});
`;
fs.writeFileSync(path.join(root,'sw.js'),worker);
console.log('PWA built:',version,files.length,'public assets. No API cache.');
