// Service worker for the 555 McLean Ave portal.
// Strategy:
//   • Navigations (HTML)  → network-first, fall back to cached shell offline.
//     This keeps content fresh online and avoids serving a stale page.
//   • Other GET requests  → stale-while-revalidate, matching ignores the ?v=
//     cache-busting query so versioned assets still hit the cached base file
//     while a fresh copy is fetched in the background.
// The cache name carries the build version (injected by build.js) so each
// deploy starts a clean cache and old ones are pruned on activate.

const VERSION = '__BUILD_VERSION__';
const CACHE = 'mclean-portal-' + VERSION;

// App shell precached on install. Unversioned paths; fetch matching uses
// ignoreSearch so requests with ?v=… still resolve to these.
const SHELL = [
  './',
  './index.html',
  './styles.css',
  './main.js',
  './ui.js',
  './assistant.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(SHELL)).catch(() => {})
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // don't touch cross-origin (fonts, forms)

  // Navigations: network-first so visitors get the latest page when online.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put('./index.html', copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match('./index.html', { ignoreSearch: true })
          .then(r => r || caches.match('./', { ignoreSearch: true })))
    );
    return;
  }

  // Everything else: stale-while-revalidate.
  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then(cached => {
      const network = fetch(req).then(res => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        }
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
