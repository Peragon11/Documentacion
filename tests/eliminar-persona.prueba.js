// Una persona sin documentos se borra sin pedir nada; con documentos pide confirmación.
module.exports = {
  nombre: 'Eliminar persona',
  async prueba({ base, nav, c }) {
    await nav.abrirApp(base, {
      personas: [{ id: 'p1', nombre: 'Ana', icono: 'A' }, { id: 'p2', nombre: 'Marta', icono: 'M' }], categorias: [{ id: 'c1', nombre: 'DNI', color: '#3A6EA5' }],
      documentos: [{ id: 'd1', personaId: 'p2', categoria: 'c1', nombre: 'DNI', paginas: [{ archivoId: 'x1', mimeType: 'image/png', nombre: 'a' }] }],
    });
    await nav.ejecutar(`confirmarEliminarPersona(datos.personas.find((p) => p.id === 'p1')); 0`);
    await new Promise((r) => setTimeout(r, 500));
    c(await nav.ejecutar(`!document.querySelector('#input-confirmar-nombre')`), 'Sin documentos no debería pedir confirmación');
    c.igual(await nav.ejecutar(`datos.personas.map((p) => p.nombre).join(',')`), 'Marta', 'Sin documentos se borra directamente');
    await nav.ejecutar(`confirmarEliminarPersona(datos.personas.find((p) => p.id === 'p2')); 0`);
    await new Promise((r) => setTimeout(r, 500));
    c(await nav.ejecutar(`!!document.querySelector('#input-confirmar-nombre')`), 'Con documentos debería pedir confirmación');
    c.igual(await nav.ejecutar(`datos.personas.length`), 1, 'Con documentos no se borra sin confirmar');
  },
};
