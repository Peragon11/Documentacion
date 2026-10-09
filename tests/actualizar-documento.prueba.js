// "Actualizar documento": desde el visor de uno caducado, fotos nuevas y fecha nueva sustituyen a las de antes.
module.exports = {
  nombre: 'Actualizar un documento caducado',
  async prueba({ base, nav, c }) {
    await nav.abrirApp(base, {
      personas: [{ id: 'p1', nombre: 'Marta', icono: 'M' }], categorias: [{ id: 'c1', nombre: 'Coche', color: '#B5651D' }],
      documentos: [
        { id: 'd1', personaId: 'p1', categoria: 'c1', nombre: 'Carnet', fechaCaducidad: '2020-06-01', paginas: [{ archivoId: 'viejo0', mimeType: 'image/png', nombre: 'Carnet' }, { archivoId: 'viejo1', mimeType: 'image/png', nombre: 'Reverso' }] },
        { id: 'd2', personaId: 'p1', categoria: 'c1', nombre: 'Seguro', paginas: [{ archivoId: 'x', mimeType: 'image/png', nombre: 'Seguro' }] }],
    });
    await nav.ejecutar(`abrirPersona('p1'); abrirVisor(datos.documentos[1], 0); 0`);
    c(await nav.ejecutar(`!document.querySelector('#visor-actualizar')`), 'Sale la barra de actualizar en un documento sin caducidad');
    await nav.ejecutar(`volverAtras(); 0`); await new Promise((r) => setTimeout(r, 300));
    await nav.ejecutar(`abrirVisor(datos.documentos[0], 0); 0`); await new Promise((r) => setTimeout(r, 500));
    c(await nav.ejecutar(`!!document.querySelector('#visor-actualizar')`), 'Falta la barra de actualizar en un documento caducado');
    await nav.tocar('#visor-ajustes');
    c(await nav.ejecutar(`!!document.querySelector('#op-actualizar-doc')`), 'Falta la opción en el menú del documento');
    await nav.ejecutar(`volverAtras(); 0`); await new Promise((r) => setTimeout(r, 300));
    await nav.tocar('#visor-actualizar');
    c(await nav.ejecutar(`document.querySelector('#modal-guardar-actualizar').classList.contains('inactivo')`), 'Guardar debería estar inactivo sin fotos');
    await nav.ejecutar(`(() => { const inp = document.querySelector('#input-archivo-actualizar'); const dt = new DataTransfer(); dt.items.add(new File(['%PDF-1.4'], 'nuevo.pdf', { type: 'application/pdf' })); inp.files = dt.files; inp.dispatchEvent(new Event('change')); return 0; })()`);
    await nav.ejecutar(`ponerCampoFecha('input-caducidad-actualizar', '2031-05-01'); document.querySelector('#input-caducidad-actualizar').dispatchEvent(new Event('change')); 0`);
    await nav.tocar('#modal-guardar-actualizar');
    await new Promise((r) => setTimeout(r, 1200));
    const doc = JSON.parse(await nav.ejecutar(`JSON.stringify(datos.documentos[0])`));
    c.igual(doc.fechaCaducidad, '2031-05-01', 'Fecha nueva');
    c(doc.paginas.length === 1 && !doc.paginas[0].archivoId.startsWith('viejo') && doc.paginas[0].nombre === 'Carnet', 'Las páginas nuevas sustituyen a las viejas y heredan el nombre');
    c(await nav.ejecutar(`!document.querySelector('#visor-completo').classList.contains('hidden') && !document.querySelector('#visor-actualizar') && !document.querySelector('#seccion-actualizar')`), 'Tras guardar, el visor sigue abierto, sin barra y sin la ventana');
    await nav.ejecutar(`volverAtras(); 0`); await new Promise((r) => setTimeout(r, 400));
    c(await nav.ejecutar(`document.querySelector('#visor-completo').classList.contains('hidden')`), 'Atrás no cierra el visor (pila de navegación descuadrada)');
  },
};
