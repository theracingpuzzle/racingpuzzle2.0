// ─── SERVICE WORKER — The Racing Puzzle ───────────────────────────────────────
// Strategy:
//   App shell (HTML/CSS/JS/fonts) → Cache first, fall back to network
//   API calls (Supabase, Racing proxy, Google Fonts CSS) → Network only
//
// Bump CACHE_VERSION whenever you deploy a meaningful update — this forces
// the old cache to be cleared and a fresh copy of all assets to be fetched.

const CACHE_VERSION = 'rp-v325';

const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-apple.png',
  './icons/favicon-32.png',
  './css/app.css',
  './css/racecards.css',
  './css/today.css',
  './css/watchlist.css',
  './js/config.js',
  './js/state.js',
  './js/utils.js',
  './js/supabase.js',
  './js/auth.js',
  './js/racing-api.js',
  './js/racecards.js',
  './js/ui-shell.js',
  './js/today.js',
  './js/betting.js',
  './js/rules.js',
  './js/dashboard.js',
  './js/virtual.js',
  './js/watchlist.js',
  './js/coach.js',
  './js/leagues.js',
  './js/onboarding.js',
  './js/install-guide.js',
  './js/legal.js',
  './js/notifications.js',
  './js/init.js',
];

// Hosts that should ALWAYS go to the network (live data, auth, APIs)
const NETWORK_ONLY_HOSTS = [
  'supabase.co',
  'theracingpuzzle.workers.dev',
  'fonts.googleapis.com',
  'fonts.gstatic.com',
];

// ── Install: cache the app shell ──────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())  // activate immediately, don't wait for old tabs to close
  );
});

// ── Activate: delete old cache versions ───────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key !== CACHE_VERSION)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())  // take control of open tabs immediately
  );
});

// ── Fetch: serve from cache, fall back to network ─────────────────────────────
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Always go to the network for API/font requests
  const isNetworkOnly = NETWORK_ONLY_HOSTS.some(host => url.hostname.includes(host));
  if (isNetworkOnly || event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request)
      .then(cached => {
        if (cached) return cached;
        // Not in cache — fetch from network and store for next time
        return fetch(event.request).then(response => {
          if (!response || response.status !== 200 || response.type === 'opaque') {
            return response;
          }
          const toCache = response.clone();
          caches.open(CACHE_VERSION).then(cache => cache.put(event.request, toCache));
          return response;
        });
      })
      .catch(() => {
        // Offline and not cached — return the cached index.html as a fallback
        if (event.request.destination === 'document') {
          return caches.match('./index.html');
        }
      })
  );
});

// ── Push notifications ────────────────────────────────────────────────────────
self.addEventListener('push', event => {
  let data = { title: 'Racing Puzzle', body: 'You have an update.' };
  try { data = event.data ? event.data.json() : data; } catch(e) {}
  event.waitUntil(
    self.registration.showNotification(data.title || 'Racing Puzzle', {
      body:    data.body    || '',
      icon:    data.icon    || './icons/icon-192.png',
      badge:   data.badge   || './icons/icon-192.png',
      tag:     data.tag     || 'rp-notification',
      data:    data.data    || {},
      vibrate: [200, 100, 200],
      requireInteraction: true,
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      if (list.length > 0) return list[0].focus();
      return clients.openWindow('./');
    })
  );
});
