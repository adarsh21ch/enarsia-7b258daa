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

// ─── Smart Notification Grouping ───────────────────────────────

/**
 * Build a grouped notification title + body from accumulated data.
 * @param {object} opts
 * @param {number} opts.count       Total items in this group
 * @param {string[]} opts.senders   Unique sender names (most recent last)
 * @param {string} opts.contextName e.g. "Focus Group", "Achievers Club"
 * @param {string} opts.contextType e.g. "announcements", "updates", "messages"
 * @returns {{ title: string, body: string }}
 */
function buildGroupedText({ count, senders, contextName, contextType }) {
  const label = contextType || 'updates';
  const ctx = contextName || 'Achievers Club';

  if (count <= 1 || senders.length === 0) {
    return null; // caller will use original title/body
  }

  const latest = senders[senders.length - 1];
  const othersCount = senders.length - 1;

  let title;
  if (senders.length === 1) {
    title = `${latest} posted ${count} ${label}`;
  } else if (senders.length === 2) {
    title = `${latest} and ${senders[0]}`;
  } else {
    title = `${latest} and ${othersCount} others`;
  }

  const body = `${count} new ${label} in ${ctx}`;
  return { title, body };
}

// Push notification handler with smart grouping
self.addEventListener('push', event => {
  let data = { title: 'NevorAI', body: 'You have a new notification' };
  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch (e) {
    console.error('Push data parse error:', e);
  }

  const tag = data.tag || 'nevorai-push';
  const isGroupable = Boolean(data.groupKey);

  event.waitUntil((async () => {
    let title = data.title || 'NevorAI';
    let body = data.body || '';
    let notifCount = 1;
    let senders = [];

    if (isGroupable) {
      try {
        // Check existing notifications with the same tag
        const existing = await self.registration.getNotifications({ tag });

        if (existing.length > 0) {
          const prev = existing[0].data || {};
          notifCount = (prev.count || 1) + 1;
          senders = Array.isArray(prev.senders) ? [...prev.senders] : [];
        }

        // Add current sender if not already tracked
        if (data.senderName && !senders.includes(data.senderName)) {
          senders.push(data.senderName);
        }

        // Build grouped text if count > 1
        const grouped = buildGroupedText({
          count: notifCount,
          senders,
          contextName: data.contextName,
          contextType: data.contextType,
        });

        if (grouped) {
          title = grouped.title;
          body = grouped.body;
        }
      } catch (err) {
        console.error('Grouping error:', err);
      }
    }

    await self.registration.showNotification(title, {
      body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      vibrate: [200, 100, 200],
      data: {
        url: data.url || '/',
        count: notifCount,
        senders,
        groupKey: data.groupKey || null,
        contextName: data.contextName || null,
      },
      tag,
      renotify: true,
    });
  })());
});

// Notification click handler
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async clientList => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          await client.focus();
          if ('navigate' in client) {
            await client.navigate(url);
          }
          return;
        }
      }
      return clients.openWindow(url);
    })
  );
});

self.addEventListener('periodicsync', event => {
  if (event.tag === 'update-check') {
    event.waitUntil(self.registration.update());
  }
});
