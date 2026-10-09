// Nombres con comillas y datos manipulados en una copia: ni se cortan ni se cuelan en el HTML.
module.exports = {
  nombre: 'Comillas en nombres y saneado de copias',
  async prueba({ base, nav, c }) {
    await nav.abrirApp(base, {
      personas: [{ id: 'p1', nombre: 'Ana "la" grande', icono: 'A' }],
      categorias: [{ id: 'c1', nombre: "Cat 'x'", color: '#3A6EA5' }],
      documentos: [{ id: 'd1', personaId: 'p1', categoria: 'c1', nombre: 'DNI "viejo"', paginas: [{ archivoId: 'a', mimeType: 'image/png', nombre: 'Cara "1"' }] }],
    });
    await nav.ejecutar(`abrirRenombrarPersona(datos.personas[0]); 0`);
    c.igual(await nav.ejecutar(`document.querySelector('.modal input[type=search]').value`), 'Ana "la" grande', 'Renombrar persona con comillas');
    await nav.ejecutar(`cerrarModal(); abrirMenuPagina(datos.documentos[0], 0); document.querySelector('#op-renombrar-doc').click(); 0`);
    c.igual(await nav.ejecutar(`document.querySelector('.modal input[type=search]').value`), 'Cara "1"', 'Renombrar página con comillas');
    c.igual(await nav.ejecutar(`escapeHtml(String.fromCharCode(34, 39, 60, 62, 38))`), '&quot;&#39;&lt;&gt;&amp;', 'escapeHtml escapa comillas');

    const saneado = await nav.ejecutar(`JSON.stringify(sanearDatos({
      personas: [{ id: 'x', nombre: 5, foto: "x') ; background:url(javascript:alert(1)", icono: 'Z<b>' }, { id: 'y', nombre: 'ok', foto: 'data:image/jpeg;base64,AAAA', icono: 'M' }],
      categorias: [{ id: 'k', nombre: 'k', color: 'red;background:url(http://malo)' }, { id: 'k2', nombre: 'k2', color: '#A1B2C3' }],
      documentos: [{ id: 'd', nombre: 'n', fechaCaducidad: '"><img>', paginas: [{ nombre: 'p', mimeType: 'text/html" onload="x' }] }] }))`);
    const d = JSON.parse(saneado);
    c(d.personas[0].foto === null && d.personas[0].icono === null && d.personas[0].nombre === '5', 'Persona manipulada no se limpia');
    c(d.personas[1].foto.startsWith('data:image/jpeg') && d.personas[1].icono === 'M', 'Persona buena se estropea al limpiar');
    c(d.categorias[0].color.startsWith('#') && d.categorias[1].color === '#A1B2C3', 'Color de categoría no se limpia');
    c(d.documentos[0].fechaCaducidad === null && d.documentos[0].paginas[0].mimeType === 'application/octet-stream', 'Documento manipulado no se limpia');
  },
};
