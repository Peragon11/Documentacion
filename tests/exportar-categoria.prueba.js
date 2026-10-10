// Dentro de una categoría el botón de abajo es "Exportar": genera un archivo con los documentos de esa categoría de
// TODAS las personas que los tengan (y solo esos), y el archivo se puede importar después.
const pagina = (id) => [{ archivoId: id, mimeType: 'image/png', nombre: id }];
const DATOS = {
  personas: [{ id: 'p1', nombre: 'Ana', icono: 'A' }, { id: 'p2', nombre: 'Luis', icono: 'L' }, { id: 'p3', nombre: 'Eva', icono: 'E' }],
  categorias: [{ id: 'dni', nombre: 'DNI', color: '#3A6EA5' }, { id: 'salud', nombre: 'Salud', color: '#8A4F7D' }],
  documentos: [
    { id: 'd1', personaId: 'p1', categoria: 'dni', nombre: 'DNI Ana', paginas: pagina('f1') },
    { id: 'd2', personaId: 'p2', categoria: 'dni', nombre: 'DNI Luis', paginas: pagina('f2') },
    { id: 'd3', personaId: 'p1', categoria: 'salud', nombre: 'Tarjeta Ana', paginas: pagina('f3') },
    { id: 'd4', personaId: 'p3', categoria: 'salud', nombre: 'Tarjeta Eva', paginas: pagina('f4') },
  ],
};
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
module.exports = {
  nombre: 'Exportar los documentos de una categoría',
  async prueba({ base, nav, c }) {
    await nav.abrirApp(base, DATOS);
    // los archivos de las páginas (bytes sueltos) para que la exportación tenga qué empaquetar
    await nav.ejecutar(`window.obtenerBlobPagina = async (p) => new Blob([p.archivoId + '-contenido']); 0`);

    await nav.ejecutar(`abrirCategoriaGlobal('dni'); 0`); await espera(300);
    c.igual(await nav.ejecutar(`document.querySelector('#bar-ajustes').textContent.trim()`), 'Exportar', 'Texto del botón de abajo dentro de una categoría');
    await nav.tocar('#bar-ajustes');
    c(await nav.ejecutar(`document.querySelector('.modal h3').textContent.includes('DNI')`), 'La ventana de exportar no nombra la categoría');
    // con un filtro de persona puesto, igualmente van todas las personas
    const paquete = JSON.parse(await nav.ejecutar(`(async () => {
      personaFiltroActiva = 'p1';
      const bytes = await generarArchivoExportacion(null, 'dni');
      const p = leerPaqueteExportacion(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
      return JSON.stringify({ docs: p.documentos.map((d) => d.nombre), personas: p.personas.map((x) => x.nombre), categorias: p.categorias.map((x) => x.nombre),
        contenido: p.archivos.map((a) => a.map((b) => new TextDecoder().decode(b))) });
    })()`));
    c.igual(paquete.docs.join(','), 'DNI Ana,DNI Luis', 'Documentos del archivo');
    c.igual(paquete.personas.join(','), 'Ana,Luis', 'Personas del archivo (solo las que tienen esa categoría)');
    c.igual(paquete.categorias.join(','), 'DNI', 'Categorías del archivo');
    c.igual(JSON.stringify(paquete.contenido), JSON.stringify([['f1-contenido'], ['f2-contenido']]), 'Contenido de cada página');

    // una categoría sin documentos avisa y no genera nada
    await nav.ejecutar(`volverAtras(); 0`); await espera(300);
    await nav.ejecutar(`datos.categorias.push({ id: 'vacia', nombre: 'Vacía', color: '#111111' }); abrirCategoriaGlobal('vacia'); 0`); await espera(300);
    await nav.tocar('#bar-ajustes');
    await nav.tocar('#btn-generar-exportacion');
    c(await nav.ejecutar(`!document.querySelector('#toast').classList.contains('hidden') && document.querySelector('#toast').textContent.includes('Vacía')`), 'No avisa de que la categoría no tiene documentos');

    // en una persona sigue exportando solo lo suyo
    const soloAna = JSON.parse(await nav.ejecutar(`(async () => {
      const bytes = await generarArchivoExportacion('p1');
      const p = leerPaqueteExportacion(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
      return JSON.stringify({ docs: p.documentos.map((d) => d.nombre), personas: p.personas.map((x) => x.nombre) });
    })()`));
    c.igual(soloAna.docs.join(',') + '|' + soloAna.personas.join(','), 'DNI Ana,Tarjeta Ana|Ana', 'Exportar una persona');
  },
};
