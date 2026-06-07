const CACHE_NAME = 'earnwise-v3';
const ASSETS_TO_CACHE = [
  '/',
  '/manifest.json',
  '/icon.png'
];

// Install event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event (Network First, fallback to cache)
self.addEventListener('fetch', (event) => {
  // We only want to intercept basic GET navigations
  if (event.request.method !== 'GET') return;
  
  event.respondWith(
    fetch(event.request).then((networkResponse) => {
        // Optionally update cache if we want
        return networkResponse;
    }).catch(async () => {
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) return cachedResponse;
        
        // If it's a navigation request and both network and cache fail, maybe return index.html
        if (event.request.mode === 'navigate') {
            return caches.match('/');
        }
        return new Response('', { status: 404, statusText: 'Offline' });
    })
  );
});

// Push event
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : { title: 'Earnwise', body: 'New update available!' };
  const options = {
    body: data.body,
    icon: '/icon.png',
    badge: '/icon.png',
    data: { url: data.url || '/' }
  };
  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data.url || '/'));
});
