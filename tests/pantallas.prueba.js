// Recorre las pantallas principales y comprueba que ninguna lanza errores.
const DATOS = {
  personas: [{ id: 'p1', nombre: 'Ana', icono: 'A' }, { id: 'p2', nombre: 'Luis', icono: 'L' }],
  categorias: [{ id: 'dni', nombre: 'DNI', color: '#4A7BA6' }, { id: 'salud', nombre: 'Salud', color: '#8B4AA6' }],
  documentos: [
    { id: 'd1', personaId: 'p1', nombre: 'Pasaporte', categoria: 'dni', fechaCaducidad: '2020-10-01', paginas: [
      { archivoId: 'i1', mimeType: 'image/jpeg', nombre: 'Pasaporte' }, { archivoId: 'i2', mimeType: 'image/jpeg', nombre: 'Reverso' }] },
    { id: 'd2', personaId: 'p2', nombre: 'Vacunas', categoria: 'salud', paginas: [{ archivoId: 'i3', mimeType: 'application/pdf', nombre: 'Vacunas' }] },
  ],
};
const PASOS = [
  ['inicio personas', `renderizarPantallaInicio()`],
  ['modo categorías', `guardarModoInicio('categorias'); renderizarPantallaInicio()`],
  ['entrar en persona', `abrirPersona('p1')`],
  ['chips de categoría', `renderizarChipsCategorias(); renderizarDocumentos()`],
  ['desplegar', `guardarVistaDocs('desplegado')`],
  ['replegar', `guardarVistaDocs('replegado')`],
  ['entrar en categoría', `abrirCategoriaGlobal('dni')`],
  ['búsqueda', `abrirBusqueda(); renderizarResultadosBusqueda('pas')`],
  ['ajustes', `cerrarModal(); abrirAjustes(false)`],
  ['apariencia', `abrirApariencia()`],
  ['estilos', `abrirEstilos()`],
  ['tamaño del texto', `abrirTamanoTexto()`],
  ['idiomas', `abrirIdiomas()`],
  ['cambiar a inglés', `guardarIdioma('en')`],
  ['cambiar a alemán', `guardarIdioma('de')`],
  ['volver a español', `guardarIdioma('es')`],
  ['administrar categorías', `cerrarModal(); modoEdicionCategorias = true; renderizarCategoriasHome()`],
  ['rueda de color', `abrirRuedaColorCategoria(datos.categorias[0], document.querySelector('.categoria-barra'))`],
  ['menú de página', `cerrarModal(); abrirMenuPagina(datos.documentos[0], 0)`],
  ['actualizar documento', `abrirModalActualizar(datos.documentos[0])`],
  ['menú de galería', `cerrarModal(); abrirMenuGaleria(datos.documentos[0])`],
  ['galería', `cerrarModal(); abrirGaleriaDocumento(datos.documentos[0])`],
  ['visor', `abrirVisor(datos.documentos[0], 0)`],
  ['caducidad', `cerrarModal(); abrirModalCaducidad(datos.documentos[0])`],
  ['categoría del doc', `cerrarModal(); abrirModalCategoriaDoc(datos.documentos[0])`],
  ['subir documento', `cerrarModal(); abrirPersona('p1'); abrirModalSubida()`],
  ['exportar', `cerrarModal(); abrirModalExportar()`],
];
module.exports = {
  nombre: 'Todas las pantallas se abren sin errores',
  async prueba({ base, nav, c }) {
    await nav.abrirApp(base, DATOS);
    for (const [nombre, js] of PASOS) {
      const antes = nav.errores.length;
      try { await nav.ejecutar(`(() => { ${js}; return 0; })()`); } catch (e) { c(false, `${nombre}: ${e.message.split('\n')[0]}`); }
      await new Promise((r) => setTimeout(r, 250));
      c(nav.errores.length === antes, `${nombre}: lanzó un error`);
    }
  },
};
