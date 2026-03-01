// Service Worker: cache-first con actualización en segundo plano
const CACHE = 'preceptoria-cache-v1';
const CORE_ASSETS = ['./', './index.html', './app.js', './manifest.json'];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    try { await cache.addAll(CORE_ASSETS); } catch (_) {}
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (e) => {
  e.respondWith((async () => {
    const cached = await caches.match(e.request);
    try {
      const fresh = await fetch(e.request);
      const cache = await caches.open(CACHE);
      cache.put(e.request, fresh.clone());
      return fresh;
    } catch (err) {
      return cached || Response.error();
    }
  })());
});
