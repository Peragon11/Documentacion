// El aviso de caducados lleva a cada documento en la misma pantalla, en orden, y empieza de cero en cada persona.
const pagina = (id) => [{ archivoId: id, mimeType: 'image/png', nombre: 'x' }];
module.exports = {
  nombre: 'Aviso de caducados: salto en la misma pantalla',
  async prueba({ base, nav, c }) {
    await nav.abrirApp(base, {
      personas: [{ id: 'p1', nombre: 'Ana', icono: 'A' }, { id: 'p2', nombre: 'Bea', icono: 'B' }],
      categorias: [{ id: 'c1', nombre: 'C1', color: '#123456' }, { id: 'c2', nombre: 'C2', color: '#654321' }],
      documentos: [
        { id: 'd1', personaId: 'p1', categoria: 'c1', nombre: 'A1', fechaCaducidad: '2020-01-01', paginas: pagina('a') },
        { id: 'd2', personaId: 'p1', categoria: 'c2', nombre: 'A2', fechaCaducidad: '2020-02-01', paginas: pagina('b') },
        { id: 'd3', personaId: 'p2', categoria: 'c1', nombre: 'B1', fechaCaducidad: '2020-01-01', paginas: pagina('c') },
        { id: 'd4', personaId: 'p2', categoria: 'c1', nombre: 'B2', fechaCaducidad: '2020-03-01', paginas: pagina('d') }],
    });
    const destacada = () => nav.ejecutar(`(document.querySelector('.doc-fila.destacada .doc-nombre') || {}).textContent`);
    await nav.ejecutar(`abrirPersona('p1'); guardarVistaDocs('replegado'); 0`);
    await nav.tocar('#aviso-caducado-persona');
    c.igual(await destacada(), 'A1', 'Primer toque (Ana)');
    c(await nav.ejecutar(`document.querySelector('#visor-completo').classList.contains('hidden')`), 'Abrió otra pantalla en vez de desplazarse');
    c(await nav.ejecutar(`!document.querySelector('.doc-fila.destacada').closest('.grupo-documentos').classList.contains('plegado')`), 'No abrió el grupo replegado del documento');
    await nav.tocar('#aviso-caducado-persona');
    c.igual(await destacada(), 'A2', 'Segundo toque (Ana)');
    await nav.ejecutar(`abrirPersona('p2'); 0`);
    await nav.tocar('#aviso-caducado-persona');
    c.igual(await destacada(), 'B1', 'Primer toque en otra persona empieza de cero');
  },
};
