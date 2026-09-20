/* =========================================================
   SERVICE WORKER — Karang Taruna PWA
   Versi: 1.0.0
   ========================================================= */

const CACHE_NAME = 'karang-taruna-v1';
const RUNTIME_CACHE = 'karang-taruna-runtime-v1';

/* File yang di-cache saat install (static assets) */
const PRECACHE_URLS = [
  './',
  './index.html',
  './berita-list.html',
  './berita-detail.html',
  './login-register.html',
  './profil.html',
  './manifest.json'
];

/* =========================================================
   INSTALL — Pre-cache static assets
   ========================================================= */
self.addEventListener('install', event => {
  console.log('[SW] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Pre-caching static assets');
        return cache.addAll(PRECACHE_URLS.map(url => new Request(url, { cache: 'reload' })));
      })
      .then(() => self.skipWaiting())
      .catch(err => console.warn('[SW] Pre-cache gagal:', err))
  );
});

/* =========================================================
   ACTIVATE — Hapus cache lama
   ========================================================= */
self.addEventListener('activate', event => {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME && name !== RUNTIME_CACHE)
          .map(name => {
            console.log('[SW] Hapus cache lama:', name);
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim())
  );
});

/* =========================================================
   FETCH — Strategi caching
   - API Google Apps Script: Network-only (jangan cache)
   - Google Fonts / CDN: Cache-first
   - File lokal: Stale-while-revalidate
   ========================================================= */
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET
  if (request.method !== 'GET') return;

  // Skip chrome-extension, dll
  if (!url.protocol.startsWith('http')) return;

  // API Google Apps Script — Network only (selalu fresh)
  if (url.hostname.includes('script.google.com') || url.hostname.includes('script.googleusercontent.com')) {
    event.respondWith(
      fetch(request).catch(() => {
        return new Response(JSON.stringify({ success: false, message: 'Offline' }), {
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }

  // Google Fonts, Blogger images, Unsplash — Cache first
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

  // File lokal (HTML, CSS, JS) — Stale-while-revalidate
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

/* =========================================================
   MESSAGE — Handle pesan dari halaman
   ========================================================= */
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.keys().then(names => {
      names.forEach(name => caches.delete(name));
    });
  }
});

/* =========================================================
   PUSH NOTIFICATION (opsional — untuk future)
   ========================================================= */
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
