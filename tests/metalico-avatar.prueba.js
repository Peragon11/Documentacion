// Estilo Metálico: la letra de un avatar se recorta con el chaflán del pozo, igual que una foto.
module.exports = {
  nombre: 'Metálico: letra del avatar recortada en el chaflán',
  async prueba({ base, nav, c }) {
    await nav.abrirApp(base, { personas: [{ id: 'p1', nombre: 'Ana', icono: 'M' }], categorias: [], documentos: [] }, { documentacion_skin: 'metalico' });
    const clip = await nav.ejecutar(`getComputedStyle(document.querySelector('.persona-tile .avatar-persona > .img-letra')).clipPath`);
    c(clip && clip.startsWith('polygon('), `La letra no lleva recorte del pozo (clip-path: ${clip})`);
    c(await nav.ejecutar(`(() => { const i = document.querySelector('.persona-tile .avatar-persona > .img-letra'); const r = i.getBoundingClientRect(); const e = document.elementFromPoint(r.right - 2, r.top + 2); return e !== i; })()`), 'La esquina de arriba a la derecha de la letra sigue visible');
  },
};
