/* =========================================================
   KARANG TARUNA (PUTRA ASMARA)
   Progressive Web App — Service Worker
   ========================================================= */

const CACHE_NAME = "karang-taruna-putra-asmara-v1";

const CORE_ASSETS = [
  "./",
  "./index.html",
  "./manifest.json"
];

/* =========================================================
   INSTALL
   ========================================================= */

self.addEventListener("install", event => {

  console.log("[PWA] Service Worker installing...");

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(CORE_ASSETS);
      })
      .then(() => {
        return self.skipWaiting();
      })
  );

});


/* =========================================================
   ACTIVATE
   ========================================================= */

self.addEventListener("activate", event => {

  console.log("[PWA] Service Worker activated");

  event.waitUntil(

    caches.keys().then(cacheNames => {

      return Promise.all(

        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))

      );

    }).then(() => {

      return self.clients.claim();

    })

  );

});


/* =========================================================
   FETCH
   ========================================================= */

self.addEventListener("fetch", event => {

  /*
   * Hanya menangani request GET.
   */
  if (event.request.method !== "GET") {
    return;
  }

  event.respondWith(

    caches.match(event.request)
      .then(cachedResponse => {

        /*
         * Jika sudah ada di cache,
         * gunakan cache terlebih dahulu.
         */
        if (cachedResponse) {
          return cachedResponse;
        }

        /*
         * Jika belum ada cache,
         * ambil dari internet.
         */
        return fetch(event.request)
          .then(networkResponse => {

            /*
             * Simpan response yang valid
             * ke cache.
             */
            if (
              networkResponse &&
              networkResponse.status === 200 &&
              networkResponse.type !== "opaque"
            ) {

              const responseClone = networkResponse.clone();

              caches.open(CACHE_NAME)
                .then(cache => {
                  cache.put(event.request, responseClone);
                });

            }

            return networkResponse;

          })
          .catch(() => {

            /*
             * Jika offline dan halaman tidak tersedia,
             * coba tampilkan index.
             */
            return caches.match("./index.html");

          });

      })

  );

});
