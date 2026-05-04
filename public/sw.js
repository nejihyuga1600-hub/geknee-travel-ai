// Minimal service worker — exists primarily to satisfy PWA install eligibility
// on Android Chrome. We deliberately do NOT cache HTML aggressively because
// itineraries, prices, and bookings change often and stale UI is worse than
// a network request. We cache only the offline shell + static brand assets.
const CACHE = 'geknee-shell-v1';
const SHELL = [
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png',
  '/brand/geknee-logo.jpg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Only intercept same-origin static asset requests we explicitly cached.
  if (url.origin !== self.location.origin) return;
  const cacheable = SHELL.some((path) => url.pathname === path);
  if (!cacheable) return;
  event.respondWith(
    caches.match(req).then((hit) => hit || fetch(req)),
  );
});
