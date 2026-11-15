// Prague Pocket Guide 4.8.2: simplified My Day and repositioned Share, 2026-11-15
// Cache the full app shell plus the pinned map library where possible.
// Live map tiles, exchange-rate updates and weather need connectivity.
// This worker is scoped to /prague/ (or its installation directory) and
// cleans up ONLY its own cache versions, preserving other apps on the domain.
const CACHE='prague-pocket-guide-2026-companion-20261115-v482';
const PREFIX='prague-pocket-guide-2026-';
const LEGACY_CACHE='prague-full-fun-audit-20261112-v1';
const CORE=['./','./index.html','./v4.css','./v4.js','./version.json','./manifest.webmanifest','./icon-192.png','./icon-512.png'];
const PINNED_MAP_ASSETS=[
 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
];
self.addEventListener('install',event=>{
 event.waitUntil(caches.open(CACHE).then(async c=>{
  await c.addAll(CORE);
  // Optional: a blocked CDN must never prevent the offline core from installing.
  await Promise.allSettled(PINNED_MAP_ASSETS.map(async url=>{
   const response=await fetch(url,{mode:'no-cors'});
   if(response.ok||response.type==='opaque')await c.put(url,response);
  }));
 }));
 self.skipWaiting();
});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>(k.startsWith(PREFIX)||k===LEGACY_CACHE)&&k!==CACHE).map(k=>caches.delete(k)))));self.clients.claim()});
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url),scopeUrl=new URL(self.registration.scope);
 // Release metadata must always hit the network: never claim a cached file is current.
 if(url.pathname.endsWith('/version.json')&&url.origin===scopeUrl.origin)return;
 if(event.request.method==='GET'&&PINNED_MAP_ASSETS.includes(url.href)){
  event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request)));
  return;
 }
 if(event.request.method!=='GET'||url.origin!==scopeUrl.origin||!url.pathname.startsWith(scopeUrl.pathname))return;
 if(event.request.mode==='navigate'){
   event.respondWith(fetch(event.request).then(res=>{if(res.ok){const copy=res.clone();caches.open(CACHE).then(c=>c.put('./index.html',copy))}return res}).catch(()=>caches.match('./index.html')));
   return;
 }
 event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).then(res=>{if(res.ok){const copy=res.clone();caches.open(CACHE).then(c=>c.put(event.request,copy))}return res})));
});
