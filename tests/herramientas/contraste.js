// Revisión de contraste: en cada estilo, modo claro/oscuro y pantalla principal, mide cada texto visible contra el
// fondo REAL que tiene debajo (mediana de los píxeles de una captura, así sirve con fondos de imagen) y lista los
// que quedan por debajo de 4.5 (o de 3 en texto grande). No es una prueba de aprobado/suspenso: es para revisar.
// Uso: node tests/herramientas/contraste.js [estilos separados por comas] [claro,oscuro] [pantallas]
const { iniciarServidor, abrirNavegador, espera } = require('../comun');
const SKINS = (process.argv[2] || 'clasico,pasaporte,carpeta,nordico,pixeles,neon,chicle,bosque,comic,metalico').split(',');
const TEMAS = (process.argv[3] || 'oscuro,claro').split(',');
const SOLO = process.argv[4] ? process.argv[4].split(',') : null;
(async () => {
  const servidor = await iniciarServidor();
  const nav = await abrirNavegador();
  const { enviar, ejecutar } = nav; const avisos = nav.errores;
  await enviar('Emulation.setDeviceMetricsOverride', { width: 412, height: 860, deviceScaleFactor: 1, mobile: true });
  const pg = (n) => Array.from({ length: n }, (_, i) => ({ archivoId: 'f' + i + Math.random(), mimeType: 'image/png', nombre: 'Cara ' + (i + 1) }));
  const DATOS = JSON.stringify({ personas: [{ id: 'p1', nombre: 'Marta', icono: 'M' }, { id: 'p2', nombre: 'Ana' }, { id: 'p3', nombre: 'Luis', icono: 'L' }],
    categorias: [{ id: 'c1', nombre: 'Identidad', color: '#3A6EA5' }, { id: 'c2', nombre: 'Salud', color: '#8A4F7D' }, { id: 'c3', nombre: 'Coche', color: '#B5651D' }],
    documentos: [{ id: 'd1', personaId: 'p1', categoria: 'c1', nombre: 'DNI', paginas: pg(2) }, { id: 'd2', personaId: 'p1', categoria: 'c1', nombre: 'Pasaporte', fechaCaducidad: '2099-01-01', paginas: pg(1) },
      { id: 'd3', personaId: 'p1', categoria: 'c2', nombre: 'Tarjeta sanitaria', fechaCaducidad: '2026-01-01', paginas: pg(1) }, { id: 'd4', personaId: 'p2', categoria: 'c1', nombre: 'DNI', paginas: pg(1) }, { id: 'd5', personaId: 'p3', categoria: 'c3', nombre: 'Carnet', paginas: pg(1) }] });
  let PANTALLAS = [
    ['inicio', ''],
    ['inicio-cat', 'alternarVistaInicio();'],
    ['persona', "abrirPersona(datos.personas[0].id); guardarVistaDocs('desplegado'); sincronizarBarraInferior();"],
    ['categoria', "abrirCategoriaGlobal('c1');"],
    ['subir', "abrirCategoriaGlobal('c1'); abrirModalSubida();"],
    ['ajustes', 'abrirAjustes(false);'],
  ];
  if (SOLO) PANTALLAS = PANTALLAS.filter((p) => SOLO.includes(p[0]));
  const informe = {};
  for (const tema of TEMAS) for (const skin of SKINS) for (const [nombreP, js] of PANTALLAS) {
    await enviar('Page.navigate', { url: 'about:blank' }); await espera(100);
    const fuente = `localStorage.clear(); localStorage.setItem('documentacion_idioma','es'); localStorage.setItem('documentacion_skin','${skin}'); localStorage.setItem('documentacion_tema','${tema}');
      localStorage.setItem('documentacion_aviso_sin_nube', JSON.stringify({ ultimo: Date.now(), nunca: true })); localStorage.setItem('documentacion_tuto_personas','1');
      localStorage.setItem('documentacion_datos_cache', ${JSON.stringify(DATOS)});`;
    const { identifier } = await enviar('Page.addScriptToEvaluateOnNewDocument', { source: fuente });
    await enviar('Page.navigate', { url: servidor.base + 'index.html' });
    await espera(1300);
    await enviar('Page.removeScriptToEvaluateOnNewDocument', { identifier });
    await ejecutar(`window.obtenerBlobPagina = async () => new Blob(['<svg xmlns="http://www.w3.org/2000/svg" width="320" height="200"><rect width="320" height="200" fill="#cdd6e0"/></svg>'], {type:'image/svg+xml'}); 0`);
    if (js) { try { await ejecutar(`(async()=>{ ${js} })()`); } catch (e) { console.log('ERR', skin, nombreP, e.message.split('\n')[0]); } }
    await espera(900);
    const shot = await enviar('Page.captureScreenshot', { format: 'png' });
    const res = await ejecutar(`(async () => {
      const im = new Image(); im.src = 'data:image/png;base64,${shot.data}'; await im.decode();
      const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const x = c.getContext('2d'); x.drawImage(im, 0, 0);
      const lin = (v) => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); };
      const lum = (r, g, b) => .2126 * lin(r) + .7152 * lin(g) + .0722 * lin(b);
      const ratio = (a, b) => (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
      const out = [];
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      const vistos = new Set();
      while (walker.nextNode()) {
        const t = walker.currentNode; if (!t.textContent.trim()) continue;
        const el = t.parentElement; if (vistos.has(el)) continue; vistos.add(el);
        const cs = getComputedStyle(el);
        if (cs.visibility === 'hidden') continue;
        const rg = document.createRange(); rg.selectNodeContents(t); const r = rg.getBoundingClientRect();
        if (r.width < 4 || r.height < 4 || r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) continue;
        const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        const top = document.elementFromPoint(cx, cy); if (!top || !(el.contains(top) || top.contains(el))) continue;
        const m = cs.color.match(/[0-9.]+/g).map(Number); const ta = m[3] ?? 1;
        let op = ta; for (let e = el; e; e = e.parentElement) op *= +getComputedStyle(e).opacity;
        if (op < .05) continue;
        const x0 = Math.max(0, Math.floor(r.left - 3)), y0 = Math.max(0, Math.floor(r.top - 2));
        const w = Math.max(1, Math.min(c.width - x0, Math.ceil(r.width + 6))), h = Math.max(1, Math.min(c.height - y0, Math.ceil(r.height + 4)));
        const d = x.getImageData(x0, y0, w, h).data;
        const ls = [];
        for (let i = 0; i < d.length; i += 4) ls.push(lum(d[i], d[i + 1], d[i + 2]));
        ls.sort((a, b) => a - b);
        const fondo = ls[Math.floor(ls.length * .5)];
        const lt = lum(m[0], m[1], m[2]) * op + fondo * (1 - op);
        const cr = ratio(lt, fondo);
        const tam = parseFloat(cs.fontSize), grueso = +cs.fontWeight >= 700;
        const grande = tam >= 24 || (tam >= 18.66 && grueso);
        const cls = (e) => (typeof e.className === 'string' && e.className.trim()) ? '.' + e.className.trim().split(/\\s+/).join('.') : '';
        out.push({ sel: el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + cls(el) + ' < ' + el.parentElement.tagName.toLowerCase() + cls(el.parentElement), txt: t.textContent.trim().slice(0, 24), cr: +cr.toFixed(2), grande });
      }
      return out;
    })()`);
    for (const o of res) {
      if (o.cr < (o.grande ? 3 : 4.5)) {
        const k = o.sel; informe[k] = informe[k] || []; informe[k].push(`${tema}/${skin}/${nombreP} "${o.txt}" ${o.cr}`);
      }
    }
  }
  const claves = Object.keys(informe).sort((a, b) => informe[b].length - informe[a].length);
  for (const k of claves) { console.log('\n## ' + k + '  (' + informe[k].length + ')'); informe[k].sort((a, b) => parseFloat(a.split(' ').pop()) - parseFloat(b.split(' ').pop())).slice(0, 8).forEach((l) => console.log('   ' + l)); if (informe[k].length > 8) console.log('   ...'); }
  console.log('\navisos:', avisos.length ? [...new Set(avisos)].slice(0, 5).join(' | ') : '(ninguno)');
  nav.cerrar(); servidor.cerrar(); process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
