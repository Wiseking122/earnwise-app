const CACHE_NAME = 'earnwise-v6';
const ASSETS_TO_CACHE = [
  '/',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-512-maskable.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.allSettled(
        ASSETS_TO_CACHE.map((asset) => {
          return cache.add(asset).catch((err) => {
            console.warn(`PWA: Pre-cache failed for ${asset}:`, err);
          });
        })
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  // Only handle GET requests
  if (e.request.method !== 'GET') {
    return;
  }

  const url = new URL(e.request.url);

  // CRITICAL: NEVER intercept or cache API requests
  if (url.pathname.startsWith('/api')) {
    return;
  }

  // Bypass for non-origin requests (monetization, analytics, external APIs)
  if (url.origin !== self.location.origin) {
    return;
  }

  // Network first with cache fallback
  e.respondWith(
    fetch(e.request)
      .then((networkResponse) => {
        // Cache successful local resource requests
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(e.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(async () => {
        const cachedResponse = await caches.match(e.request);
        if (cachedResponse) {
          return cachedResponse;
        }

        // If a client-side route navigation fails, serve the cached index root
        if (e.request.mode === 'navigate') {
          return caches.match('/') || new Response("Offline available", { status: 200, headers: { 'Content-Type': 'text/html' } });
        }

        return new Response("Offline", { status: 503, statusText: "Service Unavailable" });
      })
  );
});

