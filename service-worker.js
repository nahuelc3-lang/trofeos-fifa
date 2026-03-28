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

self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});

self.addEventListener('install', e => {
  console.log('Service Worker instalado');
});

self.addEventListener('fetch', e => {
  // básico, después podés mejorar cache
});
