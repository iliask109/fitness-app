// FitLogix service worker: keeps the app usable offline and shows workout reminders.
// Pages: network first (always the newest version when online), the saved copy when offline.
// Built files (/assets/*): kept on install from precache-manifest.json; they never change for a given name.
// Supabase and /api requests are never cached.
const VERSION = new URL(self.location.href).searchParams.get('v') || 'dev';
const APP_CACHE = `fitlogix-app-${VERSION}`;
const FONT_CACHE = 'fitlogix-fonts';
const PAGE_TIMEOUT_MS = 4000;

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(APP_CACHE);
    try {
      const res = await fetch('/precache-manifest.json', { cache: 'no-store' });
      const { files } = await res.json();
      await cache.addAll(['/', '/manifest.webmanifest', '/icon-192.png', ...files]);
    } catch {
      // No manifest (dev server) or offline during install: pages are still cached as they are visited.
      try { await cache.add('/'); } catch { /* ignore */ }
    }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      if (key.startsWith('fitlogix-app-') && key !== APP_CACHE) await caches.delete(key);
    }
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (req.mode === 'navigate' && url.origin === self.location.origin) {
    event.respondWith(pageFromNetworkOrCache(req));
    return;
  }
  if (url.origin === self.location.origin && (url.pathname.startsWith('/assets/') || /\.(png|svg|webmanifest)$/.test(url.pathname))) {
    event.respondWith(cacheFirst(req, APP_CACHE));
    return;
  }
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(cacheFirst(req, FONT_CACHE));
  }
  // Everything else (Supabase, /api, other sites) goes straight to the network.
});

async function pageFromNetworkOrCache(req) {
  const cache = await caches.open(APP_CACHE);
  try {
    const res = await Promise.race([
      fetch(req),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), PAGE_TIMEOUT_MS)),
    ]);
    if (res.ok) cache.put('/', res.clone());
    return res;
  } catch {
    return (await cache.match('/')) || Response.error();
  }
}

async function cacheFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok || res.type === 'opaque') cache.put(req, res.clone());
  return res;
}

// ---------- workout reminders ----------
self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { body: event.data && event.data.text() }; }
  event.waitUntil(self.registration.showNotification(data.title || 'FitLogix', {
    body: data.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    dir: data.dir || 'rtl',
    lang: data.lang || 'he',
    tag: 'fitlogix-reminder',
    data: { url: data.url || '/' },
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  // Only pages of this app are opened from a notification.
  const target = new URL((event.notification.data && event.notification.data.url) || '/', self.location.origin);
  const url = target.origin === self.location.origin ? target.href : self.location.origin + '/';
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const w of windows) {
      if ('focus' in w) {
        try { await w.navigate(url); } catch { /* keep the current page */ }
        return w.focus();
      }
    }
    return self.clients.openWindow(url);
  })());
});
