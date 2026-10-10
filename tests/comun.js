// Utilidades compartidas por las pruebas: un servidor local con la app y un Edge/Chrome sin ventana
// manejado por el protocolo de depuración (CDP), con toques de dedo de verdad.
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');

const RAIZ = path.resolve(__dirname, '..');
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

function rutaNavegador() {
  const candidatos = [
    process.env.NAVEGADOR,
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    '/usr/bin/google-chrome', '/usr/bin/chromium', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ].filter(Boolean);
  const r = candidatos.find((c) => fs.existsSync(c));
  if (!r) throw new Error('No encuentro Edge ni Chrome. Indica la ruta con la variable NAVEGADOR.');
  return r;
}

const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json',
  '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
function iniciarServidor() {
  return new Promise((ok) => {
    const srv = http.createServer((req, res) => {
      let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      if (p === '/') p = '/index.html';
      const f = path.normalize(path.join(RAIZ, p));
      if (!f.startsWith(RAIZ) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { 'Content-Type': TIPOS[path.extname(f)] || 'application/octet-stream' });
      fs.createReadStream(f).pipe(res);
    });
    srv.listen(0, '127.0.0.1', () => ok({ base: `http://localhost:${srv.address().port}/`, cerrar: () => srv.close() }));
  });
}

// Datos de prueba: se escriben con la clave antigua de localStorage, que la app pasa sola a IndexedDB al arrancar.
function semilla(datos, extra = {}) {
  const ajustes = Object.assign({ documentacion_idioma: 'es', documentacion_tuto_personas: '1',
    documentacion_aviso_sin_nube: JSON.stringify({ ultimo: Date.now(), nunca: true }) }, extra);
  return `(() => { if (sessionStorage.getItem('__sembrado')) return; sessionStorage.setItem('__sembrado', '1');
    ${Object.entries(ajustes).map(([k, v]) => `localStorage.setItem(${JSON.stringify(k)}, ${JSON.stringify(v)});`).join('\n')}
    ${datos ? `localStorage.setItem('documentacion_datos_cache', ${JSON.stringify(JSON.stringify(datos))});` : ''} })();`;
}

const MINIATURA = `window.obtenerBlobPagina = async () => new Blob(['<svg xmlns="http://www.w3.org/2000/svg" width="320" height="200"><rect width="320" height="200" fill="#cdd6e0"/></svg>'], { type: 'image/svg+xml' });`;

async function abrirNavegador({ ancho = 412, alto = 860 } = {}) {
  const puerto = 9000 + Math.floor(Math.random() * 900);
  const perfil = fs.mkdtempSync(path.join(os.tmpdir(), 'doc-pruebas-'));
  const proc = spawn(rutaNavegador(), ['--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run', '--remote-debugging-port=' + puerto, '--user-data-dir=' + perfil, 'about:blank'], { stdio: 'ignore' });
  let lista;
  for (let i = 0; i < 60; i++) {
    try { lista = await (await fetch('http://127.0.0.1:' + puerto + '/json')).json(); if (lista.find((t) => t.type === 'page')) break; } catch (e) { /* aún arrancando */ }
    await espera(250);
  }
  const ws = new WebSocket(lista.find((t) => t.type === 'page').webSocketDebuggerUrl);
  await new Promise((r) => { ws.onopen = r; });
  let id = 0; const pend = new Map();
  const errores = []; const peticiones = [];
  ws.onmessage = (m) => {
    const d = JSON.parse(m.data);
    if (d.method === 'Runtime.exceptionThrown') errores.push(d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text);
    if (d.method === 'Network.requestWillBeSent') peticiones.push(d.params.request.url);
    if (d.id && pend.has(d.id)) { pend.get(d.id)(d.result || d.error); pend.delete(d.id); }
  };
  const enviar = (method, params = {}) => new Promise((r) => { const n = ++id; pend.set(n, r); ws.send(JSON.stringify({ id: n, method, params })); });
  const ejecutar = async (js) => {
    const r = await enviar('Runtime.evaluate', { expression: js, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    return r.result?.value;
  };
  await enviar('Page.enable'); await enviar('Runtime.enable'); await enviar('Network.enable');
  await enviar('Emulation.setDeviceMetricsOverride', { width: ancho, height: alto, deviceScaleFactor: 1, mobile: true });
  await enviar('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });

  const nav = {
    enviar, ejecutar, errores, peticiones,
    // Abre la app con unos datos y ajustes de partida (cada navegador empieza con el almacenamiento vacío)
    // Por defecto sin service worker: al instalarse recarga la página sola y las pruebas se descolocarían (solo la de "sin conexión" lo necesita)
    async abrirApp(base, datos, extra = {}, ruta = 'index.html', { sw = false } = {}) {
      if (!sw) await enviar('Page.addScriptToEvaluateOnNewDocument', { source: 'if (navigator.serviceWorker) navigator.serviceWorker.register = () => new Promise(() => {});' });
      await enviar('Page.addScriptToEvaluateOnNewDocument', { source: semilla(datos, extra) });
      await enviar('Page.navigate', { url: base + ruta });
      await espera(1200);
      await this.esperarDatos(datos);
      await ejecutar(MINIATURA + ' 0');
    },
    // La app lee los datos de IndexedDB de forma asíncrona: se espera a que estén todos antes de tocar nada
    async esperarDatos(datos) {
      if (!datos) return;
      const quiero = JSON.stringify([datos.personas.length, datos.documentos.length]);
      for (let i = 0; i < 80; i++) {
        const hay = await ejecutar('typeof datos === "undefined" ? null : JSON.stringify([datos.personas.length, datos.documentos.length])').catch(() => null);
        if (hay === quiero) return;
        await espera(100);
      }
    },
    async recargar(ms = 1800) { await enviar('Page.reload'); await espera(ms); await ejecutar(MINIATURA + ' 0'); },
    // Toque con el dedo (touchstart + touchend) en el centro del elemento
    async tocar(selector) {
      const p = await ejecutar(`(() => { const e = document.querySelector(${JSON.stringify(selector)}); if (!e) return null; e.scrollIntoView({ block: 'center' }); const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
      if (!p) throw new Error('No existe ' + selector);
      await espera(120);
      await enviar('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [p] }); await espera(40);
      await enviar('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await espera(400);
    },
    async foto(archivo) { const r = await enviar('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(archivo, Buffer.from(r.data, 'base64')); },
    cerrar() { try { ws.close(); } catch (e) { /* ya cerrado */ } proc.kill(); setTimeout(() => { try { fs.rmSync(perfil, { recursive: true, force: true }); } catch (e) { /* lo libera más tarde */ } }, 1500); },
  };
  return nav;
}

// Comprobaciones: se acumulan y la prueba falla si alguna no se cumple
function crearComprobador() {
  const fallos = [];
  const c = (condicion, texto) => { if (!condicion) fallos.push(texto); };
  c.igual = (real, esperado, texto) => { if (real !== esperado) fallos.push(`${texto}: esperaba ${JSON.stringify(esperado)} y hay ${JSON.stringify(real)}`); };
  c.fallos = fallos;
  return c;
}

module.exports = { RAIZ, espera, iniciarServidor, abrirNavegador, crearComprobador, semilla };
