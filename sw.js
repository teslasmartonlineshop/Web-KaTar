/* =========================================================
   KARANG TARUNA (PUTRA ASMARA)
   Progressive Web App — Service Worker
   ========================================================= */

const CACHE_NAME = "karang-taruna-putra-asmara-v2";

/*
 * File utama yang wajib tersedia ketika offline.
 */
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./profil.html",
  "./login-register.html",
  "./manifest.json",

  /* Icon PWA */
  "./assets/icon-192.png",
  "./assets/icon-512.png",

  /* Karakter Ghibli */
  "./assets/karakter-ghibli.png"
];


/* =========================================================
   INSTALL
   ========================================================= */

self.addEventListener("install", event => {

  console.log("[PWA] Service Worker: INSTALL");

  event.waitUntil(

    caches.open(CACHE_NAME)

      .then(cache => {

        console.log("[PWA] Menyimpan core assets...");

        return cache.addAll(CORE_ASSETS);

      })

      .then(() => {

        console.log("[PWA] Core assets berhasil dicache.");

        /*
         * Langsung mengaktifkan Service Worker baru.
         */
        return self.skipWaiting();

      })

  );

});


/* =========================================================
   ACTIVATE
   ========================================================= */

self.addEventListener("activate", event => {

  console.log("[PWA] Service Worker: ACTIVATE");

  event.waitUntil(

    caches.keys()

      .then(cacheNames => {

        return Promise.all(

          cacheNames

            .filter(name => name !== CACHE_NAME)

            .map(name => {

              console.log("[PWA] Menghapus cache lama:", name);

              return caches.delete(name);

            })

        );

      })

      .then(() => {

        /*
         * Mengambil alih seluruh halaman
         * tanpa menunggu reload berikutnya.
         */
        return self.clients.claim();

      })

  );

});


/* =========================================================
   FETCH
   ========================================================= */

self.addEventListener("fetch", event => {

  /*
   * Hanya GET request.
   */
  if (event.request.method !== "GET") {
    return;
  }

  /*
   * Jangan mengganggu request eksternal tertentu.
   */
  const requestURL = new URL(event.request.url);

  /*
   * Strategi:
   *
   * 1. Cache terlebih dahulu.
   * 2. Jika tidak ada → Internet.
   * 3. Jika berhasil → simpan ke cache.
   * 4. Jika offline → fallback.
   */

  event.respondWith(

    caches.match(event.request)

      .then(cachedResponse => {

        if (cachedResponse) {

          return cachedResponse;

        }

        return fetch(event.request)

          .then(networkResponse => {

            /*
             * Response harus valid.
             */
            if (
              networkResponse &&
              networkResponse.status === 200 &&
              networkResponse.type === "basic"
            ) {

              const responseClone =
                networkResponse.clone();

              caches.open(CACHE_NAME)

                .then(cache => {

                  cache.put(
                    event.request,
                    responseClone
                  );

                });

            }

            return networkResponse;

          })

          .catch(() => {

            /*
             * Jika request berupa halaman HTML
             * dan internet tidak tersedia,
             * tampilkan index.html.
             */

            if (
              event.request.destination === "document"
            ) {

              return caches.match(
                "./index.html"
              );

            }

            /*
             * Resource lain yang tidak tersedia
             * saat offline akan menghasilkan error.
             */

            return new Response(
              "Offline — resource tidak tersedia.",
              {
                status: 503,
                statusText: "Service Unavailable",
                headers: {
                  "Content-Type": "text/plain; charset=utf-8"
                }
              }
            );

          });

      })

  );

});


/* =========================================================
   MESSAGE
   ========================================================= */

self.addEventListener("message", event => {

  if (!event.data) {
    return;
  }

  /*
   * Memungkinkan halaman meminta
   * Service Worker langsung mengambil alih.
   */
  if (event.data.type === "SKIP_WAITING") {

    self.skipWaiting();

  }

});
