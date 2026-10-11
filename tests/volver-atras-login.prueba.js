// Tras conectar una nube con inicio de sesión por redirección (Dropbox), "atrás" puede devolver la pantalla de conexión de
// antes tal cual estaba. Si ya hay datos en el móvil, la app se recarga y entra en ellos en vez de pedir conectar otra vez.
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
module.exports = {
  nombre: 'Atrás tras conectar una nube no vuelve a pedir conexión',
  async prueba({ base, nav, c }) {
    await nav.abrirApp(base, { personas: [{ id: 'p1', nombre: 'Ana', icono: 'A' }], categorias: [], documentos: [] });
    const evento = `window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })); 0`;

    // con la app a la vista, restaurar la página no la recarga
    await nav.ejecutar(`window.__marca = 1; ${evento}`); await espera(1500);
    c.igual(await nav.ejecutar(`window.__marca`), 1, 'La app se recargó sin necesidad (estaba a la vista)');

    // con la pantalla de conexión a la vista y datos guardados, sí se recarga y entra en la app
    await nav.ejecutar(`document.documentElement.removeAttribute('data-hay-datos'); volverALogin('nubes'); window.__marca = 1; ${evento}`); await espera(2500);
    // tras recargar la app lee los datos de IndexedDB: se espera a que estén (con la máquina cargada tarda más)
    for (let i = 0; i < 80 && !(await nav.ejecutar(`document.querySelectorAll('.persona-tile .nombre-persona').length > 0`).catch(() => false)); i++) await espera(100);
    c.igual(await nav.ejecutar(`typeof window.__marca`), 'undefined', 'La app no se recargó al volver a la pantalla de conexión');
    c(await nav.ejecutar(`!document.querySelector('#vista-app').classList.contains('hidden') && getComputedStyle(document.querySelector('#vista-login')).display === 'none'`), 'Tras recargar no está a la vista la app con sus datos');
    c.igual(await nav.ejecutar(`[...document.querySelectorAll('.persona-tile .nombre-persona')].map((e) => e.textContent).join(',')`), 'Ana', 'No aparecen los datos tras recargar');

    // sin datos guardados, la pantalla de conexión se queda como está
    await nav.ejecutar(`localStorage.removeItem('documentacion_hay_datos'); document.documentElement.removeAttribute('data-hay-datos'); volverALogin('nubes'); window.__marca = 1; ${evento}`); await espera(1500);
    c.igual(await nav.ejecutar(`window.__marca`), 1, 'Sin datos guardados no debería recargarse');
  },
};
