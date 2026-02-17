const CACHE_NAME = 'nevorai-cache-v4';
const URLS_TO_CACHE = ['/', '/index.html'];

// URLs that should NEVER be cached (API calls, auth, etc.)
const BYPASS_PATTERNS = [
  'supabase.co',
  'supabase.in',
  '/auth/',
  '/rest/',
  '/functions/',
  '/realtime/',
  '/storage/',
];

function shouldBypass(url) {
  return BYPASS_PATTERNS.some(pattern => url.includes(pattern));
}

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(URLS_TO_CACHE))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(name => name !== CACHE_NAME).map(name => caches.delete(name))
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', event => {
  const url = event.request.url;

  // NEVER cache API/auth requests - always go to network
  if (shouldBypass(url)) {
    return;
  }

  // Navigation requests: network-first
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
          return response;
        })
        .catch(() => {
          return caches.match(event.request);
        })
    );
    return;
  }

  // Static assets only: cache-first
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});

self.addEventListener('periodicsync', event => {
  if (event.tag === 'update-check') {
    event.waitUntil(self.registration.update());
  }
});
