// Margen de aviso por documento: 60 días por defecto, o el que se elija al poner la caducidad.
module.exports = {
  nombre: 'Margen de aviso de caducidad por documento',
  async prueba({ base, nav, c }) {
    const en = (d) => new Date(Date.now() + d * 86400000).toISOString().slice(0, 10);
    const espera = (ms) => new Promise((r) => setTimeout(r, ms));
    await nav.abrirApp(base, {
      personas: [{ id: 'p1', nombre: 'Marta', icono: 'M' }], categorias: [{ id: 'c1', nombre: 'Coche', color: '#B5651D' }],
      documentos: [
        { id: 'd1', personaId: 'p1', categoria: 'c1', nombre: 'Normal', fechaCaducidad: en(45), paginas: [{ archivoId: 'a', mimeType: 'image/png', nombre: 'Normal' }] },
        { id: 'd2', personaId: 'p1', categoria: 'c1', nombre: 'Corto', fechaCaducidad: en(45), avisoDias: 30, paginas: [{ archivoId: 'b', mimeType: 'image/png', nombre: 'Corto' }] },
        { id: 'd3', personaId: 'p1', categoria: 'c1', nombre: 'Largo', fechaCaducidad: en(100), avisoDias: 180, paginas: [{ archivoId: 'c', mimeType: 'image/png', nombre: 'Largo' }] },
        { id: 'd4', personaId: 'p1', categoria: 'c1', nombre: 'Lejos', fechaCaducidad: en(100), paginas: [{ archivoId: 'd', mimeType: 'image/png', nombre: 'Lejos' }] }],
    });
    const estados = JSON.parse(await nav.ejecutar(`JSON.stringify(datos.documentos.map((d) => (calcularBadgeCaducidad(d.fechaCaducidad, diasAvisoDe(d)) || {}).estado || 'nada'))`));
    c.igual(estados.join(','), 'aviso,nada,aviso,nada', 'A 45 días avisa con 60 (por defecto) pero no con 30; a 100 días avisa con 180 pero no con 60');
    // Se elige el margen al poner la caducidad de un documento
    await nav.ejecutar(`abrirPersona('p1'); abrirModalCaducidad(datos.documentos[3]); 0`); await espera(300);
    c.igual(await nav.ejecutar(`document.querySelector('#input-aviso-doc [aria-checked="true"]').dataset.valor`), '60', 'El margen por defecto es 60 días');
    await nav.ejecutar(`document.querySelector('#input-aviso-doc [data-valor="180"]').click(); document.querySelector('#modal-guardar-caducidad').click(); 0`); await espera(600);
    c.igual(await nav.ejecutar(`datos.documentos[3].avisoDias`), 180, 'El margen elegido se guarda en el documento');
    // Y también al subir uno nuevo
    await nav.ejecutar(`abrirModalSubida(); 0`); await espera(300);
    c.igual(await nav.ejecutar(`document.querySelector('#input-aviso [aria-checked="true"]').dataset.valor`), '60', 'Al subir, el margen por defecto es 60 días');
  },
};
