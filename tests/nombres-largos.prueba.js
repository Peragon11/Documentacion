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
      // Las personas con nombre largo ocupan más líneas, pero sin pisar la ficha de debajo (ni los botones de editar en el modo administrar)
      for (const editar of [false, true]) {
        await nav.ejecutar(`modoEdicionPersonas = ${editar}; renderizarPantallaInicio(); 0`);
        await espera(500);
        const solapes = await nav.ejecutar(`(() => {
          const fichas = [...document.querySelectorAll('#grid-personas .persona-tile')]; const malos = [];
          fichas.forEach((f, i) => {
            const n = f.querySelector('.nombre-persona'); if (!n) return; const nb = n.getBoundingClientRect().bottom;
            const acc = f.querySelector('.acciones-persona-tile'); if (acc && acc.getBoundingClientRect().top < nb - 0.5) malos.push('el nombre pisa los botones de la ficha ' + (i + 1));
            const sig = fichas[i + 2]; if (sig && sig.querySelector('.avatar-persona').getBoundingClientRect().top < nb + 10) malos.push('la ficha ' + (i + 3) + ' queda a menos de 10px del nombre de la ' + (i + 1));
            if (n.scrollHeight > n.clientHeight + 2) malos.push('el nombre de la ficha ' + (i + 1) + ' está cortado');
          });
          return malos; })()`);
        solapes.forEach((m) => c(false, `${skin} ${pct}%${editar ? ' (administrar)' : ''}: ${m}`));
      }
      await nav.ejecutar(`modoEdicionPersonas = false; 0`);
    }
  },
};
