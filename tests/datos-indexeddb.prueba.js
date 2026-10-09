// Los datos se guardan en IndexedDB (no en localStorage): se pasan solos desde versiones anteriores,
// sobreviven a recargar, admiten fotos grandes y se borran con "borrar todo".
module.exports = {
  nombre: 'Datos guardados en IndexedDB',
  async prueba({ base, nav, c }) {
    await nav.abrirApp(base, { personas: [{ id: 'p1', nombre: 'Migrada', icono: 'M' }], categorias: [], documentos: [] });
    const nombres = () => nav.ejecutar(`[...document.querySelectorAll('.persona-tile .nombre-persona')].map((e) => e.textContent).join(',')`);
    c.igual(await nombres(), 'Migrada', 'Se ven los datos de la versión anterior');
    c(await nav.ejecutar(`localStorage.getItem('documentacion_datos_cache') === null`), 'La copia vieja de localStorage no se borró tras pasarla');
    c.igual(await nav.ejecutar(`localStorage.getItem('documentacion_hay_datos')`), '1', 'Marca de "hay datos"');

    await nav.ejecutar(`datos.personas[0].nombre = 'Cambiada'; guardarMetadatos(); colaEscrituraDatos.then(() => 0)`);
    await nav.recargar();
    c.igual(await nombres(), 'Cambiada', 'Un cambio sobrevive a recargar');

    await nav.ejecutar(`datos.personas[0].foto = 'data:image/jpeg;base64,' + 'A'.repeat(6 * 1024 * 1024); guardarMetadatos(); colaEscrituraDatos.then(() => 0)`);
    await nav.recargar(2500);
    c(await nav.ejecutar(`(datos.personas[0].foto || '').length > 6000000`), 'Una foto de 6 MB (no cabría en localStorage) se pierde');

    await nav.ejecutar(`cerrarSesionCompleta(); 0`);
    await new Promise((r) => setTimeout(r, 3500));
    c.igual(await nav.ejecutar(`datos.personas.length`), 0, 'Tras borrar todo quedan personas');
    c.igual(await nav.ejecutar(`localStorage.getItem('documentacion_hay_datos')`), null, 'Tras borrar todo queda la marca');
  },
};
