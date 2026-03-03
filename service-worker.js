const CACHE_NAME = "fc26-cache-v1";
const urlsToCache = [
  "/trofeos-fifa/",
  "/trofeos-fifa/index.html",
  "/trofeos-fifa/fondo.png",
  "/trofeos-fifa/intro.mp4",
  "/trofeos-fifa/AFA_LPF.glb",
  "/trofeos-fifa/CONMEBOL_Libertadores.glb",
  "/trofeos-fifa/CONMEBOL_Sudamericana.glb"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        return response || fetch(event.request);
      })
  );
});
