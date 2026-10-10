// Estilo Chicle: dentro de una categoría las personas no llevan color y los documentos salen del color de su categoría.
const pagina = (id) => [{ archivoId: id, mimeType: 'image/png', nombre: id }];
module.exports = {
  nombre: 'Chicle: colores en categorías y personas',
  async prueba({ base, nav, c }) {
    await nav.abrirApp(base, {
      personas: [{ id: 'p1', nombre: 'Ana', icono: 'A' }, { id: 'p2', nombre: 'Luis', icono: 'L' }],
      categorias: [{ id: 'dni', nombre: 'DNI', color: '#3A6EA5' }, { id: 'salud', nombre: 'Salud', color: '#B5651D' }],
      documentos: [
        { id: 'd1', personaId: 'p1', categoria: 'dni', nombre: 'DNI Ana', paginas: pagina('a') },
        { id: 'd2', personaId: 'p2', categoria: 'dni', nombre: 'DNI Luis', paginas: pagina('b') },
        { id: 'd3', personaId: 'p1', categoria: 'salud', nombre: 'Tarjeta Ana', paginas: pagina('c') }],
    }, { documentacion_skin: 'chicle', documentacion_vista_docs: 'desplegado' });
    const colores = (js) => nav.ejecutar(js).then(JSON.parse);

    await nav.ejecutar(`abrirCategoriaGlobal('dni'); 0`); await new Promise((r) => setTimeout(r, 500));
    const cat = await colores(`JSON.stringify({
      titulos: [...document.querySelectorAll('.titulo-grupo')].map((t) => getComputedStyle(t).backgroundColor),
      bordes: [...document.querySelectorAll('.doc-fila')].map((d) => getComputedStyle(d).borderTopColor) })`);
    cat.titulos.forEach((t) => c(t === 'rgba(0, 0, 0, 0)', `El título de una persona lleva color de fondo (${t})`));
    c.igual(cat.bordes.length, 2, 'Documentos de DNI en la categoría');
    cat.bordes.forEach((b) => c.igual(b, 'rgb(58, 110, 165)', 'Borde de un documento de DNI (color de la categoría)'));

    await nav.ejecutar(`abrirPersona('p1'); 0`); await new Promise((r) => setTimeout(r, 500));
    const per = await colores(`JSON.stringify({
      titulos: [...document.querySelectorAll('.titulo-grupo')].map((t) => getComputedStyle(t).backgroundColor),
      bordes: [...document.querySelectorAll('.doc-fila')].map((d) => getComputedStyle(d).borderTopColor) })`);
    c.igual(per.titulos.join('|'), 'rgb(58, 110, 165)|rgb(181, 101, 29)', 'Título de cada categoría con su color');
    c.igual(per.bordes.join('|'), 'rgb(58, 110, 165)|rgb(181, 101, 29)', 'Borde de cada documento con el color de su categoría');
  },
};
