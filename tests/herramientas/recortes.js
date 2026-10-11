// Busca nombres recortados (con puntos suspensivos, o cortados por altura) en todos los estilos y tamaños de texto,
// con los nombres más largos que admite la app (LIMITE_NOMBRE = 30 caracteres), con y sin espacios.
// Uso: node tests/herramientas/recortes.js [estilos separados por comas] [tamaños separados por comas]
// También lo usa tests/nombres-largos.prueba.js con menos combinaciones.
const { iniciarServidor, abrirNavegador, espera } = require('../comun');
const TODOS_LOS_ESTILOS = 'clasico,pasaporte,carpeta,nordico,bosque,pixeles,neon,chicle,comic,metalico'.split(',');
// Elementos que enseñan un nombre escrito por el usuario
const SELECTORES = ['.categoria-barra-nombre', '#titulo-topbar', '.nombre-persona', '.op-nombre', '.opcion-categoria', '.titulo-grupo', '.doc-nombre',
  '.fila-accion strong', '.fila-accion small', '.badge-mini', '.galeria-pagina-nombre', '.chip', '.titulo-menu', '.ajustes-titulo'];
const LARGO = 'Documentación administrativa importante'.slice(0, 30); // con espacios
const ANCHO = 'W'.repeat(30); // sin espacios y con las letras más anchas
const pagina = (id, n) => [{ archivoId: id, mimeType: 'image/png', nombre: n }];
const DATOS_NOMBRES_LARGOS = {
  personas: [{ id: 'p1', nombre: LARGO, icono: 'A' }, { id: 'p2', nombre: ANCHO, icono: 'B' }, { id: 'p3', nombre: 'Eva', icono: 'E' }],
  categorias: [{ id: 'c1', nombre: LARGO, color: '#3A6EA5' }, { id: 'c2', nombre: ANCHO, color: '#B5651D' }, { id: 'c3', nombre: 'DNI', color: '#8A4F7D' }],
  documentos: [
    { id: 'd1', personaId: 'p1', categoria: 'c1', nombre: LARGO, fechaCaducidad: '2020-01-01', paginas: [...pagina('a', LARGO), ...pagina('b', ANCHO)] },
    { id: 'd2', personaId: 'p2', categoria: 'c2', nombre: ANCHO, paginas: pagina('c', ANCHO) }],
};
const PANTALLAS = [
  ['inicio personas', `mostrarPantallaPersonas(); modoInicio = 'personas'; guardarModoInicio(modoInicio); modoEdicionCategorias = false; renderizarPantallaInicio()`],
  ['inicio categorías', `mostrarPantallaPersonas(); modoInicio = 'categorias'; guardarModoInicio(modoInicio); modoEdicionCategorias = false; renderizarPantallaInicio()`],
  ['administrar categorías', `mostrarPantallaPersonas(); modoInicio = 'categorias'; guardarModoInicio(modoInicio); modoEdicionCategorias = true; renderizarPantallaInicio()`],
  ['persona', `modoEdicionCategorias = false; abrirPersona('p1'); guardarVistaDocs('desplegado')`],
  ['categoría', `abrirCategoriaGlobal('c2'); guardarVistaDocs('desplegado')`],
  ['subir documento', `abrirCategoriaGlobal('c1'); abrirModalSubida()`],
  ['cambiar categoría', `abrirModalCategoriaDoc(datos.documentos[0])`],
  ['galería', `abrirGaleriaDocumento(datos.documentos[0])`],
  ['menú de página', `abrirMenuPagina(datos.documentos[0], 1)`],
  ['menú de galería', `abrirMenuGaleria(datos.documentos[0])`],
];

// nav ya debe tener la app abierta con DATOS_NOMBRES_LARGOS. Devuelve { elemento: [ 'estilo/tamaño/pantalla', ... ] }
async function medirRecortes(nav, estilos, tamanos) {
  const informe = {};
  for (const skin of estilos) for (const pct of tamanos) {
    await nav.ejecutar(`guardarSkin('${skin}'); aplicarTamanoTexto(${pct}); 0`);
    for (const [nombre, js] of PANTALLAS) {
      await nav.ejecutar(`(() => { cerrarModal(); $('#visor-completo').classList.add('hidden'); ${js}; return 0; })()`).catch((e) => { (informe['ERROR ' + nombre] = informe['ERROR ' + nombre] || []).push(e.message.split('\n')[0]); });
      await espera(500);
      const res = await nav.ejecutar(`(() => {
        const cortados = [];
        document.querySelectorAll(${JSON.stringify(SELECTORES.join(','))}).forEach((el) => {
          const r = el.getBoundingClientRect(); if (!r.width || !r.height) return;
          const cs = getComputedStyle(el); if (cs.visibility === 'hidden') return;
          if (el.matches('#titulo-topbar.centrado')) return; // el nombre de la app, no un nombre escrito por el usuario
          // fila de botones con desplazamiento horizontal: no se recorta, se desliza
          if (el.matches('.chip') && el.parentElement.scrollWidth > el.parentElement.clientWidth) return;
          const ancho = el.scrollWidth > el.clientWidth + 2, alto = el.scrollHeight > el.clientHeight + 2;
          const puntos = cs.textOverflow === 'ellipsis' && ancho;
          if (puntos || (alto && (cs.overflow === 'hidden' || cs.overflowY === 'hidden'))) cortados.push(el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + '.' + String(el.className).trim().split(/\\s+/)[0]);
        });
        return cortados;
      })()`);
      res.forEach((e) => { (informe[e] = informe[e] || []).push(`${skin}/${pct}%/${nombre}`); });
    }
  }
  return informe;
}

module.exports = { medirRecortes, DATOS_NOMBRES_LARGOS, TODOS_LOS_ESTILOS };

if (require.main === module) {
  (async () => {
    const estilos = process.argv[2] ? process.argv[2].split(',') : TODOS_LOS_ESTILOS;
    const tamanos = (process.argv[3] || '85,100,120').split(',').map(Number);
    const servidor = await iniciarServidor();
    const nav = await abrirNavegador({ ancho: 360, alto: 800 });
    await nav.abrirApp(servidor.base, DATOS_NOMBRES_LARGOS);
    const informe = await medirRecortes(nav, estilos, tamanos);
    const claves = Object.keys(informe).sort();
    claves.forEach((k) => { const v = [...new Set(informe[k])]; console.log(`\n## ${k}  (${v.length})`); v.slice(0, 6).forEach((x) => console.log('   ' + x)); if (v.length > 6) console.log('   …'); });
    console.log('\nExcepciones en la app:', nav.errores.length ? nav.errores.slice(0, 3).join(' | ') : '(ninguna)');
    console.log(claves.length ? '\nHay nombres recortados.' : '\nNingún nombre recortado.');
    nav.cerrar(); servidor.cerrar();
    process.exit(claves.length ? 1 : 0);
  })().catch((e) => { console.error(e); process.exit(1); });
}
