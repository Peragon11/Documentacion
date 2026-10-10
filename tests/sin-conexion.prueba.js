// Con el service worker instalado, la app abre sin conexión, también desde una notificación (?persona=…).
module.exports = {
  nombre: 'Sin conexión (service worker)',
  async prueba({ base, nav, c }) {
    await nav.abrirApp(base, { personas: [{ id: 'p1', nombre: 'Ana', icono: 'A' }, { id: 'p2', nombre: 'Luis', icono: 'L' }], categorias: [], documentos: [] }, {}, 'index.html', { sw: true });
    // Se recarga hasta que el service worker (que se instala en la primera carga) controle la página
    for (let i = 0; i < 6 && !(await nav.ejecutar('!!navigator.serviceWorker.controller')); i++) {
      await nav.ejecutar('navigator.serviceWorker.ready.then(() => 0)');
      await nav.recargar(2500);
    }
    c(await nav.ejecutar(`!!navigator.serviceWorker.controller`), 'El service worker no controla la página');
    await nav.enviar('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
    await nav.enviar('Page.navigate', { url: base + 'index.html?persona=p2' });
    await new Promise((r) => setTimeout(r, 3500));
    c.igual(await nav.ejecutar(`(document.querySelector('#titulo-topbar') || {}).textContent`), 'Luis', 'Sin conexión, abrir desde notificación entra en la persona');
    c(await nav.ejecutar(`[...document.fonts].some((f) => f.status === 'loaded' && f.family.replace(/"/g, '') === 'Poppins')`), 'Sin conexión faltan las letras');
    c(await nav.ejecutar(`[...document.querySelectorAll('.persona-tile img.img-letra, #avatar-topbar img')].every((i) => i.complete && i.naturalWidth > 0)`), 'Sin conexión faltan las letras de los avatares');
    await nav.enviar('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  },
};
