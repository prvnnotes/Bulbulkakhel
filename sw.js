const CACHE_NAME = "bulbule-ka-khel-v10";

const FILES_TO_CACHE = [
  "./",
  "./index.html",
  "./styles.css",
  "./game.js",
  "./manifest.json"
];


/* ==========================================================
   INSTALL
========================================================== */

self.addEventListener(
  "install",
  event => {

    event.waitUntil(

      caches
        .open(CACHE_NAME)

        .then(
          cache =>
            cache.addAll(
              FILES_TO_CACHE
            )
        )

        .then(
          () =>
            self.skipWaiting()
        )

    );

  }
);


/* ==========================================================
   ACTIVATE
========================================================== */

self.addEventListener(
  "activate",
  event => {

    event.waitUntil(

      caches
        .keys()

        .then(
          keys =>

            Promise.all(

              keys

                .filter(
                  key =>
                    key !== CACHE_NAME
                )

                .map(
                  key =>
                    caches.delete(
                      key
                    )
                )

            )

        )

        .then(
          () =>
            self.clients.claim()
        )

    );

  }
);


/* ==========================================================
   FETCH
   Network first = latest GitHub file
   Cache = offline fallback
========================================================== */

self.addEventListener(
  "fetch",
  event => {

    if (
      event.request.method !==
      "GET"
    ) {

      return;

    }


    event.respondWith(

      fetch(
        event.request
      )

      .then(
        response => {

          if (
            !response ||
            response.status >= 400
          ) {

            return response;

          }


          const copy =
            response.clone();


          caches
            .open(
              CACHE_NAME
            )

            .then(
              cache => {

                cache.put(
                  event.request,
                  copy
                );

              }
            )

            .catch(
              () => {}
            );


          return response;

        }
      )

      .catch(
        () =>
          caches.match(
            event.request
          )
      )

    );

  }
);
