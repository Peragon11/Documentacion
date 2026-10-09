// Las maquetas de Estilos son la portada real de cada estilo (en vertical) y las de Apariencia llevan los colores reales.
module.exports = {
  nombre: 'Maquetas de Estilo y Apariencia',
  async prueba({ base, nav, c }) {
    await nav.abrirApp(base, { personas: [{ id: 'p1', nombre: 'Ana', icono: 'A' }], categorias: [], documentos: [] });
    await nav.ejecutar(`abrirEstilos(); 0`);
    await new Promise((r) => setTimeout(r, 4000));
    const marcos = JSON.parse(await nav.ejecutar(`JSON.stringify([...document.querySelectorAll('.mq-estilo iframe')].map((f) => {
      const d = f.contentDocument; const b = d.querySelector('#bar-buscar');
      return { skin: d.documentElement.getAttribute('data-skin') || 'clasico', barra: getComputedStyle(d.querySelector('.barra-inferior')).display,
        vertical: d.defaultView.matchMedia('(orientation: portrait)').matches, persona: (d.querySelector('.nombre-persona') || {}).textContent,
        iconoEncima: getComputedStyle(b).flexDirection };
    }))`));
    c.igual(marcos.length, 10, 'Número de maquetas de estilo');
    marcos.forEach((m) => {
      c(m.barra === 'block' && m.vertical && m.persona === 'Ana', `Estilo ${m.skin}: la maqueta no es la portada en vertical`);
      c(m.iconoEncima === 'column', `Estilo ${m.skin}: los botones de abajo no llevan el icono encima del texto`);
    });
    await nav.ejecutar(`abrirApariencia(); 0`);
    await new Promise((r) => setTimeout(r, 2000));
    const claro = await nav.ejecutar(`document.querySelector('.mqa-capa.modo-claro').style.getPropertyValue('--ink')`);
    const oscuro = await nav.ejecutar(`document.querySelector('.mqa-capa.modo-oscuro').style.getPropertyValue('--ink')`);
    c(claro && oscuro && claro !== oscuro, 'Apariencia: las miniaturas no tienen los colores reales de cada modo');
  },
};
