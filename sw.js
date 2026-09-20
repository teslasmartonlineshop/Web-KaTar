/* =========================================================
   SERVICE WORKER — Karang Taruna PWA
   Versi: 1.1.0
   Update: API Google Apps Script TIDAK di-intercept
   ========================================================= */

const CACHE_NAME = 'karang-taruna-v2';
const RUNTIME_CACHE = 'karang-taruna-runtime-v2';

const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json'
];

/* =========================================================
   INSTALL
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
   ACTIVATE
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
   FETCH
   Strategi:
   - API Google Apps Script: LANGSUNG fetch (tanpa SW intercept)
   - Google Fonts / Images: Cache-first
   - File lokal: Stale-while-revalidate
   ========================================================= */
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET
  if (request.method !== 'GET') return;
  if (!url.protocol.startsWith('http')) return;

  /* =========================================================
     ⭐ API Google Apps Script — JANGAN intercept
     Biarkan browser handle langsung → fetch lebih cepat
     ========================================================= */
  if (url.hostname.includes('script.google.com') || 
      url.hostname.includes('script.googleusercontent.com') ||
      url.hostname.includes('googleusercontent.com')) {
    // Tidak pakai respondWith → browser fetch langsung
    return;
  }

  /* =========================================================
     Google Fonts / Images — Cache first
     ========================================================= */
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

  /* =========================================================
     File lokal — Stale-while-revalidate
     ========================================================= */
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
   MESSAGE
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
   PUSH NOTIFICATION (opsional)
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
