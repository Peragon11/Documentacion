// Service worker de Documentación.
// Solo cachea el "shell" estático de la app (HTML/CSS/JS/iconos).
// NUNCA cachea llamadas a googleapis.com: ni tokens, ni metadatos, ni documentos.
//
// Estrategia: "red primero". Mientras haya conexión, siempre se sirve la
// versión más reciente publicada; la copia en caché solo se usa como
// respaldo cuando no hay red. Así, cada vez que se hace un nuevo deploy,
// la app instalada lo recoge en la siguiente vez que se abra con conexión,
// sin depender de que el propio sw.js haya cambiado de bytes.
const CACHE = 'documentacion-shell-v2';
const SHELL = ['./index.html', './manifest.json', './icono.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Nunca interceptar llamadas a Google (auth, Drive API, etc.)
  if (url.hostname.includes('google')) return;

  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((res) => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(event.request, clone));
        }
        return res;
      })
      .catch(() => caches.match(event.request))
  );
});
