// Replegar deja solo los títulos de las categorías; tocar uno lo abre; Desplegar abre todos.
const pg = (n) => Array.from({ length: n }, (_, i) => ({ archivoId: 'f' + i + Math.random(), mimeType: 'image/png', nombre: 'Cara ' + (i + 1) }));
module.exports = {
  nombre: 'Desplegar y replegar categorías',
  async prueba({ base, nav, c }) {
    await nav.abrirApp(base, {
      personas: [{ id: 'p1', nombre: 'Marta', icono: 'M' }],
      categorias: [{ id: 'c1', nombre: 'Identidad', color: '#3A6EA5' }, { id: 'c2', nombre: 'Salud', color: '#8A4F7D' }],
      documentos: [{ id: 'd1', personaId: 'p1', categoria: 'c1', nombre: 'DNI', paginas: pg(2) }, { id: 'd2', personaId: 'p1', categoria: 'c2', nombre: 'Tarjeta', paginas: pg(1) }],
    }, { documentacion_vista_docs: 'replegado' });
    await nav.tocar('.persona-tile .avatar-persona');
    const estado = () => nav.ejecutar(`[...document.querySelectorAll('#contenido-documentos .grupo-documentos')].map((g) => g.classList.contains('plegado') ? 'cerrado' : g.querySelectorAll('.doc-fila').length).join(',')`);
    c.igual(await estado(), 'cerrado,cerrado', 'Al entrar replegado');
    c(await nav.ejecutar(`!document.querySelector('.titulo-grupo .cuenta-grupo')`), 'Los títulos no deberían llevar número');
    await nav.tocar('#contenido-documentos .grupo-documentos:nth-child(1) .titulo-grupo');
    c.igual(await estado(), '2,cerrado', 'Tocar Identidad abre solo esa, con cada página en su ficha');
    await nav.tocar('#bar-vista');
    c.igual(await estado(), '2,1', 'Desplegar abre todas');
    c.igual(await nav.ejecutar(`document.querySelector('#bar-vista').textContent.trim()`), 'Replegar', 'Texto del botón');
    await nav.tocar('#contenido-documentos .grupo-documentos:nth-child(2) .titulo-grupo');
    c.igual(await estado(), '2,cerrado', 'En desplegado, tocar un título lo cierra');
  },
};
