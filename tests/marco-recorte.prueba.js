// Recorte de documentos: una foto vertical se puede recortar en horizontal (y al revés) sin girarla.
module.exports = {
  nombre: 'Recorte: marco vertical u horizontal',
  async prueba({ base, nav, c }) {
    await nav.abrirApp(base, { personas: [{ id: 'p1', nombre: 'Ana', icono: 'A' }], categorias: [], documentos: [] });
    await nav.ejecutar(`(async () => {
      const lienzo = document.createElement('canvas'); lienzo.width = 600; lienzo.height = 800;
      const x = lienzo.getContext('2d'); const g = x.createLinearGradient(0, 0, 600, 800); g.addColorStop(0, '#d9c9a8'); g.addColorStop(1, '#7a8fa6'); x.fillStyle = g; x.fillRect(0, 0, 600, 800);
      const blob = await new Promise((r) => lienzo.toBlob(r, 'image/jpeg', .9));
      abrirModal('<div id="zona-prueba"></div>');
      window.__salida = null;
      montarRecorteDocumento(document.querySelector('#zona-prueba'), new File([blob], 'vertical.jpg', { type: 'image/jpeg' }), { onConfirmar: (f) => { window.__salida = f; }, onCancelar: () => {} });
      return 0; })()`);
    await new Promise((r) => setTimeout(r, 6000)); // deja terminar la búsqueda automática de bordes (no encuentra ninguno)
    const marco = () => nav.ejecutar(`(() => { const m = document.querySelector('#recorte-marco'); return { ancho: m.offsetWidth, alto: m.offsetHeight }; })()`);
    const texto = () => nav.ejecutar(`document.querySelector('#recorte-orientacion').textContent.trim()`);
    let m = await marco();
    c(m.alto > m.ancho, `Una foto vertical debe empezar con marco vertical (${m.ancho}x${m.alto})`);
    c.igual(await texto(), 'Cambiar a marco horizontal', 'Texto del botón con marco vertical');

    await nav.tocar('#recorte-orientacion');
    m = await marco();
    c(m.ancho > m.alto, `Tras pulsar, el marco debe ser horizontal (${m.ancho}x${m.alto})`);
    c.igual(await texto(), 'Cambiar a marco vertical', 'Texto del botón con marco horizontal');
    const cubre = await nav.ejecutar(`(() => { const i = document.querySelector('#recorte-marco img'), m = document.querySelector('#recorte-marco').getBoundingClientRect(), r = i.getBoundingClientRect(); return r.left <= m.left + 1 && r.top <= m.top + 1 && r.right >= m.right - 1 && r.bottom >= m.bottom - 1; })()`);
    c(cubre, 'La foto no cubre el marco horizontal (quedan huecos)');
    await nav.foto(require('path').join(require('os').tmpdir(), 'marco-horizontal.png'));

    await nav.tocar('#recorte-giro-der');
    m = await marco();
    c(m.alto > m.ancho, `Girar 90° con el marco horizontal debe dar marco vertical (${m.ancho}x${m.alto})`);
    await nav.tocar('#recorte-orientacion');
    await nav.tocar('#recorte-guardar');
    await new Promise((r) => setTimeout(r, 1200));
    const dims = await nav.ejecutar(`(async () => { if (!window.__salida) return null; const b = await createImageBitmap(window.__salida); return { ancho: b.width, alto: b.height }; })()`);
    c(dims && dims.ancho > dims.alto, `El recorte guardado debe salir horizontal (${JSON.stringify(dims)})`);
  },
};
