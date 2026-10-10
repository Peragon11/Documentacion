const CACHE = 'documentacion-shell-v11'; // v11: iconos de avatar cuadrados y sin esquinas redondeadas (letras/*.webp)
const SHELL = ['./index.html', './app.css', './app.js', './idiomas.js', './manifest.json', './icono.png', './icono_maskable.png', './icono_notificacion.png',
  './fuentes/base.css', './fuentes/Poppins-600-latin.woff2', './fuentes/Poppins-600-latin-ext.woff2', './fuentes/Poppins-700-latin.woff2',
  './fuentes/Poppins-700-latin-ext.woff2', './fuentes/SourceSerif4-500-latin.woff2', './fuentes/SourceSerif4-500-latin-ext.woff2',
  './skin-metalico-panel.webp', './skin-metalico-marco.webp', './skin-metalico-placa.webp', './skin-metalico-placa-marco.webp', './skin-metalico-pozo.svg', './skin-metalico-placa-cat.webp', './skin-metalico-fondo.webp',
  ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split('').map((l) => './letras/' + l + '.webp')];

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

  // Solo se cachea lo propio de la app: las peticiones a Google Drive o Dropbox
  // (datos y documentos del usuario) pasan siempre directas.
  if (url.origin !== self.location.origin) return;

  if (event.request.method !== 'GET') return;

  // opencv.js (recorte automático de documentos), las imágenes del skin Metálico, las letras de los
  // avatares y las tipografías no cambian una vez subidas: se sirven de la caché (al momento, sin esperar
  // a la red) y solo se descargan de verdad la primera vez que hacen falta. Con la estrategia normal de
  // aquí abajo (red primero) se volvían a pedir por internet CADA VEZ que se abría la app, aunque no
  // hubiera cambiado nada — eso es lo que se notaba lento, no el peso de los archivos.
  const inmutable = url.pathname.endsWith('/opencv.js') || /\/skin-metalico-[^/]+\.(webp|svg)$/.test(url.pathname)
    || /\/letras\/[A-Z0-9]\.webp$/.test(url.pathname) || /\/fuentes\/[^/]+\.(woff2|css)$/.test(url.pathname);
  if (inmutable) {
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

  // Primero la red (para que una versión nueva se note enseguida) y, si falla, la copia
  // guardada. Una respuesta mala del servidor (un 500 pasajero, por ejemplo) cuenta también
  // como fallo: mejor servir la última copia buena que romper la app. Al abrir la app (navegación)
  // se ignora lo que va tras "?" (p. ej. ?persona=… al tocar una notificación), que no está en la caché.
  const navegacion = event.request.mode === 'navigate';
  const deCache = () => caches.match(event.request, { ignoreSearch: navegacion })
    .then((guardado) => guardado || (navegacion ? caches.match('./index.html') : undefined));
  event.respondWith(
    fetch(event.request)
      .then((res) => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(event.request, clone));
          return res;
        }
        return deCache().then((guardado) => guardado || res);
      })
      .catch(deCache)
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
