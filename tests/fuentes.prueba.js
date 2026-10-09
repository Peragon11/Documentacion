// Las letras de cada estilo salen de la carpeta fuentes/ de la app, sin pedir nada a Google.
const CASOS = {
  clasico: ['Poppins', 'Source Serif 4'], pasaporte: ['Cinzel', 'Cormorant Garamond', 'Lato'], carpeta: ['Special Elite', 'Bitter'],
  nordico: ['Outfit', 'Josefin Sans'], bosque: ['Fraunces', 'Nunito'], pixeles: ['Press Start 2P', 'Silkscreen', 'Pixelify Sans'],
  neon: ['Orbitron', 'Rajdhani', 'Yellowtail'], chicle: ['Fredoka', 'Bagel Fat One'], comic: ['Bangers', 'Comic Neue', 'Luckiest Guy'],
  metalico: ['Orbitron', 'Share Tech Mono'],
};
module.exports = {
  nombre: 'Letras propias en todos los estilos',
  async prueba({ base, nav, c }) {
    await nav.abrirApp(base, { personas: [{ id: 'p1', nombre: 'Ana Ñúñez', icono: 'A' }], categorias: [], documentos: [] });
    for (const [skin, familias] of Object.entries(CASOS)) {
      await nav.ejecutar(`guardarSkin('${skin}'); 0`);
      const cargadas = await nav.ejecutar(`(async () => {
        const hoja = document.getElementById('fuentes-skin-${skin}');
        for (let i = 0; hoja && !hoja.sheet && i < 50; i++) await new Promise((r) => setTimeout(r, 100));
        await Promise.all(${JSON.stringify(familias)}.map((f) => Promise.all(['400', '500', '600', '700', '800'].map((w) => document.fonts.load(w + ' 16px "' + f + '"', 'Añ')))));
        return [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family.replace(/"/g, ''));
      })()`);
      familias.forEach((f) => c(cargadas.includes(f), `${skin}: no carga la letra ${f}`));
    }
    c.igual(nav.peticiones.filter((u) => /fonts\.(googleapis|gstatic)\.com/.test(u)).length, 0, 'Peticiones a Google Fonts');
  },
};
