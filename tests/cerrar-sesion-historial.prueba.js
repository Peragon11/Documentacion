// Al cerrar sesión desde Ajustes, la app se recarga: las ventanas abiertas (Ajustes y sus confirmaciones) no deben quedar como
// entradas del historial por debajo de la app nueva, o después de conectar una nube el primer "atrás" volvería a cargar la
// app sin hacer nada visible (un "atrás" fantasma) y solo el segundo saldría.
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
module.exports = {
  nombre: 'Cerrar sesión no deja un atrás fantasma',
  async prueba({ base, nav, c }) {
    await nav.abrirApp(base, { personas: [{ id: 'p1', nombre: 'Ana', icono: 'A' }], categorias: [], documentos: [] });
    const historial = async () => {
      const h = await nav.enviar('Page.getNavigationHistory');
      return { i: h.currentIndex, n: h.entries.length, primera: h.entries.findIndex((e) => e.url.startsWith(base)) };
    };
    // Ajustes abierto (una capa de navegación = una entrada de historial) y se cierra la sesión desde ahí
    await nav.ejecutar(`abrirAjustes(true); 0`);
    await espera(600);
    const antes = await historial();
    c.igual(antes.i, antes.primera + 1, 'Con Ajustes abierto debería haber una entrada más en el historial');
    await nav.ejecutar(`cerrarSesionCompleta(); 0`);
    await espera(5000); // vuelve a la entrada de la app, borra, y recarga en la bienvenida

    const despues = await historial();
    c.igual(despues.i, despues.primera, 'Tras cerrar sesión la app debe ser la primera entrada del historial (un solo atrás sale)');
    c(await nav.ejecutar(`getComputedStyle(document.querySelector('#vista-login')).display !== 'none' || !document.querySelector('#vista-idioma').classList.contains('hidden')`), 'No se ve la pantalla de inicio tras cerrar sesión');
    c.igual(await nav.ejecutar(`localStorage.getItem('documentacion_hay_datos')`), null, 'Quedan datos tras cerrar sesión');
  },
};
