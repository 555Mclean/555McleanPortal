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

// A navigation to the site root or its index page — the only kind that should
// overwrite the cached app shell. Everything else (docs/*.html) is cached under
// its own url so it comes back correctly offline.
function isShellNavigation(url) {
  const scope = new URL('./', self.location).pathname;
  return url.pathname === scope || url.pathname === scope + 'index.html';
}

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // don't touch cross-origin (fonts, forms)

  // Navigations: network-first so visitors get the latest page when online.
  //
  // The response is cached under its OWN url, not under './index.html'. The
  // scope covers /docs/*, so a blanket put('./index.html', …) would file a
  // document page as the app shell and then serve house-rules.html to anyone
  // opening the portal offline. Only a real root/index navigation refreshes
  // the shell, and only when the response is one worth keeping — a 404 or a
  // 502 from a flaky connection must not become the offline page.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then(res => {
          if (res && res.ok) {
            const copy = res.clone();
            const key = isShellNavigation(url) ? './index.html' : req.url;
            caches.open(CACHE).then(c => c.put(key, copy)).catch(() => {});
          }
          return res;
        })
        // Offline: prefer the page actually asked for, then the app shell.
        .catch(() => caches.match(req, { ignoreSearch: true })
          .then(r => r
            || caches.match('./index.html', { ignoreSearch: true })
            .then(shell => shell || caches.match('./', { ignoreSearch: true }))))
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
      }).catch(err => {
        // Nothing cached and the network is gone: let the request fail as a
        // normal network error rather than resolving to undefined.
        if (cached) return cached;
        throw err;
      });
      return cached || network;
    })
  );
});
