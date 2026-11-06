/* Arcade service worker: the hub and every game keep working offline once visited.
 * Built assets carry content hashes, so cached copies never go stale; pages are
 * refreshed in the background (stale-while-revalidate). */
const VERSION = 'arcade-v2';
const SHELL = ['/', '/manifest.webmanifest', '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return; // analytics and the like go straight through
  if (url.pathname.startsWith('/_vercel/')) return;
  event.respondWith(
    caches.open(VERSION).then(async (cache) => {
      const cached = await cache.match(req);
      const network = fetch(req)
        .then((res) => {
          if (res.ok) cache.put(req, res.clone());
          return res;
        })
        .catch(() => cached);
      // pages: prefer fresh, fall back to cache; assets: cache first, refresh behind
      if (req.mode === 'navigate') return (await network) || cached;
      return cached || network;
    }),
  );
});
