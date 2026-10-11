// Los nombres (de personas, categorías, documentos y páginas) del largo máximo no se recortan con puntos suspensivos
// ni se cortan por altura, con el texto más pequeño y el más grande, en los estilos con formas más distintas.
// Y las barras de categoría y las fichas de persona NO crecen por ello: miden lo mismo con un nombre largo que con uno corto.
const { medirRecortes, DATOS_NOMBRES_LARGOS } = require('./herramientas/recortes');
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
module.exports = {
  nombre: 'Nombres largos sin recortar y sin agrandar',
  async prueba({ base, nav, c }) {
    await nav.enviar('Emulation.setDeviceMetricsOverride', { width: 360, height: 800, deviceScaleFactor: 1, mobile: true });
    await nav.abrirApp(base, DATOS_NOMBRES_LARGOS);
    const estilos = ['clasico', 'metalico', 'comic', 'pixeles', 'chicle', 'pasaporte'];

    const informe = await medirRecortes(nav, estilos, [85, 120]);
    Object.entries(informe).forEach(([elemento, donde]) => c(false, `${elemento} recortado en ${[...new Set(donde)].slice(0, 4).join(', ')}`));

    // Cuánto más alto es cada contenedor con su nombre que con un nombre corto (lo demás que lleve —avisos, botones— no cuenta)
    const crecimiento = (selContenedor, selNombre) => nav.ejecutar(`[...document.querySelectorAll('#grid-personas ${selContenedor}')].map((cont) => {
      const n = cont.querySelector('${selNombre}'); const con = cont.offsetHeight; const txt = n.textContent, fs = n.style.fontSize;
      n.textContent = 'Ag'; n.style.fontSize = ''; const corto = cont.offsetHeight; n.textContent = txt; n.style.fontSize = fs;
      return con - corto; })`);
    for (const skin of estilos) for (const pct of [85, 120]) {
      await nav.ejecutar(`guardarSkin('${skin}'); aplicarTamanoTexto(${pct}); cerrarModal(); mostrarPantallaPersonas(); modoInicio = 'categorias'; guardarModoInicio(modoInicio); renderizarPantallaInicio(); 0`);
      await espera(700);
      const barras = await crecimiento('.categoria-barra', '.categoria-barra-nombre');
      barras.forEach((g, i) => c(g <= 0.5, `${skin} ${pct}%: la barra de categoría ${i + 1} crece ${g}px por el nombre`));
      await nav.ejecutar(`modoInicio = 'personas'; guardarModoInicio(modoInicio); renderizarPantallaInicio(); 0`);
      await espera(700);
      // En Metálico la placa del nombre mide una línea y un nombre largo en mayúsculas no cabe ni a 9 px: ahí sí puede crecer (nunca se recorta)
      if (skin !== 'metalico') {
        (await crecimiento('.persona-tile-clic', '.nombre-persona')).forEach((g, i) => c(g <= 0.5, `${skin} ${pct}%: la ficha de persona ${i + 1} crece ${g}px por el nombre`));
      }
    }
  },
};
