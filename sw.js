const CACHE = 'documentacion-shell-v3';
const SHELL = ['./index.html', './idiomas.js', './manifest.json', './icono.png', './icono_notificacion.png'];

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

  // Solo se cachea lo propio de la app: las peticiones a Google, Dropbox o
  // OneDrive (datos y documentos del usuario) pasan siempre directas.
  if (url.origin !== self.location.origin) return;

  if (event.request.method !== 'GET') return;

  // opencv.js (recorte automático de documentos) pesa ~10 MB y no cambia: se sirve
  // de la caché y solo se descarga la primera vez que hace falta.
  if (url.pathname.endsWith('/opencv.js')) {
    event.respondWith(
      caches.match(event.request).then((guardado) => guardado || fetch(event.request).then((res) => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(event.request, clone));
        }
        return res;
      }))
    );
    return;
  }

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

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const personaId = event.notification.data && event.notification.data.personaId;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((lista) => {
      for (const c of lista) {
        if ('focus' in c) {
          if (personaId) c.postMessage({ tipo: 'abrir-persona', personaId });
          return c.focus();
        }
      }
      if (self.clients.openWindow) {
        const destino = personaId ? `./index.html?persona=${encodeURIComponent(personaId)}` : './index.html';
        return self.clients.openWindow(destino);
      }
    })
  );
});
