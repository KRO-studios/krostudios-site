// Prague Pocket Guide: offline app shell only. Live maps and weather need internet.
// This worker is scoped to /prague/ (or its installation directory) and
// cleans up ONLY its own cache versions, preserving other apps on the domain.
const CACHE='prague-pocket-guide-2026-v13-hidden-gems';
const PREFIX='prague-pocket-guide-2026-';
const CORE=['./','./index.html','./manifest.webmanifest','./icon-192.png','./icon-512.png'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)));self.skipWaiting()});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith(PREFIX)&&k!==CACHE).map(k=>caches.delete(k)))));self.clients.claim()});
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url),scopeUrl=new URL(self.registration.scope);
 if(event.request.method!=='GET'||url.origin!==scopeUrl.origin||!url.pathname.startsWith(scopeUrl.pathname))return;
 if(event.request.mode==='navigate'){
   event.respondWith(fetch(event.request).then(res=>{if(res.ok){const copy=res.clone();caches.open(CACHE).then(c=>c.put('./index.html',copy))}return res}).catch(()=>caches.match('./index.html')));
   return;
 }
 event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).then(res=>{if(res.ok){const copy=res.clone();caches.open(CACHE).then(c=>c.put(event.request,copy))}return res})));
});
