const CACHE_PREFIX = 'shishi-trails-shell-';
const CACHE_NAME = `${CACHE_PREFIX}v11`;
const root = new URL('.', self.location.href);
const shell = [
  'index.html', 'styles.css?v=11', 'app.js?v=11', 'data.js', 'map.js?v=11', 'map.css?v=11', 'weather.js', 'weather.css',
  'after-trip.js?v=7', 'after-trip-data.js?v=9', 'after-trip.css?v=7',
  'amud-upper.js?v=4', 'amud-lower.js?v=4', 'amud-nearby.js?v=3',
  'manifest.webmanifest', 'assets/hills.webp', 'assets/after-hero.webp', 'assets/icon-192.png', 'assets/icon-512.png',
  'vendor/leaflet/leaflet.js', 'vendor/leaflet/leaflet.css',
  'vendor/leaflet/images/layers.png', 'vendor/leaflet/images/layers-2x.png',
  'vendor/leaflet/images/marker-icon.png', 'vendor/leaflet/images/marker-icon-2x.png', 'vendor/leaflet/images/marker-shadow.png',
].map((entry) => new URL(entry, root).href);
const shellUrls = new Set(shell);

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(shell)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (request.mode === 'navigate' && url.origin === root.origin && [root.pathname, new URL('index.html', root).pathname].includes(url.pathname)) {
    event.respondWith(fetch(request).catch(async () => (await caches.open(CACHE_NAME)).match(shell[0])));
  } else if (shellUrls.has(url.href)) {
    event.respondWith((async () => (await (await caches.open(CACHE_NAME)).match(request)) || fetch(request))());
  }
});
