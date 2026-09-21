/* =========================================================
   SERVICE WORKER — Karang Taruna PWA
   Versi: 1.0.1
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
   ========================================================= */
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;
  if (!url.protocol.startsWith('http')) return;

  /* API Google Apps Script — Network only, JANGAN cache */
  if (url.hostname.includes('script.google.com') || url.hostname.includes('script.googleusercontent.com')) {
    event.respondWith(
      fetch(request).catch(err => {
        console.warn('[SW] API fetch gagal:', err.message);
        // Return response error tanpa JSON palsu
        return new Response('', { status: 503, statusText: 'Offline' });
      })
    );
    return;
  }

  /* Google Fonts / images — Cache first */
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

  /* File lokal — Stale-while-revalidate */
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
