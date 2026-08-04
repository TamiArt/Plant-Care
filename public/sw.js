const CACHE_VERSION = "plantcare-v1";

const APP_SHELL = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];


// Установка Service Worker
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(APP_SHELL))
  );
});


// Принудительное включение новой версии
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});


// Очистка старых кешей
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_VERSION)
          .map((key) => caches.delete(key))
      )
    )
  );

  self.clients.claim();
});


// Работа с запросами
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  const url = new URL(event.request.url);


  // Навигация страниц приложения
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then(async (response) => {
          const cache = await caches.open(CACHE_VERSION);

          await cache.put(
            "/index.html",
            response.clone()
          );

          return response;
        })
        .catch(() => {
          return caches.match("/index.html");
        })
    );

    return;
  }


  // Только свои ресурсы
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(event.request)
        .then(async (cached) => {

          if (cached) {
            return cached;
          }


          const response = await fetch(event.request);


          if (response.ok) {
            const cache = await caches.open(CACHE_VERSION);

            await cache.put(
              event.request,
              response.clone()
            );
          }


          return response;
        })
    );
  }
});