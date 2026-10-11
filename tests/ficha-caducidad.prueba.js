// Ficha de documento: el nombre ocupa toda la línea; los días que faltan van sobre la imagen (esquina inferior derecha).
module.exports = {
  nombre: 'Ficha: nombre libre y días sobre la imagen',
  async prueba({ base, nav, c }) {
    const hoy = new Date(); const en = (d) => { const f = new Date(hoy.getTime() + d * 86400000); return f.toISOString().slice(0, 10); };
    await nav.abrirApp(base, {
      personas: [{ id: 'p1', nombre: 'Marta', icono: 'M' }], categorias: [{ id: 'c1', nombre: 'Coche', color: '#B5651D' }],
      documentos: [
        { id: 'd1', personaId: 'p1', categoria: 'c1', nombre: 'Permiso de conducir muy largo de verdad con nombre larguísimo', fechaCaducidad: en(10), paginas: [{ archivoId: 'x', mimeType: 'image/png', nombre: 'Permiso de conducir muy largo de verdad con nombre larguísimo' }] },
        { id: 'd2', personaId: 'p1', categoria: 'c1', nombre: 'Seguro', fechaCaducidad: en(-5), paginas: [{ archivoId: 'y', mimeType: 'image/png', nombre: 'Seguro' }] },
        { id: 'd3', personaId: 'p1', categoria: 'c1', nombre: 'ITV', fechaCaducidad: en(300), paginas: [{ archivoId: 'z', mimeType: 'image/png', nombre: 'ITV' }] }],
    });
    await nav.ejecutar(`abrirPersona('p1'); 0`); await new Promise((r) => setTimeout(r, 600));
    const r = JSON.parse(await nav.ejecutar(`JSON.stringify([...document.querySelectorAll('.doc-fila')].map((f) => ({ dias: (f.querySelector('.dias-caducidad') || {}).textContent || '', dentroMiniatura: !!f.querySelector('.miniatura .dias-caducidad'), enInfo: !!f.querySelector('.info .badge-mini') })))`));
    c.igual(r.length, 3, 'Tres fichas');
    c(r.every((x) => !x.enInfo), 'Ninguna ficha lleva nada a la derecha del nombre');
    c(r.filter((x) => x.dias).length === 2 && r.filter((x) => x.dias).every((x) => x.dentroMiniatura), 'Solo los dos documentos en aviso o caducados llevan los días, sobre la imagen');
    c(r.some((x) => /^Caducará en \d+ días?$/.test(x.dias)) && r.some((x) => /^Caducó hace \d+ días?$/.test(x.dias)), 'Textos del tipo "Caducará en 10 días" y "Caducó hace 5 días" (encontrados: ' + r.map((x) => x.dias).join(' / ') + ')');
  },
};
