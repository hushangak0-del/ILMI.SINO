/**
 * Ilmisino Service Worker
 * Versioned cache with offline support for app shell & cached topics
 * NEVER caches Gemini API routes (/api/*)
 */

const CACHE_NAME = 'ilmisino-shell-v2';

const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/manifest.json',
  '/icon.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-maskable-512.png',
  '/apple-touch-icon.png',
  '/offline.html',
];

// Install: precache app shell and skip waiting immediately
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(PRECACHE_ASSETS).catch((err) => {
          console.warn('[SW] Precache partial error (will resolve runtime):', err);
        });
      })
      .then(() => self.skipWaiting())
  );
});

// Activate: clean up old versions and claim active clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((name) => {
            if (name !== CACHE_NAME) {
              console.log('[SW] Removing old cache:', name);
              return caches.delete(name);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch: smart network/cache strategies
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // 1. Never cache non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // 2. CRITICAL: Never cache Gemini API calls (/api/*)
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // 3. Ignore non-HTTP(S) schemes (e.g. chrome-extension:)
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // 4. Navigation requests (Page loads & SPA routing)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(async () => {
          // If offline, first try to serve cached root or index.html
          // This allows all React UI and localStorage data to load without internet!
          const cachedApp = await caches.match('/index.html') || await caches.match('/');
          if (cachedApp) {
            return cachedApp;
          }
          // If app shell wasn't found, fallback to friendly offline page
          const offlinePage = await caches.match('/offline.html');
          if (offlinePage) {
            return offlinePage;
          }
          return new Response('Интернет нест, аммо мавзӯъҳои дарсшуда дастрасанд.', {
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
          });
        })
    );
    return;
  }

  // 5. Static Assets (JS, CSS, fonts, images) -> Stale-While-Revalidate
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, clone);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Network failed, return cached if we have it
          return cachedResponse;
        });

      return cachedResponse || fetchPromise;
    })
  );
});
