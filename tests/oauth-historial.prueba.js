// Tras conectar Dropbox (la app sale a su página y vuelve), "atrás" desde los documentos debe salir de la app como siempre:
// no tiene que devolver la pantalla de conexión ni la página de Dropbox. Se comprueba con el historial real del navegador.
// Lo mismo tras importar un archivo de copia desde la bienvenida.
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
// Dropbox falso: las llamadas a sus servidores responden lo justo para que la conexión termine
const FETCH_FALSO = `(() => { const real = window.fetch.bind(window); window.fetch = (u, o) => {
  if (String(u).includes('dropboxapi.com/oauth2/token')) return Promise.resolve(new Response(JSON.stringify({ access_token: 'a', refresh_token: 'r', expires_in: 14400 }), { status: 200 }));
  if (String(u).includes('dropbox')) return Promise.resolve(new Response('{}', { status: 200 }));
  return real(u, o); }; })();`;
module.exports = {
  nombre: 'Atrás tras conectar o importar sale de la app',
  async prueba({ base, nav, c }) {
    await nav.enviar('Page.addScriptToEvaluateOnNewDocument', { source: FETCH_FALSO });
    await nav.abrirApp(base, { personas: [{ id: 'p1', nombre: 'Ana', icono: 'A' }], categorias: [], documentos: [] });
    const historial = async () => {
      const h = await nav.enviar('Page.getNavigationHistory');
      return { i: h.currentIndex, urls: h.entries.map((e) => e.url.replace(base, '/')), primera: h.entries.findIndex((e) => e.url.startsWith(base)) };
    };

    // --- Dropbox: sale a su página (falsa), se pulsa "Permitir" y se vuelve a la app con el código
    await nav.ejecutar(`iniciarOAuthPkce('dropbox', location.origin + '/autorizar-falso', {}); 0`);
    await espera(1500);
    c.igual(await nav.ejecutar(`location.pathname`), '/autorizar-falso', 'No se llegó a la página de autorizar');
    await nav.ejecutar(`document.querySelector('#permitir').click(); 0`);
    await espera(6000); // vuelve, retrocede a la entrada de antes y termina la conexión allí

    const h = await historial();
    // la entrada actual es la PRIMERA de la app (atrás saldría de ella) y la página de Dropbox y la de vuelta quedan hacia delante
    c(h.i === h.primera, `Atrás no sale de la app: la entrada actual es la ${h.i} y la primera de la app es la ${h.primera} (historial: ${h.urls.join(' , ')})`);
    c(String(h.urls[h.i + 1]).startsWith('/autorizar-falso'), 'La página de Dropbox no ha quedado hacia delante en el historial');
    c(await nav.ejecutar(`!document.querySelector('#vista-app').classList.contains('hidden')`), 'La app no está a la vista tras conectar');
    c.igual(await nav.ejecutar(`[...document.querySelectorAll('.persona-tile .nombre-persona')].map((e) => e.textContent).join(',')`), 'Ana', 'No se ven los datos tras conectar');
    c(await nav.ejecutar(`Object.keys(localStorage).some((k) => k.includes('dropbox'))`), 'La conexión con Dropbox no se guardó');
    c.igual(await nav.ejecutar(`sessionStorage.getItem('documentacion_oauth_retorno')`), null, 'Queda pendiente el retorno de la conexión');
    c.igual(await nav.ejecutar(`location.search`), '', 'La dirección conserva el código de autorización');

    // --- Importar un archivo de copia desde la bienvenida tampoco deja entradas de más
    await nav.ejecutar(`window.obtenerBlobPagina = async () => new Blob(['x']); 0`);
    await nav.ejecutar(`(async () => {
      const bytes = await generarArchivoExportacion();
      datos = { personas: [], categorias: [], documentos: [] }; mostrandoDatosLocales = false;
      importarDesdeBienvenida(new File([bytes], 'copia.txt', { type: 'text/plain' })); return 0; })()`);
    await espera(3000);
    const h2 = await historial();
    c.igual(await nav.ejecutar(`pilaNavegacion.length`), 0, 'Tras importar quedan capas de navegación');
    c(h2.i === h2.primera, `Tras importar, atrás no sale de la app (entrada ${h2.i}, primera ${h2.primera})`);
    c.igual(await nav.ejecutar(`datos.personas.length`), 1, 'La importación no trajo los datos');
  },
};
