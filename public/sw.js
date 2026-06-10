// CACHE_NAME contains a build-time placeholder that is replaced with a unique
// build ID by scripts/inject-build-id.js in the postbuild step.
// In dev (vite serve), the literal '__BUILD_ID__' stays — that's intentional
// and stable across reloads.
const CACHE_NAME = 'myterra-__BUILD_ID__';
const ASSETS = [
  '/',
  '/app.html',
  '/manifest.json',
  '/favicon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch strategy (2026-06-10 fix — was cache-first for EVERYTHING, which kept
// serving stale builds: a cached app.html referenced old hashed bundles, so
// returning users ran outdated code until the SW itself cycled. Now:
// - Only same-origin GETs are handled; everything else passes through.
// - HTML / navigations: NETWORK-FIRST with cache fallback. New deploys are
//   picked up on the next load; the cache is only an offline safety net.
// - /assets/*: CACHE-FIRST. Filenames are content-hashed, a hit is always correct.
// - Other same-origin GETs (icons, zone art, manifest): stale-while-revalidate.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  const isNavigation = req.mode === 'navigate' || url.pathname === '/' ||
    url.pathname === '/app' || url.pathname.endsWith('.html');
  const isHashedAsset = url.pathname.startsWith('/assets/');

  if (isNavigation) {
    event.respondWith(
      fetch(req).then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
        }
        return response;
      }).catch(() =>
        caches.match(req).then((c) => c || caches.match('/app.html'))
      )
    );
    return;
  }

  if (isHashedAsset) {
    event.respondWith(
      caches.match(req).then((cached) => cached || fetch(req).then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
        }
        return response;
      }))
    );
    return;
  }

  // Stale-while-revalidate for the rest.
  event.respondWith(
    caches.match(req).then((cached) => {
      const fetchPromise = fetch(req).then((response) => {
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
        }
        return response;
      }).catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
