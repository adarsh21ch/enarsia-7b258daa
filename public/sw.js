function isLegacyAppCache(name) {
  return name === 'nevorai-cache-v4' || name.startsWith('nevorai-cache-');
}

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const cacheNames = await caches.keys();
        const appCacheNames = cacheNames.filter(isLegacyAppCache);
        await Promise.allSettled(appCacheNames.map((name) => caches.delete(name)));
        await self.clients.claim();

        const windowClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        await Promise.allSettled(
          windowClients.map((client) => {
            if ('navigate' in client) {
              return client.navigate(client.url);
            }

            return Promise.resolve();
          }),
        );
      } finally {
        await self.registration.unregister();
      }
    })(),
  );
});
