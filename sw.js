/* =========================================================
   SERVICE WORKER — Karang Taruna PWA
   Versi: 1.0.0
   ========================================================= */

const CACHE_NAME = 'karang-taruna-v1';
const RUNTIME_CACHE = 'karang-taruna-runtime-v1';

const PRECACHE_URLS = [
  './',
  './index.html',
  './berita-list.html',
  './berita-detail.html',
  './login-register.html',
  './profil.html',
  './manifest.json'
];

/* INSTALL */
self.addEventListener('install', event => {
  console.log('[SW] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(PRECACHE_URLS.map(url => new Request(url, { cache: 'reload' })));
      })
      .then(() => self.skipWaiting())
      .catch(err => console.warn('[SW] Pre-cache gagal:', err))
  );
});

/* ACTIVATE */
self.addEventListener('activate', event => {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME && name !== RUNTIME_CACHE)
          .map(name => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

/* FETCH */
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;
  if (!url.protocol.startsWith('http')) return;

  // API Google Apps Script — Network only
  if (url.hostname.includes('script.google.com') || url.hostname.includes('script.googleusercontent.com')) {
    event.respondWith(
      fetch(request).catch(() => new Response(JSON.stringify({ success: false, message: 'Offline' }), {
        headers: { 'Content-Type': 'application/json' }
      }))
    );
    return;
  }

  // CDN / images — Cache first
  if (
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com') ||
    url.hostname.includes('blogger.googleusercontent.com') ||
    url.hostname.includes('images.unsplash.com') ||
    url.hostname.includes('dicebear.com')
  ) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;
        return fetch(request).then(response => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(RUNTIME_CACHE).then(cache => cache.put(request, clone));
          }
          return response;
        }).catch(() => cached);
      })
    );
    return;
  }

  // File lokal — Stale-while-revalidate
  event.respondWith(
    caches.match(request).then(cached => {
      const fetchPromise = fetch(request).then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
        }
        return response;
      }).catch(() => cached);
      return cached || fetchPromise;
    })
  );
});

/* MESSAGE */
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.keys().then(names => names.forEach(name => caches.delete(name)));
  }
});

/* PUSH NOTIFICATION */
self.addEventListener('push', event => {
  if (!event.data) return;
  const data = event.data.json();
  const options = {
    body: data.body || 'Ada berita baru dari Karang Taruna',
    icon: 'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEgBWQvV0rCjuIh3Oe0RJ5i5tZDfL8QlJ-kXTtQk3Ur4JjnYWbOIpH7Z25CB3ejfZhQwT_KSFM2oMuUd5ErPXNVeddFJ-arCFoNhxRuu7L80M-BqT_E1QkAo38cmK5Gh3tzAGwcVmCZKK2UpTYU8EyFnJcMrKX6cS23Va12-NBNAygccopCtEV2lQEZA6Yk/s320/1000938390.jpg',
    badge: 'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEgBWQvV0rCjuIh3Oe0RJ5i5tZDfL8QlJ-kXTtQk3Ur4JjnYWbOIpH7Z25CB3ejfZhQwT_KSFM2oMuUd5ErPXNVeddFJ-arCFoNhxRuu7L80M-BqT_E1QkAo38cmK5Gh3tzAGwcVmCZKK2UpTYU8EyFnJcMrKX6cS23Va12-NBNAygccopCtEV2lQEZA6Yk/s320/1000938390.jpg',
    data: { url: data.url || './' }
  };
  event.waitUntil(self.registration.showNotification(data.title || 'Karang Taruna', options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = event.notification.data.url || './';
  event.waitUntil(clients.openWindow(url));
});
