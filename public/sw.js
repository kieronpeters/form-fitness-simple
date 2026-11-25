/* Form Fitness service worker: cache-first for build assets, network-first for pages. */
const CACHE = 'form-fitness-static-v2';
const PRECACHE = [
  '/',
  '/manifest.webmanifest',
  '/icon.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/images/activities/back-stretches.jpg',
  '/images/activities/barbell-curl.jpg',
  '/images/activities/belt-squat.jpg',
  '/images/activities/bench-press.jpg',
  '/images/activities/cable-fly.jpg',
  '/images/activities/chest-press.jpg',
  '/images/activities/goblet-squat.jpg',
  '/images/activities/hack-squat.jpg',
  '/images/activities/hamstring-curl.jpg',
  '/images/activities/imported.jpg',
  '/images/activities/lat-pulldown.jpg',
  '/images/activities/lateral-raise.jpg',
  '/images/activities/leg-extension.jpg',
  '/images/activities/lying-leg-curl.jpg',
  '/images/activities/overhead-press.jpg',
  '/images/activities/placeholder.jpg',
  '/images/activities/pull-up.jpg',
  '/images/activities/push-up.jpg',
  '/images/activities/seated-calf-raise.jpg',
  '/images/activities/seated-row.jpg',
  '/images/activities/straight-arm-pulldown.jpg',
  '/images/activities/treadmill.jpg',
  '/images/activities/tricep-pushdown.jpg',
  '/images/activities/walking-lunge.jpg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then(async (cache) => {
      await Promise.all(
        PRECACHE.map((url) =>
          cache.add(url).catch(() => {
            // A missing image should not block the app shell from installing.
          }),
        ),
      );
    }),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put('/', copy));
          return response;
        })
        .catch(() => caches.match('/').then((cached) => cached || Response.error())),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request).then((response) => {
          if (response.ok && response.type === 'basic') {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        }),
    ),
  );
});

