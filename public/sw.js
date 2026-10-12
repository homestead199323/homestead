// Service worker — offline shell + hashed-asset cache.
//
// Two caches (2026-10-12 rewrite):
//   SHELL  'myterra-shell-<build>'  the HTML, manifest, icons and the other
//          same-origin files that are NOT content-hashed. Replaced per build.
//   ASSETS 'myterra-assets'         everything under /assets/ (content-hashed,
//          immutable). Kept ACROSS builds — a deploy only downloads the chunks
//          whose hash changed instead of all ~350 files again — and pruned on
//          activate to the current build's list.
// The build placeholders below are filled in by scripts/inject-build-id.js
// (postbuild). In dev (vite serve) the literals stay — that's intentional.
//
// Install must not fail because one icon failed to download (addAll of 350
// files used to abort the whole install, leaving the previous worker — or no
// worker — in place): only the app shell + entry chunks are required, the
// rest is best effort.
const BUILD_ID = '__BUILD_ID__';
const SHELL_CACHE = 'myterra-shell-' + BUILD_ID;
const ASSET_CACHE = 'myterra-assets';
// Required for the app to open offline: entry JS/CSS + the map chunk.
const CRITICAL_ASSETS = [
  /* __PRECACHE_CRITICAL__ */
];
// Everything else in /assets/ (icons, art) — fetched if possible, in the background.
const OPTIONAL_ASSETS = [
  /* __PRECACHE_ASSETS__ */
];
// Not content-hashed (manual pages): best effort into the per-build shell cache.
const OPTIONAL_SHELL = [
  /* __PRECACHE_SHELL__ */
];
const SHELL = [
  '/',
  '/app.html',
  '/manifest.json',
  '/favicon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

async function cacheMissing(cache, urls) {
  const missing = [];
  for (const url of urls) {
    if (!(await cache.match(url))) missing.push(url);
  }
  return missing;
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const shell = await caches.open(SHELL_CACHE);
    await shell.addAll(SHELL);
    const assets = await caches.open(ASSET_CACHE);
    // Hashed files already present from a previous build are reused as-is.
    const critical = await cacheMissing(assets, CRITICAL_ASSETS);
    await assets.addAll(critical);
    const optional = await cacheMissing(assets, OPTIONAL_ASSETS);
    // Best effort, a few at a time; a failure here never blocks the install.
    const queue = optional.map((url) => [assets, url]).concat(OPTIONAL_SHELL.map((url) => [shell, url]));
    const worker = async () => {
      while (queue.length) {
        const [cache, url] = queue.shift();
        try { await cache.add(url); } catch (e) { /* fetched on demand later */ }
      }
    };
    await Promise.all([worker(), worker(), worker(), worker()]);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter((k) => k !== SHELL_CACHE && k !== ASSET_CACHE)
      .map((k) => caches.delete(k)));
    // Drop hashed files that no longer exist in this build.
    const keep = new Set(CRITICAL_ASSETS.concat(OPTIONAL_ASSETS));
    if (keep.size) {
      const assets = await caches.open(ASSET_CACHE);
      const cached = await assets.keys();
      await Promise.all(cached
        .filter((req) => !keep.has(new URL(req.url).pathname))
        .map((req) => assets.delete(req)));
    }
    await self.clients.claim();
  })());
});

// Fetch strategy:
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
  // Video: let the browser stream it (range requests); never cache it here.
  if (/\.(mp4|webm)$/i.test(url.pathname)) return;

  const isNavigation = req.mode === 'navigate' || url.pathname === '/' ||
    url.pathname === '/app' || url.pathname.endsWith('.html');
  const isHashedAsset = url.pathname.startsWith('/assets/');

  if (isNavigation) {
    event.respondWith(
      fetch(req).then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(SHELL_CACHE).then((cache) => cache.put(req, clone));
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
          caches.open(ASSET_CACHE).then((cache) => cache.put(req, clone));
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
          caches.open(SHELL_CACHE).then((cache) => cache.put(req, clone));
        }
        return response;
      }).catch(() => cached);
      return cached || fetchPromise;
    })
  );
});


// ─── Push reminders (2026-09-30) ───────────────────────────
// Payload from supabase/functions/push: { title, body, tag, url }.
self.addEventListener('push', (event) => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; } catch (e) { d = { body: event.data ? event.data.text() : '' }; }
  event.waitUntil(self.registration.showNotification(d.title || 'MyTerra', {
    body: d.body || '',
    tag: d.tag || 'myterra',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: { url: d.url || '/app' },
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL((event.notification.data && event.notification.data.url) || '/app', self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if (c.url.indexOf(self.location.origin + '/app') === 0 && 'focus' in c) return c.focus();
      }
      return self.clients.openWindow(target);
    })
  );
});
