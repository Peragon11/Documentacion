const CLIENT_ID = '938847082843-e27khin167n3dem5bpt715p37k5adkkp.apps.googleusercontent.com';

// Clave de la app de Dropbox (App Console de Dropbox). Vacía = Dropbox no
// aparece en la app. No es secreta.
const DROPBOX_APP_KEY = '6z1ho8yuc20yulh';
const NOMBRE_APP_DROPBOX = 'DOCUMENTACION_APP'; // nombre de la app en la consola de Dropbox = nombre de su carpeta en Aplicaciones

const VERSION_APP = '3.7.2';

const SCOPES = 'https://www.googleapis.com/auth/drive.file';
const NOMBRE_CARPETA = 'DOCUMENTACION_APP';
const NOMBRE_CARPETA_ANTIGUA = 'Documentación'; // nombre de versiones anteriores: si existe, se reutiliza y se renombra
const NOMBRE_METADATOS = 'documentacion-datos.json';

const MAPA_EXTENSIONES_MIME = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/heic': '.heic', 'application/pdf': '.pdf' };

const COLORES_AVATAR = ['#5C8374', '#4A7BA6', '#C1502E', '#8A6FB0', '#C48A2E'];

const ICONOS_AVATAR = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((l) => ({ id: l, nombre: l, img: 'letras/' + l + '.webp' }));
function htmlIconoAvatar(id) {
  const ic = ICONOS_AVATAR.find((i) => i.id === id);
  if (!ic) return '';
  return `<img class="img-letra" src="${ic.img}" alt="" draggable="false">`;
}
function htmlGridIconosAvatar(seleccionadoId) {
  return `<div class="grid-iconos-avatar">${ICONOS_AVATAR.map((ic) => `
    <button type="button" class="opcion-icono${ic.id === seleccionadoId ? ' activo' : ''}" data-icono="${ic.id}" aria-label="${ic.nombre}">
      ${htmlIconoAvatar(ic.id)}
    </button>`).join('')}</div>`;
}

let tokenClient = null;
let accessToken = null;
let tokenExpiry = 0;
let carpetaId = null;
let archivoMetadatosId = null;
let datos = { personas: [], categorias: [], documentos: [] };
let personaActivaId = null;
let categoriaGlobalActivaId = null;
let momentoUltimoArrastrePersona = 0;
let categoriaActiva = 'todos';
let personaFiltroActiva = 'todos';
let modoSeleccionDocs = false;
const docsSeleccionados = new Set();
let paginasSubidaPendientes = []; // [{ archivo, nombre }] — páginas añadidas en "Subir documento" antes de guardar
let fotoPendienteDataUrl = null;
let iconoPendienteId = null;
let promptInstalacionDiferido = null;

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

// ---- Idiomas de la interfaz (castellano, English, català) ----
// Solo cambia lo que se ve en pantalla. Los datos (nombres de personas, categorías y documentos), las
// copias de seguridad en las nubes y los archivos de exportación NO dependen del idioma: cada app
// puede tener uno distinto y se leen igual. Los textos están escritos en castellano; los diccionarios
// están en idiomas.js. Dos mecanismos:
//  - Lo que sale tal cual (botones, avisos, ayudas…) se traduce solo, buscando el texto en el
//    diccionario al colocarlo en la pantalla (traducirArbol y un observador de cambios).
//  - Las frases que el código compone con datos (nombres, números, plurales) usan trad('frase {dato}', { dato }).
const IDIOMA_STORAGE_KEY = 'documentacion_idioma';
const IDIOMAS = {
  es: { nombre: 'Castellano', html: 'es' },
  en: { nombre: 'English', html: 'en' },
  ca: { nombre: 'Català', html: 'ca' },
  it: { nombre: 'Italiano', html: 'it' },
  fr: { nombre: 'Français', html: 'fr' },
  de: { nombre: 'Deutsch', html: 'de' },
};
// Banderas (una insignia circular con la bandera, en vez de las siglas de antes). Cada una es un
// rectángulo con sus franjas reales; "xMidYMid slice" hace que llene el círculo sin deformarse,
// igual que un object-fit:cover en una foto.
const BANDERAS_IDIOMA = {
  es: `<svg viewBox="0 0 3 2" preserveAspectRatio="xMidYMid slice"><rect width="3" height="2" fill="#AA151B"/><rect y="0.5" width="3" height="1" fill="#F1BF00"/></svg>`,
  en: `<svg viewBox="0 0 60 30" preserveAspectRatio="xMidYMid slice"><rect width="60" height="30" fill="#00247D"/><path d="M0,0 L60,30" stroke="#FFF" stroke-width="6"/><path d="M60,0 L0,30" stroke="#FFF" stroke-width="6"/><path d="M0,0 L60,30" stroke="#CF142B" stroke-width="2"/><path d="M60,0 L0,30" stroke="#CF142B" stroke-width="2"/><rect x="24" width="12" height="30" fill="#FFF"/><rect y="9" width="60" height="12" fill="#FFF"/><rect x="27" width="6" height="30" fill="#CF142B"/><rect y="12" width="60" height="6" fill="#CF142B"/></svg>`,
  ca: `<svg viewBox="0 0 3 2" preserveAspectRatio="xMidYMid slice"><rect width="3" height="2" fill="#FCDD09"/><rect y="0.2222" width="3" height="0.2222" fill="#DA121A"/><rect y="0.6667" width="3" height="0.2222" fill="#DA121A"/><rect y="1.1111" width="3" height="0.2222" fill="#DA121A"/><rect y="1.5556" width="3" height="0.2222" fill="#DA121A"/></svg>`,
  it: `<svg viewBox="0 0 3 2" preserveAspectRatio="xMidYMid slice"><rect width="1" height="2" fill="#009246"/><rect x="1" width="1" height="2" fill="#FFFFFF"/><rect x="2" width="1" height="2" fill="#CE2B37"/></svg>`,
  fr: `<svg viewBox="0 0 3 2" preserveAspectRatio="xMidYMid slice"><rect width="1" height="2" fill="#0055A4"/><rect x="1" width="1" height="2" fill="#FFFFFF"/><rect x="2" width="1" height="2" fill="#EF4135"/></svg>`,
  de: `<svg viewBox="0 0 3 2" preserveAspectRatio="xMidYMid slice"><rect width="3" height="0.6667" fill="#000000"/><rect y="0.6667" width="3" height="0.6667" fill="#DD0000"/><rect y="1.3333" width="3" height="0.6667" fill="#FFCE00"/></svg>`,
};
function bandera(id) { return BANDERAS_IDIOMA[id] || ''; }
function obtenerIdiomaGuardado() {
  try { const s = localStorage.getItem(IDIOMA_STORAGE_KEY); return IDIOMAS[s] ? s : 'es'; } catch (e) { return 'es'; }
}
let idiomaActual = obtenerIdiomaGuardado(); // ya desde el principio, para que lo que se componga en el arranque salga en su idioma

// Frase compuesta por el código: se busca en el diccionario y se rellenan los {marcadores}.
function trad(clave, vars) {
  let s = clave;
  if (idiomaActual !== 'es') {
    const propio = (window.DICC_CODIGO || {})[idiomaActual] || {};
    const general = (window.DICC_DOM || {})[idiomaActual] || {};
    if (propio[clave] !== undefined) s = propio[clave];
    else if (general[clave] !== undefined) s = general[clave];
  }
  return vars ? s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m)) : s;
}
// "3 personas", "1 documento": el número y la palabra en singular o plural, traducida
const contar = (n, uno, varios) => `${n} ${trad(n === 1 ? uno : varios)}`;
// Une los nombres de varias nubes: "Google Drive y Dropbox"
const unirConY = (lista) => (lista.length === 2 ? trad('{a} y {b}', { a: lista[0], b: lista[1] }) : lista.join(', '));

const ATRIBUTOS_TRADUCIBLES = ['placeholder', 'aria-label', 'title', 'alt'];
// Lo que son datos del usuario (nombres de documentos, personas, páginas…) no se traduce nunca.
const NO_TRADUCIR = 'script, style, textarea, option, .doc-nombre, .nombre-persona, .galeria-pagina-nombre, .visor-topbar .titulo, .categoria-barra-nombre, [data-no-t]';
let prefijosIdioma = { en: null, ca: null };
function prefijosDe(id) {
  if (!prefijosIdioma[id]) prefijosIdioma[id] = Object.keys((window.DICC_DOM || {})[id] || {}).filter((k) => k.endsWith(':')).sort((a, b) => b.length - a.length);
  return prefijosIdioma[id];
}
// Texto en castellano → texto en el idioma actual (o el mismo si no está en el diccionario).
function traducirCadena(orig) {
  if (idiomaActual === 'es') return orig;
  const dicc = (window.DICC_DOM || {})[idiomaActual];
  if (!dicc) return orig;
  const partes = /^(\s*)([\s\S]*?)(\s*)$/.exec(orig);
  const clave = partes[2].replace(/\s+/g, ' ');
  if (!clave) return orig;
  let res = dicc[clave];
  if (res === undefined) {
    for (const p of prefijosDe(idiomaActual)) { if (clave.startsWith(p)) { res = dicc[p] + clave.slice(p.length); break; } }
  }
  return res === undefined ? orig : partes[1] + res + partes[3];
}
// Cada nodo recuerda su texto original en castellano (orig) y lo último que se puso (puesto); si otro
// código lo cambia, ese valor pasa a ser el nuevo original.
function procesarTexto(n) {
  if (n.parentElement && n.parentElement.closest(NO_TRADUCIR)) return;
  const v = n.nodeValue;
  if (!n.__i18n || n.__i18n.puesto !== v) n.__i18n = { orig: v, puesto: v };
  const destino = traducirCadena(n.__i18n.orig);
  if (destino !== v) n.nodeValue = destino;
  n.__i18n.puesto = destino;
}
function procesarAtributos(el) {
  if (el.closest && el.closest('[data-no-t]')) return;
  for (const a of ATRIBUTOS_TRADUCIBLES) {
    if (!el.hasAttribute(a)) continue;
    const v = el.getAttribute(a);
    const reg = el.__i18nAttr || (el.__i18nAttr = {});
    if (!reg[a] || reg[a].puesto !== v) reg[a] = { orig: v, puesto: v };
    const destino = traducirCadena(reg[a].orig);
    if (destino !== v) el.setAttribute(a, destino);
    reg[a].puesto = destino;
  }
}
function traducirArbol(raiz) {
  if (!raiz) return;
  if (raiz.nodeType === 3) { procesarTexto(raiz); return; }
  if (raiz.nodeType === 1 && raiz.matches && raiz.matches(NO_TRADUCIR)) return;
  if (raiz.nodeType === 1) procesarAtributos(raiz);
  const recorrido = document.createTreeWalker(raiz, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
    acceptNode: (nodo) => (nodo.nodeType === 1 && nodo.matches(NO_TRADUCIR) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
  });
  let nodo;
  while ((nodo = recorrido.nextNode())) { if (nodo.nodeType === 3) procesarTexto(nodo); else procesarAtributos(nodo); }
}
let observadorIdioma = null;
function iniciarObservadorIdioma() {
  if (observadorIdioma) return;
  observadorIdioma = new MutationObserver((mutaciones) => {
    if (idiomaActual === 'es') return; // en castellano no hay nada que traducir (al volver a él se restaura todo de una vez)
    for (const m of mutaciones) {
      if (m.type === 'childList') m.addedNodes.forEach((nodo) => traducirArbol(nodo));
      else if (m.type === 'characterData') procesarTexto(m.target);
      else if (m.type === 'attributes') procesarAtributos(m.target);
    }
  });
  observadorIdioma.observe(document.documentElement, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATRIBUTOS_TRADUCIBLES });
}
const TITULO_ES = document.title;
const DESCRIPCION_ES = (document.querySelector('meta[name="description"]') || {}).content || '';
function aplicarIdioma(id) {
  idiomaActual = IDIOMAS[id] ? id : 'es';
  document.documentElement.lang = IDIOMAS[idiomaActual].html;
  document.title = trad(TITULO_ES);
  const meta = document.querySelector('meta[name="description"]');
  if (meta && DESCRIPCION_ES) meta.setAttribute('content', trad(DESCRIPCION_ES));
  traducirArbol(document.body);
  iniciarObservadorIdioma();
}
function guardarIdioma(id) {
  try { localStorage.setItem(IDIOMA_STORAGE_KEY, id); } catch (e) { /* ignorar */ }
  aplicarIdioma(id);
}

function appYaInstalada() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  promptInstalacionDiferido = e;
  if (!appYaInstalada()) $('#banner-instalar').classList.remove('hidden');
});

window.addEventListener('appinstalled', () => {
  promptInstalacionDiferido = null;
  $('#banner-instalar').classList.add('hidden');
  pedirPermisoNotificaciones();
});

function pedirPermisoNotificaciones() {
  if (!('Notification' in window) || Notification.permission !== 'default') return;
  Notification.requestPermission();
}

let mostrandoDatosLocales = false;

// Si se llega aquí al tocar una notificación de caducidad, el service
// worker pasa el id de la persona por la URL (ventana nueva) o por un
// mensaje (ventana ya abierta) — ver más abajo y en sw.js.
let personaIdPendienteNotificacion = new URLSearchParams(location.search).get('persona');
if (personaIdPendienteNotificacion) history.replaceState(null, '', location.pathname);

function irAPersonaPorNotificacion(personaId) {
  if (!personaId) return;
  // Tanto la carga desde caché como la sincronización posterior con
  // Drive pueden llamar aquí para el mismo arranque — se limpia al
  // consumirlo para no abrir la persona dos veces (y no duplicar la
  // capa de navegación que añade abrirPersona).
  if (personaId === personaIdPendienteNotificacion) personaIdPendienteNotificacion = null;
  if (!datos.personas.some((p) => p.id === personaId)) return;
  cerrarTodasLasCapas();
  abrirPersona(personaId);
}

navigator.serviceWorker?.addEventListener('message', (e) => {
  if (e.data && e.data.tipo === 'abrir-persona') irAPersonaPorNotificacion(e.data.personaId);
});

document.addEventListener('DOMContentLoaded', async () => {
  $('#botones-idioma-inicio').innerHTML = Object.keys(IDIOMAS).map((id) => `
    <button class="btn-grande btn-idioma-inicio" data-idioma-inicio="${id}">
      <span class="bandera-idioma bandera-idioma-inicio">${bandera(id)}</span>
      <strong>${IDIOMAS[id].nombre}</strong>
    </button>`).join('');
  $$('.btn-idioma-inicio').forEach((btn) => {
    btn.addEventListener('click', () => {
      guardarIdioma(btn.dataset.idiomaInicio);
      document.documentElement.removeAttribute('data-preguntar-idioma');
      $('#vista-idioma').classList.add('hidden');
    });
  });

  $('#btn-banner-instalar')?.addEventListener('click', async () => {
    if (!promptInstalacionDiferido) return;
    promptInstalacionDiferido.prompt();
    await promptInstalacionDiferido.userChoice;
    promptInstalacionDiferido = null;
    $('#banner-instalar').classList.add('hidden');
  });
  $('#btn-banner-cerrar')?.addEventListener('click', () => $('#banner-instalar').classList.add('hidden'));

  $('#version-pie').textContent = 'v' + VERSION_APP;

  if (appYaInstalada()) pedirPermisoNotificaciones();
  const huboCacheLocal = await datosLocalesListos();
  if (huboCacheLocal) {
    mostrandoDatosLocales = true;
    carpetaId = localStorage.getItem('documentacion_carpeta_id') || null;
    mostrarApp();
    mostrarPantallaPersonas();
    comprobarCaducidadesYNotificar();
    irAPersonaPorNotificacion(personaIdPendienteNotificacion);
  }
});

window.addEventListener('load', () => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});

    let recargandoPorActualizacion = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (recargandoPorActualizacion) return;
      recargandoPorActualizacion = true;
      window.location.reload();
    });
  }
  try { initGIS(); } catch (e) { /* sin conexión: Google no llegó a cargar */ }
  arrancar();
});

function mostrarApp() {
  $('#vista-login').classList.add('hidden');
  $('#vista-app').classList.remove('hidden');
}

// ---- Estilos (skins) ----
// Cada estilo cambia colores (claro y oscuro), forma, letra y detalles de toda la app. El
// atributo data-skin de <html> los activa (el Clásico no lleva atributo). Las letras de cada
// estilo (carpeta fuentes/) se cargan solo cuando ese estilo se usa (ver el script del <head>).
const SKIN_STORAGE_KEY = 'documentacion_skin';
const SKINS = {
  clasico:   { nombre: 'Clásico',   descripcion: 'Azul noche y terracota, el de siempre',                       color: { oscuro: '#14202E', claro: '#F2F3F5' } },
  pasaporte: { nombre: 'Pasaporte', descripcion: 'Burdeos y oro, esquinas rectas y letra de imprenta',           color: { oscuro: '#2B1822', claro: '#EFE4CE' } },
  carpeta:   { nombre: 'Carpeta',   descripcion: 'Cartulina de archivo, sello rojo y letra de máquina de escribir', color: { oscuro: '#2A2318', claro: '#D8C596' } },
  nordico:   { nombre: 'Nórdico',   descripcion: 'Blanco y aire, verde agua suave y formas redondeadas',         color: { oscuro: '#1A2321', claro: '#F5F7F5' } },
  bosque:    { nombre: 'Bosque',    descripcion: 'Verde hondo y albaricoque, formas de hoja',                    color: { oscuro: '#172D26', claro: '#E4E0CB' } },
  pixeles:   { nombre: 'Píxeles',   descripcion: 'Videojuego de 8 bits: esquinas escalonadas, letra pixelada y colores retro (en claro, pantalla de Game Boy)', color: { oscuro: '#29366F', claro: '#9BBC0F' } },
  neon:      { nombre: 'Neón',      descripcion: 'Rótulos luminosos: contornos que brillan en rosa y turquesa sobre la noche', color: { oscuro: '#150D24', claro: '#E4D9FF' } },
  chicle:    { nombre: 'Chicle',    descripcion: 'Rosa chicle, menta, limón y celeste: todo redondo, gordito y de colorines', color: { oscuro: '#FF6BBA', claro: '#FF5DAF' } },
  comic:     { nombre: 'Cómic',     descripcion: 'Blanco y negro de cómic: tinta gruesa, trama de puntitos y sombras duras', color: { oscuro: '#0A0A0A', claro: '#FFFFFF' } },
  metalico:  { nombre: 'Metálico',  descripcion: 'Paneles de nave espacial: metal remachado, esquinas cortadas y placas con tornillos', color: { oscuro: '#24272B', claro: '#D7DADD' } },
};
function obtenerSkinGuardado() {
  const s = localStorage.getItem(SKIN_STORAGE_KEY);
  return SKINS[s] ? s : 'clasico';
}

const TEXTO_STORAGE_KEY = 'documentacion_texto';
const TAMANOS_TEXTO = [
  { pct: 85, nombre: 'Muy pequeño' },
  { pct: 92, nombre: 'Pequeño' },
  { pct: 100, nombre: 'Normal' },
  { pct: 110, nombre: 'Grande' },
  { pct: 120, nombre: 'Muy grande' }
];
function obtenerTamanoTexto() {
  const t = TAMANOS_TEXTO.find((x) => String(x.pct) === localStorage.getItem(TEXTO_STORAGE_KEY));
  return t || TAMANOS_TEXTO[2];
}
function aplicarTamanoTexto(pct) {
  document.documentElement.style.fontSize = pct === 100 ? '' : pct + '%';
  localStorage.setItem(TEXTO_STORAGE_KEY, String(pct));
}

const TEMA_STORAGE_KEY = 'documentacion_tema';
const mediaOscuro = window.matchMedia('(prefers-color-scheme: dark)');

function obtenerTemaGuardado() {
  return localStorage.getItem(TEMA_STORAGE_KEY) || 'oscuro'; // por defecto, el oscuro de siempre
}

function aplicarTema(tema) {
  const modoReal = tema === 'auto' ? (mediaOscuro.matches ? 'oscuro' : 'claro') : tema;
  if (modoReal === 'claro') {
    document.documentElement.setAttribute('data-tema', 'claro');
  } else {
    document.documentElement.removeAttribute('data-tema');
  }
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', SKINS[obtenerSkinGuardado()].color[modoReal === 'claro' ? 'claro' : 'oscuro']);
}

function aplicarSkin(id) {
  const skin = SKINS[id] ? id : 'clasico';
  if (skin === 'clasico') document.documentElement.removeAttribute('data-skin');
  else {
    document.documentElement.setAttribute('data-skin', skin);
    if (window.__cargarFuentesSkin) window.__cargarFuentesSkin(skin);
    if (window.__cargarImagenesSkin) window.__cargarImagenesSkin(skin);
  }
  aplicarTema(obtenerTemaGuardado()); // actualiza también el color de la barra del sistema
}

function guardarSkin(id) {
  localStorage.setItem(SKIN_STORAGE_KEY, id);
  aplicarSkin(id);
}

function guardarTema(tema) {
  localStorage.setItem(TEMA_STORAGE_KEY, tema);
  aplicarTema(tema);
}

aplicarTema(obtenerTemaGuardado());
aplicarSkin(obtenerSkinGuardado());
mediaOscuro.addEventListener('change', () => {
  if (obtenerTemaGuardado() === 'auto') aplicarTema('auto');
});

// El título de la barra de arriba (el nombre de la app, o de la persona o categoría
// abierta) ocupa el hueco que hay entre el icono y los botones: se mide el espacio
// real y se le da el mayor tamaño de letra con el que cabe entero, en vertical y en
// horizontal.
// - El nombre de la app puede llegar a 38 px (línea de 43,7 px: no supera los
//   botones de 44 y la barra no crece). Los nombres de personas y categorías, que
//   suelen ser cortos, se limitan a 26 px para que no resulten exagerados.
// - Si un nombre es largo y en una línea quedaría pequeño, se reparte en DOS líneas
//   (hasta 18,3 px, para que dos líneas tampoco hagan crecer la barra) cuando así la
//   letra puede ser claramente mayor. Solo un nombre larguísimo llega al tamaño
//   mínimo y se recorta.
const TITULO_TAM_MIN = 9;
const TITULO_TAM_MAX_APP = 38;
const TITULO_TAM_MAX_NOMBRE = 26;
const TITULO_TAM_MAX_DOS_LINEAS = 18.3;
function ajustarTituloTopbar() {
  const t = $('#titulo-topbar');
  if (!t) return;
  const disponible = t.clientWidth; // el título rellena el hueco libre (flex:1), no depende de su tamaño de letra
  if (!disponible) return;          // la app aún no está a la vista
  const enNombre = !$('#btn-volver').classList.contains('hidden'); // dentro de una persona o categoría
  const tope = enNombre ? TITULO_TAM_MAX_NOMBRE : TITULO_TAM_MAX_APP;
  t.classList.toggle('centrado', !enNombre);

  // Una línea: se mide a 100 px y se escala hasta llenar el hueco.
  t.classList.remove('dos-lineas');
  t.style.fontSize = '100px';
  const natural = t.scrollWidth;
  const idealUna = (disponible / Math.max(natural, 1)) * 100 * 0.985;

  // Dos líneas: si en una línea la letra sería pequeña, se busca el mayor tamaño con el
  // que el texto cabe en dos líneas sin que ninguna palabra se salga del hueco.
  if (idealUna < TITULO_TAM_MAX_DOS_LINEAS) {
    t.classList.add('dos-lineas');
    const cabe = (px) => {
      t.style.fontSize = px + 'px';
      // dos líneas de altura 1,2 × tamaño, con unos píxeles de margen por los acentos y colas de las letras
      return t.scrollWidth <= t.clientWidth + 0.5 && t.scrollHeight <= 2.4 * px + 9;
    };
    let bajo = TITULO_TAM_MIN; let alto = TITULO_TAM_MAX_DOS_LINEAS;
    for (let i = 0; i < 9; i++) { const medio = (bajo + alto) / 2; if (cabe(medio)) bajo = medio; else alto = medio; }
    // Se comprueba el tamaño final (al reducir la letra una palabra puede saltar de línea y sobrar una tercera)
    // y se baja de a poco hasta que quepa; al fijarlo se redondea hacia abajo, no al más cercano.
    while (bajo > TITULO_TAM_MIN && !cabe(bajo)) bajo -= 0.25;
    if (cabe(bajo) && bajo > idealUna * 1.12) { t.style.fontSize = (Math.floor(bajo * 100) / 100) + 'px'; return; }
    t.classList.remove('dos-lineas');
  }
  t.style.fontSize = Math.max(TITULO_TAM_MIN, Math.min(tope, idealUna)).toFixed(2) + 'px';
}
(function activarAjusteTituloTopbar() {
  const t = $('#titulo-topbar');
  if (!t) return;
  let anchoAnterior = 0;
  // cambia el hueco (giro, botones que aparecen o se ocultan, otra pantalla)
  if (window.ResizeObserver) {
    new ResizeObserver(() => {
      if (t.clientWidth !== anchoAnterior) { anchoAnterior = t.clientWidth; ajustarTituloTopbar(); }
    }).observe(t);
  }
  // cambia el texto
  new MutationObserver(() => ajustarTituloTopbar()).observe(t, { childList: true, characterData: true, subtree: true });
  // la tipografía tarda en cargar y cambia el ancho del texto
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(ajustarTituloTopbar);
  // también cuando termina de cargar la letra de un estilo, y al cambiar de estilo (el ancho del texto cambia)
  if (document.fonts && document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', ajustarTituloTopbar);
  new MutationObserver(() => ajustarTituloTopbar()).observe(document.documentElement, { attributes: true, attributeFilter: ['data-skin'] });
  window.addEventListener('resize', ajustarTituloTopbar);
  window.addEventListener('orientationchange', () => setTimeout(ajustarTituloTopbar, 150));
})();

let pilaNavegacion = [];
// Si hay un modal abierto "encima" de otro (p. ej. "Nueva persona" abierta desde "Subir documento"), el botón atrás
// del móvil debe volver al de debajo en vez de cerrarlo todo. Aquí se guarda cómo volver a él (solo lo usa "atrás").
let retrocesoModal = null;
let ignorarProximoPopstate = false;

function pushNavegacion(cerrarFn) {
  pilaNavegacion.push(cerrarFn);
  history.pushState({ documentacionNav: true }, '');
}

// Sustituye la capa de arriba de la pila (y su paso en el historial) por otra, sin que haga
// falta ni un paso más ni uno menos para volver atrás — para pasar de un menú directamente a
// la pantalla siguiente sin cerrar una capa y abrir otra por separado: cerrar hace un
// history.go() asíncrono y abrir un history.pushState() síncrono justo después, y esa mezcla deja
// la pila desincronizada del historial real (el síntoma: un botón de cerrar que dejaba de
// funcionar). history.replaceState() no dispara popstate ni cambia cuántos pasos hay.
function reemplazarCapaActual(cerrarFn) {
  if (pilaNavegacion.length > 0) pilaNavegacion.pop();
  pilaNavegacion.push(cerrarFn);
  history.replaceState({ documentacionNav: true }, '');
}

function volverAtras() {
  if (pilaNavegacion.length > 0) history.back();
}

window.addEventListener('popstate', () => {
  if (ignorarProximoPopstate) { ignorarProximoPopstate = false; return; }
  if (retrocesoModal && pilaNavegacion[pilaNavegacion.length - 1] === cerrarModal) {
    const volver = retrocesoModal;
    retrocesoModal = null;
    pilaNavegacion.pop();
    volver();                     // reabre el modal de debajo (en la misma capa)...
    pushNavegacion(cerrarModal);  // ...y le repone su paso de navegación, para que el siguiente atrás sí lo cierre
    return;
  }
  const cerrar = pilaNavegacion.pop();
  if (cerrar) cerrar();
});

function initGIS() {
  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPES,
    callback: onTokenRecibido,
    error_callback: () => {
      const resolver = resolverRenovacion;
      promesaRenovacion = null; resolverRenovacion = null;
      if (resolver) resolver(false);
      else mostrarToast('No se pudo conectar con Google.', true);
    },
  });
}

$('#btn-conectar').addEventListener('click', () => PROVEEDORES.google.conectar());
$('#btn-conectar-dropbox').addEventListener('click', () => PROVEEDORES.dropbox.conectar());

// Importar un archivo de copia desde la pantalla inicial: se entra en la app
// vacía y se reutiliza el mismo importador de Ajustes. Si el archivo no vale y
// no llegó a entrar nada, se vuelve a la pantalla inicial sin guardar nada.
async function importarDesdeBienvenida(file) {
  datos = { personas: [], categorias: [], documentos: [] };
  entrarEnLaApp();
  abrirModal('<h3>Importando…</h3>');
  await procesarImportacion(file, true);
}
$('#btn-importar-bienvenida').addEventListener('click', () => $('#input-importar-bienvenida').click());
$('#input-importar-bienvenida').addEventListener('change', (e) => {
  const archivo = e.target.files[0];
  e.target.value = '';
  if (archivo) importarDesdeBienvenida(archivo);
});

function mostrarPanelLogin(panel) {
  $('#login-inicio').classList.toggle('hidden', panel !== 'inicio');
  $('#login-nubes').classList.toggle('hidden', panel !== 'nubes');
  $('#vista-login p.lead').classList.toggle('hidden', panel === 'nubes'); // la frase de presentación solo en la primera pantalla
  ajustarPantallasInicio();
}

// Las pantallas de inicio (idioma y login) no tienen scroll: si en un móvil bajito el contenido no cabe,
// se reduce lo justo (hasta el 35 %) para que quepa entero y siga centrado.
function ajustarPantallasInicio() {
  ['#vista-idioma', '#vista-login'].forEach((sel) => {
    const vista = $(sel);
    const caja = vista && vista.querySelector('.inicio-ajuste');
    if (!caja || getComputedStyle(vista).display === 'none') return;
    caja.style.zoom = 1;
    const relleno = 2 * 32; // padding vertical de la pantalla
    const disponible = vista.clientHeight - relleno;
    const natural = caja.getBoundingClientRect().height;
    caja.style.zoom = natural > disponible ? Math.max(0.35, disponible / natural).toFixed(3) : 1;
  });
}
window.addEventListener('resize', ajustarPantallasInicio);
window.addEventListener('orientationchange', () => setTimeout(ajustarPantallasInicio, 150));

// Alto real de la ventana para #vista-app (ver el CSS de #vista-app). innerHeight y no el de
// visualViewport: así el teclado sigue sin encoger la app, igual que con 100dvh.
function ajustarAltoApp() {
  document.documentElement.style.setProperty('--alto-app', window.innerHeight + 'px');
}
ajustarAltoApp();
window.addEventListener('resize', ajustarAltoApp);
window.addEventListener('orientationchange', () => setTimeout(ajustarAltoApp, 150));
window.addEventListener('pageshow', ajustarAltoApp);
document.addEventListener('visibilitychange', () => { if (!document.hidden) ajustarAltoApp(); });
window.addEventListener('load', () => { ajustarAltoApp(); setTimeout(ajustarAltoApp, 400); setTimeout(ajustarAltoApp, 1200); });
if (document.fonts && document.fonts.ready) document.fonts.ready.then(ajustarPantallasInicio);
new MutationObserver(ajustarPantallasInicio).observe(document.documentElement, { attributes: true, attributeFilter: ['data-skin', 'data-preguntar-idioma', 'data-hay-datos', 'lang'] });
['#vista-idioma', '#vista-login'].forEach((sel) => new MutationObserver(ajustarPantallasInicio).observe($(sel), { childList: true, subtree: true, characterData: true }));
setTimeout(ajustarPantallasInicio, 0);
window.addEventListener('load', () => { ajustarPantallasInicio(); setTimeout(ajustarPantallasInicio, 400); setTimeout(ajustarPantallasInicio, 1200); }); // la ventana puede acabar de asentarse tras el arranque
if (window.visualViewport) window.visualViewport.addEventListener('resize', ajustarPantallasInicio);
$('#btn-ya-usaba').addEventListener('click', () => mostrarPanelLogin('nubes'));
$('#btn-volver-login').addEventListener('click', () => mostrarPanelLogin('inicio'));
$('#btn-empezar').addEventListener('click', () => {
  datos = { personas: [], categorias: [], documentos: [] };
  modoInicio = 'personas'; // al empezar de cero siempre se ve primero la pantalla de personas
  guardarModoInicio(modoInicio);
  entrarEnLaApp();
  guardarMetadatos();
});

function hayProveedores() {
  return Object.values(PROVEEDORES).some((p) => p.conectado());
}

function restaurarTokenGoogleGuardado() {
  try {
    const s = JSON.parse(localStorage.getItem('documentacion_sesion') || 'null');
    if (s && s.expiry > Date.now() + 60000) { accessToken = s.token; tokenExpiry = s.expiry; }
  } catch (e) { /* ignorar */ }
}

// Arranque: la app ya se ha mostrado desde la copia local (DOMContentLoaded),
// sin esperar a ninguna nube. Aquí solo se atiende la vuelta de un inicio de
// sesión de Dropbox y se programa la copia de seguridad.
async function arrancar() {
  await datosLocalesListos();
  Object.values(PROVEEDORES).forEach((p) => {
    const boton = $('#btn-conectar-' + p.id);
    if (boton && p.configurado()) boton.classList.remove('hidden');
  });
  Promise.resolve(navigator.storage && navigator.storage.persist && navigator.storage.persist()).catch(() => {});
  if (!leerProv('google') && localStorage.getItem('documentacion_sesion')) guardarProv('google', { email: '' });
  restaurarTokenGoogleGuardado();
  actualizarPuntoAjustes();
  const retorno = await procesarRetornoOAuth();
  if (retorno) { await alConectarProveedor(retorno); return; }
  if (hayProveedores()) setTimeout(sincronizarSiToca, 1500);
  else setTimeout(avisarSiSinNube, 2500);
}

// La renovación silenciosa de Google (prompt:'none') abre por debajo una
// ventana de Google, y si el móvil no puede mantenerla invisible se ve como
// un parpadeo blanco. Por eso ya no se hace por temporizador: solo cuando
// hay algo que copiar (ver respaldarEn / hayTrabajo). Devuelve una promesa
// que resuelve a true/false; si ya hay una en marcha se reutiliza.
let promesaRenovacion = null;
let resolverRenovacion = null;
function solicitarRenovacionSilenciosa() {
  if (promesaRenovacion) return promesaRenovacion;
  if (!tokenClient || CLIENT_ID.includes('TU_CLIENT_ID')) return Promise.resolve(false);
  promesaRenovacion = new Promise((resolve) => { resolverRenovacion = resolve; });
  tokenClient.requestAccessToken({ prompt: 'none' });
  return promesaRenovacion;
}

async function onTokenRecibido(resp) {
  const resolver = resolverRenovacion;
  promesaRenovacion = null; resolverRenovacion = null;
  if (resp.error) {
    if (resolver) resolver(false);
    else mostrarToast('No se pudo completar la conexión.', true);
    return;
  }
  accessToken = resp.access_token;
  tokenExpiry = Date.now() + (resp.expires_in * 1000);
  localStorage.setItem('documentacion_sesion', JSON.stringify({ token: accessToken, expiry: tokenExpiry }));
  if (resolver) { resolver(true); return; }
  guardarProv('google', { email: '' });
  await alConectarProveedor('google');
}

function volverALogin(panel = 'nubes') {
  $('#vista-app').classList.add('hidden');
  $('#vista-login').classList.remove('hidden');
  mostrarPanelLogin(panel);
}

// Punto discreto sobre el engranaje mientras no haya ninguna nube conectada.
// El punto rojo del botón de Ajustes solo sale si hay un problema real con una nube que SÍ está conectada
// (hay que reconectarla, falla o está llena). Quien no usa nubes no ve ningún aviso.
function actualizarPuntoAjustes() {
  const boton = $('#btn-ajustes');
  const problema = Object.values(PROVEEDORES).some((p) => p.conectado() && ['reconectar', 'error', 'llena'].includes(estadoProv[p.id]));
  if (boton) boton.classList.toggle('aviso-nube', problema);
  const botonBarra = $('#bar-ajustes');
  if (botonBarra) botonBarra.classList.toggle('aviso-nube', problema);
}

function entrarEnLaApp() {
  mostrandoDatosLocales = true;
  actualizarPuntoAjustes();
  mostrarApp();
  mostrarPantallaPersonas();
  comprobarCaducidadesYNotificar();
  irAPersonaPorNotificacion(personaIdPendienteNotificacion);
}

function datosVacios() {
  return datos.personas.length === 0 && datos.documentos.length === 0;
}

// Se llama al conectar una nube (botón de la pantalla de inicio o de Ajustes).
// Si este móvil no tiene nada y la nube ya tiene una copia, se recupera; si
// no, se empieza vacío. En cualquier caso, luego se copia en segundo plano.
async function alConectarProveedor(id) {
  const prov = PROVEEDORES[id];
  const sinDatos = !mostrandoDatosLocales;
  if (sinDatos) { mostrarApp(); mostrarPantallaCarga(); }
  estadoProv[id] = 'copiando';
  refrescarEstadoAjustes();
  try {
    await prov.token();
    if (id === 'google') {
      const email = await cargarPerfil();
      guardarProv('google', { email });
    }
    await prov.preparar();
    if (sinDatos || datosVacios()) {
      const crudo = await prov.leerDatos();
      const remoto = crudo ? interpretarCopia(crudo) : null;
      if (remoto) {
        restaurarCopia(id, remoto);
        mostrarToast(trad('Copia de {nube} recuperada', { nube: prov.nombre }));
      } else if (sinDatos) {
        datos = { personas: [], categorias: [], documentos: [] };
        entrarEnLaApp();
        await guardarMetadatos();
      }
    } else {
      mostrarToast(trad('{nube} conectado', { nube: prov.nombre }));
    }
    estadoProv[id] = 'ok';
  } catch (e) {
    console.error(e);
    estadoProv[id] = 'error';
    if (sinDatos) {
      try { await prov.desconectar(); } catch (e2) { /* ignorar */ }
      guardarProv(id, null);
      volverALogin();
    }
    mostrarToast(trad('No se pudo conectar con {nube}.', { nube: prov.nombre }), true);
  }
  refrescarEstadoAjustes();
  programarRespaldo(500);
}

function refrescarPantallaActual() {
  if (personaActivaId) {
    renderizarCabeceraPersona();
    renderizarChipsCategorias();
    renderizarAvisoCaducidadPersona();
    renderizarDocumentos();
  } else if (categoriaGlobalActivaId !== null) {
    renderizarChipsPersonas();
    renderizarDocumentos();
  } else {
    renderizarPantallaInicio();
  }
}

function mostrarPantallaCarga() {
  $('#pantalla-personas').classList.remove('hidden');
  $('#pantalla-persona').classList.add('hidden');
  $('#grid-personas').innerHTML = `<div class="estado-carga" style="grid-column:1/-1"><div class="spinner"></div><span>Preparando tus documentos…</span></div>`;
}

async function llamarGoogle(url, opciones = {}, timeoutMs = 8000) {
  async function intentar() {
    const cabeceras = Object.assign({ Authorization: `Bearer ${accessToken}` }, opciones.headers || {});
    const controlador = new AbortController();
    const limite = setTimeout(() => controlador.abort(), timeoutMs);
    try {
      return await fetch(url, Object.assign({}, opciones, { headers: cabeceras, signal: controlador.signal }));
    } finally {
      clearTimeout(limite);
    }
  }
  let res = await intentar();
  if (res.status === 401) {
    // El token pudo caducar justo entre que se preparó la petición y se
    // envió (p.ej. la app llevaba un rato en segundo plano) — se renueva
    // y se reintenta una vez, en vez de fallar directamente.
    const renovado = await solicitarRenovacionSilenciosa();
    if (!renovado) throw new Error('token-caducado');
    res = await intentar();
    if (res.status === 401) throw new Error('token-caducado');
  }
  return res;
}

async function cargarPerfil() {
  const res = await llamarGoogle('https://www.googleapis.com/drive/v3/about?fields=user');
  const info = await res.json();
  return info.user.emailAddress;
}

function escaparComillas(str) {
  return str.replace(/'/g, "\\'");
}

async function buscarCarpeta(nombre, padreId) {
  const q = encodeURIComponent(`name='${escaparComillas(nombre)}' and mimeType='application/vnd.google-apps.folder' and trashed=false and '${padreId}' in parents`);
  const busq = await llamarGoogle(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)`);
  const resultado = await busq.json();
  return resultado.files && resultado.files.length > 0 ? resultado.files[0].id : null;
}

async function buscarOCrearCarpeta(nombre, padreId) {
  const existente = await buscarCarpeta(nombre, padreId);
  if (existente) return existente;
  const crear = await llamarGoogle('https://www.googleapis.com/drive/v3/files', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: nombre, mimeType: 'application/vnd.google-apps.folder', parents: [padreId] }),
  });
  const nueva = await crear.json();
  return nueva.id;
}

const cacheCarpetas = {};
// La clave incluye los nombres: si se renombra una persona o categoría, no debe
// reutilizarse la carpeta antigua.
const claveCarpeta = (persona, categoria) => `${persona.id}:${categoria.id}:${persona.nombre}:${categoria.nombre}`;
async function carpetaDestinoDocumento(persona, categoria) {
  const clave = claveCarpeta(persona, categoria);
  if (cacheCarpetas[clave]) return cacheCarpetas[clave];
  const carpetaPersonaId = await buscarOCrearCarpeta(persona.nombre, carpetaId);
  const carpetaCategoriaId = await buscarOCrearCarpeta(categoria.nombre, carpetaPersonaId);
  cacheCarpetas[clave] = carpetaCategoriaId;
  return carpetaCategoriaId;
}

// Borra la carpeta si ya no tiene nada dentro (ni archivos ni otras
// carpetas). Se usa después de borrar el último documento de una
// categoría o de una persona, para no dejar carpetas vacías en Drive.
async function borrarCarpetaSiVacia(idCarpeta) {
  const q = encodeURIComponent(`'${idCarpeta}' in parents and trashed=false`);
  const res = await llamarGoogle(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id)&pageSize=1`);
  if (!res.ok) return false; // no se pudo mirar (error temporal): nunca se da por vacía
  const info = await res.json();
  if (info.files && info.files.length > 0) return false;
  await llamarGoogle(`https://www.googleapis.com/drive/v3/files/${idCarpeta}`, { method: 'DELETE' });
  return true;
}

// Tras borrar el último documento de una categoría (para esa persona),
// comprueba si su carpeta se ha quedado vacía y la borra; si con eso la
// carpeta de la propia persona también se queda vacía (ya no le quedan
// categorías con nada dentro), la borra también.
async function limpiarCarpetasVaciasTrasBorrar(persona, categoriaObj) {
  try {
    const idCarpetaCategoria = await carpetaDestinoDocumento(persona, categoriaObj);
    const categoriaQuedoVacia = await borrarCarpetaSiVacia(idCarpetaCategoria);
    if (!categoriaQuedoVacia) return;
    delete cacheCarpetas[claveCarpeta(persona, categoriaObj)];
    const idCarpetaPersona = await buscarOCrearCarpeta(persona.nombre, carpetaId);
    const personaQuedoVacia = await borrarCarpetaSiVacia(idCarpetaPersona);
    if (personaQuedoVacia) {
      Object.keys(cacheCarpetas).forEach((clave) => { if (clave.startsWith(`${persona.id}:`)) delete cacheCarpetas[clave]; });
    }
  } catch (e) { /* si falla la limpieza no pasa nada, el documento ya se borró bien */ }
}

async function asegurarCarpeta() {
  const guardadoId = localStorage.getItem('documentacion_carpeta_id');
  if (guardadoId) {
    const check = await llamarGoogle(`https://www.googleapis.com/drive/v3/files/${guardadoId}?fields=id,trashed,name`);
    if (check.ok) {
      const info = await check.json();
      if (!info.trashed) {
        carpetaId = guardadoId;
        if (info.name !== NOMBRE_CARPETA) {
          llamarGoogle(`https://www.googleapis.com/drive/v3/files/${guardadoId}`, {
            method: 'PATCH', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: NOMBRE_CARPETA }),
          }).catch(() => {});
        }
        return;
      }
    }
  }
  let encontrada = await buscarCarpeta(NOMBRE_CARPETA, 'root');
  if (!encontrada) {
    // Versiones anteriores la llamaban "Documentación": se reutiliza (con todo
    // lo que tiene dentro) y se renombra, en vez de crear otra vacía.
    encontrada = await buscarCarpeta(NOMBRE_CARPETA_ANTIGUA, 'root');
    if (encontrada) {
      llamarGoogle(`https://www.googleapis.com/drive/v3/files/${encontrada}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: NOMBRE_CARPETA }),
      }).catch(() => {});
    }
  }
  carpetaId = encontrada || await buscarOCrearCarpeta(NOMBRE_CARPETA, 'root');
  localStorage.setItem('documentacion_carpeta_id', carpetaId);
}

// Pseudo-categoría de reserva, no es una categoría real (no vive en
// datos.categorias, no se puede crear/renombrar/borrar): es solo lo que
// se muestra para un documento cuya categoría ya no existe, porque se
// borró. Cualquier categoría, incluidas las de fábrica, se puede borrar.
// Límite común para el nombre de una persona o de una categoría (al crear y al renombrar).
// Sale en la barra de arriba, donde con este largo cabe entero en dos líneas.
const LIMITE_NOMBRE = 35;

const CATEGORIA_SIN_ASIGNAR = { id: null, nombre: 'Sin categoría', color: '#6B7686' };

// Documentos guardados antes de que existieran las "páginas" (un
// driveFileId/mimeType sueltos en vez de un array paginas) se convierten
// al nuevo formato al vuelo, tanto si vienen de Drive como de la copia
// en caché del propio móvil — sin esto, los documentos antiguos
// desaparecían de la lista.
function normalizarDocumentosPaginas(documentos) {
  documentos.forEach((doc) => {
    if (!doc.paginas) {
      doc.paginas = [{ driveFileId: doc.driveFileId, mimeType: doc.mimeType, nombre: doc.nombre }];
      delete doc.driveFileId;
      delete doc.mimeType;
    }
    // Versiones anteriores identificaban cada archivo por su id de Drive; ahora
    // cada página tiene su propio id local y, aparte, dónde está en cada nube.
    doc.paginas.forEach((p) => {
      if (!p.archivoId && p.driveFileId) { p.archivoId = p.driveFileId; p.remotos = { google: p.driveFileId }; delete p.driveFileId; }
      if (!p.remotos) p.remotos = {};
      if (!p.rutas) p.rutas = {};
    });
  });
}

// Los datos (personas con sus fotos, categorías y documentos) se guardan en IndexedDB y no en localStorage:
// allí el límite es de unos 5 MB (lo llenaban pronto las fotos de las personas) y cada guardado paraba la app
// mientras escribía. En localStorage solo queda la marca documentacion_hay_datos, que lee el <head> antes de
// pintar. Las escrituras van en cola, en orden, para que nunca pise una antigua a una más nueva.
let colaEscrituraDatos = Promise.resolve();
function guardarDatosEnCacheLocal() {
  const texto = JSON.stringify(datos);
  try { localStorage.setItem('documentacion_hay_datos', '1'); } catch (e) { /* sin espacio: lo importante va a IndexedDB */ }
  colaEscrituraDatos = colaEscrituraDatos
    .then(() => escribirDatosIdb(texto))
    .catch(() => mostrarToast('No se pudieron guardar los datos en este móvil (sin espacio).', true));
  return colaEscrituraDatos;
}
async function escribirDatosIdb(texto) {
  const db = await abrirCache();
  await new Promise((res, rej) => {
    const tx = db.transaction(DB_TIENDA_DATOS, 'readwrite');
    tx.objectStore(DB_TIENDA_DATOS).put(texto, 'datos');
    tx.oncomplete = () => res();
    tx.onerror = tx.onabort = () => rej(tx.error);
  });
}
async function leerDatosIdb() {
  try {
    const db = await abrirCache();
    return await new Promise((res) => {
      const r = db.transaction(DB_TIENDA_DATOS, 'readonly').objectStore(DB_TIENDA_DATOS).get('datos');
      r.onsuccess = () => res(r.result || null);
      r.onerror = () => res(null);
    });
  } catch (e) { return null; }
}
async function cargarDatosDesdeCacheLocal() {
  let guardado = await leerDatosIdb();
  // Versiones anteriores lo guardaban en localStorage: se pasa a IndexedDB y, ya copiado, se quita de allí.
  const antiguo = localStorage.getItem('documentacion_datos_cache');
  if (antiguo) {
    if (!guardado) {
      guardado = antiguo;
      try { await escribirDatosIdb(antiguo); localStorage.removeItem('documentacion_datos_cache'); } catch (e) { /* se reintenta la próxima vez */ }
    } else localStorage.removeItem('documentacion_datos_cache');
  }
  if (!guardado) return false;
  try {
    datos = sanearDatos(JSON.parse(guardado));
    normalizarDocumentosPaginas(datos.documentos || []);
    localStorage.setItem('documentacion_hay_datos', '1');
    return true;
  } catch (e) { return false; }
}
// Una sola lectura, compartida: el arranque (DOMContentLoaded y arrancar) espera a que termine. No se lanza al
// evaluar el script porque usa constantes que se declaran más abajo.
let promesaDatosLocales = null;
function datosLocalesListos() { return promesaDatosLocales || (promesaDatosLocales = cargarDatosDesdeCacheLocal()); }

// Guarda en el móvil (lo principal) y programa la copia a las nubes.
async function guardarMetadatos() {
  estamparCambios();
  subirRevisionLocal();
  guardarDatosEnCacheLocal();
  programarRespaldo();
}

// Si una subida falla porque la nube no tiene espacio, se lanza un error propio (nube-llena) para poder avisar
// con claridad en vez del "no se pudo copiar" genérico. Google devuelve 403 storageQuotaExceeded y Dropbox
// 409 insufficient_space.
async function comprobarNubeLlena(res, proveedor) {
  let texto = '';
  try { texto = await res.clone().text(); } catch (e) { return; }
  if (proveedor === 'google' && res.status === 403 && /storageQuotaExceeded/i.test(texto)) throw new Error('nube-llena');
  if (proveedor === 'dropbox' && res.status === 409 && /insufficient_space/i.test(texto)) throw new Error('nube-llena');
}

async function subirArchivoADrive(file, nombreArchivo, carpetaDestinoId) {
  const metadata = { name: nombreArchivo, parents: [carpetaDestinoId] };
  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', file);
  const res = await llamarGoogle('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id', { method: 'POST', body: form }, 180000);
  if (!res.ok) { await comprobarNubeLlena(res, 'google'); throw new Error('subir'); }
  const info = await res.json();
  return info.id;
}


// ============================================================
// Nubes de copia de seguridad: Google Drive y Dropbox
// ============================================================
// El uso normal es SIEMPRE contra la copia local (datos + IndexedDB): rápido
// y sin depender de la red. Cada nube conectada recibe una copia automática
// en segundo plano (respaldarEn). Cada página guarda en pagina.remotos[nube]
// dónde quedó su archivo en esa nube: si falta esa referencia, aún no está
// copiado y se sube en la siguiente pasada. Los borrados se encolan y se
// aplican en cada nube cuando hay conexión.

function leerJsonLocal(clave, porDefecto) {
  try {
    const v = JSON.parse(localStorage.getItem(clave));
    return v === null || v === undefined ? porDefecto : v;
  } catch (e) { return porDefecto; }
}
function guardarJsonLocal(clave, valor) {
  if (valor === null) localStorage.removeItem(clave);
  else localStorage.setItem(clave, JSON.stringify(valor));
}
const leerProv = (id) => leerJsonLocal(`documentacion_prov_${id}`, null);
const guardarProv = (id, valor) => guardarJsonLocal(`documentacion_prov_${id}`, valor);
const leerEstadoProv = (id) => leerJsonLocal(`documentacion_estado_${id}`, {});
const guardarEstadoProv = (id, valor) => guardarJsonLocal(`documentacion_estado_${id}`, valor);
const CLAVE_BORRADOS = 'documentacion_borrados_pendientes';

const revisionLocal = () => parseInt(localStorage.getItem('documentacion_rev') || '0', 10) || 0;
function subirRevisionLocal() {
  const nueva = revisionLocal() + 1;
  localStorage.setItem('documentacion_rev', String(nueva));
  return nueva;
}

function base64Url(bytes) {
  let s = '';
  new Uint8Array(bytes).forEach((b) => { s += String.fromCharCode(b); });
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function cadenaAleatoria(n = 48) {
  const a = new Uint8Array(n);
  crypto.getRandomValues(a);
  return base64Url(a);
}
async function desafioPkce(verificador) {
  return base64Url(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verificador)));
}
function idDispositivo() {
  let d = localStorage.getItem('documentacion_dispositivo');
  if (!d) { d = cadenaAleatoria(12); localStorage.setItem('documentacion_dispositivo', d); }
  return d;
}

// La dirección a la que vuelve Dropbox tras iniciar sesión: la misma app.
// Tiene que estar dada de alta tal cual en la consola de Dropbox.
const URI_REDIRECCION = () => location.origin + location.pathname.replace(/index\.html$/, '');

// Inicio de sesión sin servidor: flujo de código con PKCE, a pantalla
// completa (la app se recarga al volver y procesarRetornoOAuth lo termina).
async function iniciarOAuthPkce(id, urlAutorizar, parametros) {
  const verificador = cadenaAleatoria(64);
  const estado = cadenaAleatoria(16);
  guardarJsonLocal('documentacion_oauth_pendiente', { id, verificador, estado });
  const url = new URL(urlAutorizar);
  const todos = Object.assign({
    response_type: 'code', redirect_uri: URI_REDIRECCION(),
    code_challenge: await desafioPkce(verificador), code_challenge_method: 'S256', state: estado,
  }, parametros);
  Object.keys(todos).forEach((k) => { if (todos[k] !== undefined) url.searchParams.set(k, todos[k]); });
  location.href = url.toString();
}

async function procesarRetornoOAuth() {
  const params = new URLSearchParams(location.search);
  const codigo = params.get('code');
  const estado = params.get('state');
  const error = params.get('error');
  if ((!codigo && !error) || !estado) return null;
  const pendiente = leerJsonLocal('documentacion_oauth_pendiente', null);
  history.replaceState(null, '', location.pathname);
  guardarJsonLocal('documentacion_oauth_pendiente', null);
  if (!pendiente || pendiente.estado !== estado || !PROVEEDORES[pendiente.id]) return null;
  const prov = PROVEEDORES[pendiente.id];
  if (error || !codigo) { mostrarToast(trad('No se completó la conexión con {nube}.', { nube: prov.nombre }), true); return null; }
  if (!mostrandoDatosLocales) { mostrarApp(); mostrarPantallaCarga(); }
  try {
    await prov.canjearCodigo(codigo, pendiente.verificador);
    return prov.id;
  } catch (e) {
    console.error(e);
    guardarProv(prov.id, null);
    if (!mostrandoDatosLocales) volverALogin();
    mostrarToast(trad('No se pudo conectar con {nube}.', { nube: prov.nombre }), true);
    return null;
  }
}

async function pedirToken(url, campos) {
  let res;
  try {
    res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(campos) });
  } catch (e) { throw new Error('sin-red'); }
  const json = await res.json().catch(() => ({}));
  if (!res.ok) { const err = new Error(json.error || 'token'); err.rechazado = true; throw err; }
  return json;
}

async function renovarConRefresco(id, url, camposExtra) {
  const s = leerProv(id);
  if (!s || !s.refresco) throw new Error('reconectar');
  try {
    const t = await pedirToken(url, Object.assign({ grant_type: 'refresh_token', refresh_token: s.refresco }, camposExtra));
    const nuevo = Object.assign({}, s, { acceso: t.access_token, expira: Date.now() + t.expires_in * 1000 });
    if (t.refresh_token) nuevo.refresco = t.refresh_token;
    guardarProv(id, nuevo);
    return nuevo.acceso;
  } catch (e) {
    if (e.rechazado && ['invalid_grant', 'invalid_client', 'unauthorized_client'].includes(e.message)) throw new Error('reconectar');
    throw e;
  }
}

// Petición autenticada a Dropbox; si el token ha caducado justo
// entre medias, se renueva y se reintenta una vez.
async function fetchNube(id, url, opciones = {}, timeoutMs = 30000) {
  const prov = PROVEEDORES[id];
  async function intentar(token) {
    const cabeceras = Object.assign({ Authorization: `Bearer ${token}` }, opciones.headers || {});
    const controlador = new AbortController();
    const limite = setTimeout(() => controlador.abort(), timeoutMs);
    try {
      return await fetch(url, Object.assign({}, opciones, { headers: cabeceras, signal: controlador.signal }));
    } finally { clearTimeout(limite); }
  }
  let res = await intentar(await prov.token());
  if (res.status === 401) {
    const s = leerProv(id);
    if (s) { s.expira = 0; guardarProv(id, s); }
    res = await intentar(await prov.token());
    if (res.status === 401) throw new Error('reconectar');
  }
  return res;
}

function limpiarNombreRuta(nombre) {
  return String(nombre).replace(/[\\/:*?"<>|]/g, '-').replace(/[. ]+$/, '').trim() || 'sin nombre';
}
function rutaRemota(ctx, nombreArchivo) {
  return [limpiarNombreRuta(ctx.persona.nombre), limpiarNombreRuta(ctx.categoria.nombre), limpiarNombreRuta(nombreArchivo)];
}
// Dónde debería estar cada archivo según los nombres de ahora.
function destinoDe(doc) {
  return {
    persona: datos.personas.find((p) => p.id === doc.personaId) || { id: '-', nombre: 'Sin persona' },
    categoria: datos.categorias.find((c) => c.id === doc.categoria) || CATEGORIA_SIN_ASIGNAR,
  };
}
function claveRuta(destino, pagina, doc) {
  return [destino.persona.nombre, destino.categoria.nombre, nombreArchivoRemoto(pagina, doc)].map(limpiarNombreRuta).join('/');
}
// Nombre con el que se guarda una página en la nube. Siempre empieza por el nombre del
// documento, porque en la nube todos los documentos de una persona y categoría comparten
// carpeta: "DNI - Página 2", "DNI - Reverso". Si la página ya se llama como el documento
// (la primera, normalmente) o ya empieza por su nombre, se deja tal cual.
function nombreBaseRemoto(pagina, doc) {
  let base = (pagina.nombre || '').trim();
  const nombreDoc = doc && doc.nombre ? doc.nombre.trim() : '';
  if (nombreDoc) {
    const b = base.toLowerCase(), d = nombreDoc.toLowerCase();
    const yaEmpieza = b.startsWith(d) && (b.length === d.length || !/[\p{L}\p{N}]/u.test(b.charAt(d.length)));
    if (!base) base = nombreDoc;
    else if (!yaEmpieza) base = nombreDoc + ' - ' + base;
  }
  return base;
}
function nombreArchivoRemoto(pagina, doc) {
  const ext = MAPA_EXTENSIONES_MIME[pagina.mimeType] || '';
  const base = nombreBaseRemoto(pagina, doc);
  return ext && !base.toLowerCase().endsWith(ext) ? base + ext : base;
}
// El documento al que pertenece una página (las páginas son los mismos objetos que están en datos).
function documentoDePagina(pagina) {
  return datos.documentos.find((d) => d.paginas.includes(pagina)) || null;
}
// Dropbox exige que la cabecera Dropbox-API-Arg sea ASCII: lo demás va como \uXXXX.
function argDropbox(obj) {
  return JSON.stringify(obj).replace(/[\u007f-\uffff]/g, (c) => '\\u' + ('0000' + c.charCodeAt(0).toString(16)).slice(-4));
}

const PROVEEDORES = {
  google: {
    id: 'google', nombre: 'Google Drive',
    configurado: () => !CLIENT_ID.includes('TU_CLIENT_ID'),
    conectado: () => !!leerProv('google'),
    correo: () => (leerProv('google') || {}).email || '',
    conectar() {
      if (!tokenClient) { mostrarToast('Google no está disponible ahora mismo.', true); return; }
      tokenClient.requestAccessToken({ prompt: 'consent' });
    },
    async token() {
      if (accessToken && tokenExpiry > Date.now() + 60000) return accessToken;
      const ok = await solicitarRenovacionSilenciosa();
      if (!ok) throw new Error('reconectar');
      return accessToken;
    },
    async preparar() { await asegurarCarpeta(); },
    urlCarpeta() { return carpetaId ? `https://drive.google.com/drive/folders/${carpetaId}` : null; },
    async subir(ctx, blob, nombreArchivo) {
      const carpeta = await carpetaDestinoDocumento(ctx.persona, ctx.categoria);
      return subirArchivoADrive(blob, nombreArchivo, carpeta);
    },
    async borrar(ref) {
      const res = await llamarGoogle(`https://www.googleapis.com/drive/v3/files/${ref}`, { method: 'DELETE' });
      if (!res.ok && res.status !== 404) throw new Error('borrar');
    },
    // Renombra y/o cambia de carpeta el archivo (en Drive su id no cambia).
    async mover(ref, destino, nombreArchivo) {
      const carpeta = await carpetaDestinoDocumento(destino.persona, destino.categoria);
      const info = await llamarGoogle(`https://www.googleapis.com/drive/v3/files/${ref}?fields=id,parents`);
      if (!info.ok) throw new Error('mover');
      const anteriores = ((await info.json()).parents || []).filter((p) => p !== carpeta);
      const parametros = `addParents=${carpeta}` + (anteriores.length ? `&removeParents=${anteriores.join(',')}` : '');
      const res = await llamarGoogle(`https://www.googleapis.com/drive/v3/files/${ref}?${parametros}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: nombreArchivo }),
      });
      if (!res.ok) throw new Error('mover');
      return ref;
    },
    // Recorre las carpetas de personas y categorías que existen ahora y borra las
    // que estén vacías (solo las vacías: borrarCarpetaSiVacia comprueba que no
    // tengan nada dentro). Nunca toca la carpeta raíz ni el archivo de datos.
    async barrerCarpetasVacias() {
      const carpetasDe = async (idPadre) => {
        const q = encodeURIComponent(`'${idPadre}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`);
        const res = await llamarGoogle(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)&pageSize=200`);
        return res.ok ? ((await res.json()).files || []) : [];
      };
      let borradas = 0;
      for (const persona of await carpetasDe(carpetaId)) {
        for (const categoria of await carpetasDe(persona.id)) { if (await borrarCarpetaSiVacia(categoria.id)) borradas++; }
        if (await borrarCarpetaSiVacia(persona.id)) borradas++;
      }
      // las carpetas guardadas en memoria pueden ser ya inexistentes
      if (borradas) Object.keys(cacheCarpetas).forEach((k) => delete cacheCarpetas[k]);
    },
    // Tras mover archivos, borra las carpetas antiguas (persona/categoría por su
    // nombre) que se hayan quedado vacías. Solo borra las que no tengan nada.
    async limpiarCarpetasVaciasDe(ref, clave) {
      const [persona, categoria] = String(clave).split('/');
      if (!persona || !categoria) return;
      const idPersona = await buscarCarpeta(persona, carpetaId);
      if (!idPersona) return;
      const idCategoria = await buscarCarpeta(categoria, idPersona);
      if (idCategoria) await borrarCarpetaSiVacia(idCategoria);
      await borrarCarpetaSiVacia(idPersona);
    },
    async bajar(ref) {
      const res = await llamarGoogle(`https://www.googleapis.com/drive/v3/files/${ref}?alt=media`, {}, 120000);
      if (!res.ok) throw new Error('bajar');
      return res.blob();
    },
    async leerDatos() {
      const q = encodeURIComponent(`name='${NOMBRE_METADATOS}' and '${carpetaId}' in parents and trashed=false`);
      const busq = await llamarGoogle(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)`);
      const resultado = await busq.json();
      if (!resultado.files || resultado.files.length === 0) { archivoMetadatosId = null; return null; }
      archivoMetadatosId = resultado.files[0].id;
      const contenido = await llamarGoogle(`https://www.googleapis.com/drive/v3/files/${archivoMetadatosId}?alt=media`, {}, 30000);
      if (!contenido.ok) throw new Error('leer');
      return contenido.text();
    },
    async escribirDatos(texto) {
      const blob = new Blob([texto], { type: 'application/json' });
      if (!archivoMetadatosId) await this.leerDatos();
      if (!archivoMetadatosId) {
        const metadata = { name: NOMBRE_METADATOS, parents: [carpetaId], mimeType: 'application/json' };
        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        form.append('file', blob);
        const res = await llamarGoogle('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id', { method: 'POST', body: form }, 60000);
        if (!res.ok) { await comprobarNubeLlena(res, 'google'); throw new Error('escribir'); }
        archivoMetadatosId = (await res.json()).id;
      } else {
        const res = await llamarGoogle(`https://www.googleapis.com/upload/drive/v3/files/${archivoMetadatosId}?uploadType=media`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: blob,
        }, 60000);
        if (!res.ok) { await comprobarNubeLlena(res, 'google'); throw new Error('escribir'); }
      }
    },
    // De estas referencias (ids de archivo), devuelve las que YA NO están en Drive: borradas
    // (incluso a la papelera) fuera de la app. Se mira el listado de archivos de la app y,
    // de los que no salen, se confirma uno a uno por su id (el listado puede ir con retraso,
    // el acceso por id no). Si algo falla, no se da nada por perdido.
    async archivosPerdidos(refs) {
      const presentes = new Set();
      let pagina = '';
      do {
        const q = encodeURIComponent("trashed=false and mimeType!='application/vnd.google-apps.folder'");
        const res = await llamarGoogle(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=nextPageToken,files(id)&pageSize=1000${pagina ? '&pageToken=' + encodeURIComponent(pagina) : ''}`, {}, 30000);
        if (!res.ok) return [];
        const json = await res.json();
        (json.files || []).forEach((f) => presentes.add(f.id));
        pagina = json.nextPageToken || '';
      } while (pagina);
      const perdidos = [];
      for (const ref of refs.filter((r) => !presentes.has(r))) {
        const res = await llamarGoogle(`https://www.googleapis.com/drive/v3/files/${ref}?fields=id,trashed`);
        if (res.status === 404) perdidos.push(ref);
        else if (res.ok && (await res.json()).trashed) perdidos.push(ref);
      }
      return perdidos;
    },
    async desconectar() {
      if (accessToken) { try { google.accounts.oauth2.revoke(accessToken, () => {}); } catch (e) { /* ignorar */ } }
      accessToken = null; tokenExpiry = 0;
      localStorage.removeItem('documentacion_sesion');
      localStorage.removeItem('documentacion_carpeta_id');
      carpetaId = null; archivoMetadatosId = null;
      Object.keys(cacheCarpetas).forEach((k) => delete cacheCarpetas[k]);
    },
  },

  dropbox: {
    id: 'dropbox', nombre: 'Dropbox',
    configurado: () => !!DROPBOX_APP_KEY,
    conectado: () => !!leerProv('dropbox'),
    correo: () => (leerProv('dropbox') || {}).email || '',
    conectar() {
      return iniciarOAuthPkce('dropbox', 'https://www.dropbox.com/oauth2/authorize', { client_id: DROPBOX_APP_KEY, token_access_type: 'offline' });
    },
    async canjearCodigo(codigo, verificador) {
      const t = await pedirToken('https://api.dropboxapi.com/oauth2/token', {
        grant_type: 'authorization_code', code: codigo, client_id: DROPBOX_APP_KEY,
        redirect_uri: URI_REDIRECCION(), code_verifier: verificador,
      });
      guardarProv('dropbox', { acceso: t.access_token, expira: Date.now() + t.expires_in * 1000, refresco: t.refresh_token, email: '' });
      try {
        const res = await fetchNube('dropbox', 'https://api.dropboxapi.com/2/users/get_current_account', { method: 'POST' });
        const info = await res.json();
        const s = leerProv('dropbox'); s.email = info.email || ''; s.idioma = info.locale || ''; guardarProv('dropbox', s);
      } catch (e) { /* el correo es solo informativo */ }
    },
    async token() {
      const s = leerProv('dropbox');
      if (!s) throw new Error('reconectar');
      if (s.acceso && s.expira > Date.now() + 60000) return s.acceso;
      return renovarConRefresco('dropbox', 'https://api.dropboxapi.com/oauth2/token', { client_id: DROPBOX_APP_KEY });
    },
    async preparar() { this.carpetasAseguradas = new Set(); },
    // Dropbox crea las carpetas al subir, pero no se da por hecho que lo haga al
    // mover: se crean antes (si ya existían, devuelve 409 y no pasa nada).
    async asegurarCarpetaRuta(ruta) {
      if (!this.carpetasAseguradas) this.carpetasAseguradas = new Set();
      const clave = ruta.toLowerCase();
      if (this.carpetasAseguradas.has(clave)) return;
      const res = await fetchNube('dropbox', 'https://api.dropboxapi.com/2/files/create_folder_v2', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path: ruta, autorename: false }),
      });
      if (!res.ok && res.status !== 409) throw new Error('carpeta');
      this.carpetasAseguradas.add(clave);
    },
    // Renombra y/o mueve el archivo; devuelve su nueva ruta (en Dropbox la ruta es la referencia).
    async mover(ref, destino, nombreArchivo) {
      const partes = rutaRemota(destino, nombreArchivo);
      await this.asegurarCarpetaRuta('/' + partes[0]);
      await this.asegurarCarpetaRuta('/' + partes[0] + '/' + partes[1]);
      const nueva = '/' + partes.join('/');
      if (nueva.toLowerCase() === ref.toLowerCase()) return ref;
      const res = await fetchNube('dropbox', 'https://api.dropboxapi.com/2/files/move_v2', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ from_path: ref, to_path: nueva, autorename: true }),
      });
      if (!res.ok) throw new Error('mover');
      return (await res.json()).metadata.path_display;
    },
    // La carpeta de aplicación de Dropbox se llama como la app en su consola. En
    // la dirección web, la carpeta "Apps" aparece traducida al idioma de la
    // cuenta (en español, "Aplicaciones"); el idioma se guarda al conectar.
    urlCarpeta() {
      const idioma = ((leerProv('dropbox') || {}).idioma || navigator.language || '').toLowerCase();
      const carpetaApps = idioma.startsWith('es') ? 'Aplicaciones' : 'Apps';
      return 'https://www.dropbox.com/home/' + carpetaApps + '/' + encodeURIComponent(NOMBRE_APP_DROPBOX);
    },
    async subirRuta(ruta, blob, modo) {
      const res = await fetchNube('dropbox', 'https://content.dropboxapi.com/2/files/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/octet-stream', 'Dropbox-API-Arg': argDropbox({ path: ruta, mode: modo, autorename: modo === 'add', mute: true }) },
        body: blob,
      }, 180000);
      if (!res.ok) { await comprobarNubeLlena(res, 'dropbox'); throw new Error('subir'); }
      return (await res.json()).path_display;
    },
    async subir(ctx, blob, nombreArchivo) {
      return this.subirRuta('/' + rutaRemota(ctx, nombreArchivo).join('/'), blob, 'add');
    },
    async borrar(ref) {
      const res = await fetchNube('dropbox', 'https://api.dropboxapi.com/2/files/delete_v2', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path: ref }),
      });
      if (!res.ok && res.status !== 409) throw new Error('borrar');
    },
    // Tras borrar un archivo, sube por sus carpetas (categoría y luego persona,
    // según la ruta real del archivo) borrando las que se hayan quedado vacías.
    // Se para en la primera que tenga algo dentro y nunca toca la raíz.
    async limpiarCarpetasVaciasDe(ref) {
      const partes = ref.split('/').filter(Boolean);
      for (let n = partes.length - 1; n >= 1; n--) {
        const carpeta = '/' + partes.slice(0, n).join('/');
        const lista = await fetchNube('dropbox', 'https://api.dropboxapi.com/2/files/list_folder', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path: carpeta, limit: 1 }),
        });
        if (lista.status === 409) continue; // ya no existe
        if (!lista.ok) return;
        const contenido = await lista.json();
        if (contenido.entries.length > 0) return;
        await this.borrar(carpeta);
      }
    },
    // Recorre las carpetas de personas y categorías que existen ahora y borra las
    // vacías. Los archivos sueltos de la raíz (el de datos) no se tocan.
    async barrerCarpetasVacias() {
      const listar = async (ruta) => {
        const res = await fetchNube('dropbox', 'https://api.dropboxapi.com/2/files/list_folder', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path: ruta, limit: 200 }),
        });
        return res.ok ? ((await res.json()).entries || []) : null; // null = no se pudo mirar: nunca se da por vacía
      };
      const borrarSiVacia = async (ruta) => {
        const contenido = await listar(ruta);
        if (!contenido || contenido.length > 0) return false;
        await this.borrar(ruta);
        return true;
      };
      const raiz = await listar('');
      for (const persona of (raiz || []).filter((e) => e['.tag'] === 'folder')) {
        const hijas = await listar(persona.path_display);
        for (const categoria of (hijas || []).filter((e) => e['.tag'] === 'folder')) await borrarSiVacia(categoria.path_display);
        await borrarSiVacia(persona.path_display);
      }
    },
    async descargar(ruta) {
      return fetchNube('dropbox', 'https://content.dropboxapi.com/2/files/download', {
        method: 'POST', headers: { 'Dropbox-API-Arg': argDropbox({ path: ruta }) },
      }, 180000);
    },
    async bajar(ref) {
      const res = await this.descargar(ref);
      if (!res.ok) throw new Error('bajar');
      return res.blob();
    },
    async leerDatos() {
      const res = await this.descargar('/' + NOMBRE_METADATOS);
      if (res.status === 409) return null;
      if (!res.ok) throw new Error('leer');
      return res.text();
    },
    async escribirDatos(texto) {
      await this.subirRuta('/' + NOMBRE_METADATOS, new Blob([texto], { type: 'application/json' }), 'overwrite');
    },
    // De estas referencias (rutas), devuelve las que YA NO están en Dropbox: borradas fuera de
    // la app. Se mira el listado completo de la carpeta de la app y, de las que no salen,
    // se confirma una a una que Dropbox dice "no existe". Si algo falla, no se da nada por perdido.
    async archivosPerdidos(refs) {
      const presentes = new Set();
      let res = await fetchNube('dropbox', 'https://api.dropboxapi.com/2/files/list_folder', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path: '', recursive: true, limit: 2000 }),
      }, 60000);
      for (;;) {
        if (!res.ok) return [];
        const json = await res.json();
        (json.entries || []).forEach((e) => { if (e['.tag'] === 'file') presentes.add(String(e.path_lower)); });
        if (!json.has_more) break;
        res = await fetchNube('dropbox', 'https://api.dropboxapi.com/2/files/list_folder/continue', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cursor: json.cursor }),
        }, 60000);
      }
      const perdidos = [];
      for (const ref of refs.filter((r) => !presentes.has(String(r).toLowerCase()))) {
        const res2 = await fetchNube('dropbox', 'https://api.dropboxapi.com/2/files/get_metadata', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path: ref }),
        });
        if (res2.status === 409) {
          const cuerpo = await res2.json().catch(() => ({}));
          if (String(cuerpo.error_summary || '').startsWith('path/not_found')) perdidos.push(ref);
        }
      }
      return perdidos;
    },
    async desconectar() {
      try { await fetchNube('dropbox', 'https://api.dropboxapi.com/2/auth/token/revoke', { method: 'POST' }); } catch (e) { /* ignorar */ }
    },
  },
};

// ---- Copia en segundo plano ----

const estadoProv = {}; // id → 'ok' | 'copiando' | 'reconectar' | 'llena' | 'error'
const avisadoReconectar = {};
const avisadoLlena = {};
let respaldoEnCurso = false;
let respaldoPendiente = false;
let temporizadorRespaldo = null;

function programarRespaldo(espera = 2000) {
  clearTimeout(temporizadorRespaldo);
  temporizadorRespaldo = setTimeout(ejecutarRespaldo, espera);
}
window.addEventListener('online', () => { olvidarDescargasFallidas(); programarRespaldo(1000); });
document.addEventListener('visibilitychange', () => { if (!document.hidden) { olvidarDescargasFallidas(); setTimeout(sincronizarSiToca, 1500); } });

// Una pasada por todas las nubes indicadas; devuelve si alguna aportó datos
// nuevos al móvil. Con forzar, cada nube se consulta aunque no haya nada que subir.
async function pasadaDeRespaldo(activos, forzar) {
  let huboAdopcion = false;
  await Promise.all(activos.map((id) => respaldarEn(id, forzar)
    .then((adoptado) => { if (adoptado) huboAdopcion = true; })
    .catch((e) => { console.error(e); estadoProv[id] = 'error'; })));
  return huboAdopcion;
}

async function ejecutarRespaldo() {
  if (respaldoEnCurso) { respaldoPendiente = true; return; }
  if (!navigator.onLine || document.hidden) return;
  const activos = Object.keys(PROVEEDORES).filter((id) => PROVEEDORES[id].conectado());
  if (!activos.length) return;
  respaldoEnCurso = true;
  let huboAdopcion = false;
  try {
    huboAdopcion = await pasadaDeRespaldo(activos, false);
  } finally { respaldoEnCurso = false; }
  refrescarEstadoAjustes();
  // Si una nube ha aportado datos nuevos al móvil, las demás también tienen
  // que adoptarlos: se baja lo que falte y se hace otra pasada.
  if (huboAdopcion) respaldoPendiente = true;
  if (respaldoPendiente) { respaldoPendiente = false; descargarFaltantes(); programarRespaldo(500); }
  else descargarFaltantes();
}

const pausa = (ms) => new Promise((r) => setTimeout(r, ms));

// Sincronización automática: SOLO al abrir la app o al volver a ella desde
// segundo plano, y como mucho una vez por hora (aunque se abra y cierre varias
// veces), se consulta cada nube y se suma en los dos sentidos (sincronizarTodo).
// Si aún no toca, solo se hace la pasada normal, que envía lo pendiente. Los
// cambios propios se copian a las nubes al momento, sin esperar a esta consulta.
const CLAVE_ULTIMA_SYNC = 'documentacion_ultima_sync';
const MINUTOS_ENTRE_SINCRONIZACIONES = 60;
const ultimaSincronizacion = () => parseInt(localStorage.getItem(CLAVE_ULTIMA_SYNC) || '0', 10) || 0;
function sincronizacionDebida() {
  return Date.now() - ultimaSincronizacion() >= MINUTOS_ENTRE_SINCRONIZACIONES * 60000;
}
async function sincronizarSiToca() {
  if (!hayProveedores() || !navigator.onLine || document.hidden || respaldoEnCurso) return;
  if (!sincronizacionDebida()) { programarRespaldo(200); return; }
  await sincronizarTodo();
}
function textoUltimaSync() {
  if (!hayProveedores()) return '';
  const ultima = ultimaSincronizacion();
  const cuando = ultima
    ? new Date(ultima).toLocaleString(({ es: 'es-ES', en: 'en-GB', ca: 'ca-ES' })[idiomaActual], { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : trad('todavía no');
  return trad('Última sincronización automática: {cuando}', { cuando });
}

// Antes de exportar: consulta TODAS las nubes conectadas (aunque no haya nada
// nuevo que subir), suma lo suyo al móvil y lo del móvil a cada una, y baja los
// archivos que solo estén en la nube. Se repite mientras alguna nube siga
// aportando algo, para que todas terminen iguales. Devuelve las nubes que no
// se pudieron sincronizar.
async function sincronizarTodo() {
  clearTimeout(temporizadorRespaldo);
  olvidarDescargasFallidas(); // una consulta completa reintenta también lo que falló antes
  while (respaldoEnCurso) await pausa(200);
  const activos = Object.keys(PROVEEDORES).filter((id) => PROVEEDORES[id].conectado());
  if (!activos.length) return { fallos: [] };
  respaldoEnCurso = true;
  try {
    let forzar = true;
    for (let vuelta = 0; vuelta < 3; vuelta++) {
      const huboAdopcion = await pasadaDeRespaldo(activos, forzar);
      forzar = false;
      await descargarFaltantes();
      if (!huboAdopcion) break;
    }
  } finally { respaldoEnCurso = false; }
  const fallos = activos.filter((id) => estadoProv[id] !== 'ok').map((id) => PROVEEDORES[id].nombre);
  if (!fallos.length) localStorage.setItem(CLAVE_ULTIMA_SYNC, String(Date.now()));
  refrescarEstadoAjustes();
  return { fallos };
}

function paginaSigueExistiendo(pagina) {
  return datos.documentos.some((d) => d.paginas.includes(pagina));
}

// ¿Hay algo que enviar a esta nube? Si no, ni se toca la red (así tampoco
// hay renovaciones de Google que se noten sin necesidad).
async function hayTrabajo(id) {
  if (leerEstadoProv(id).revSubida !== revisionLocal()) return true;
  if (leerJsonLocal(CLAVE_BORRADOS, []).some((b) => b.prov === id)) return true;
  for (const doc of datos.documentos) {
    for (const pagina of doc.paginas) {
      const ref = pagina.remotos && pagina.remotos[id];
      if (ref) {
        // ya está en la nube: hay trabajo si sus nombres han cambiado
        const actual = pagina.rutas && pagina.rutas[id];
        if (actual && actual !== claveRuta(destinoDe(doc), pagina, doc)) return true;
        continue;
      }
      if (await cacheObtener(pagina.archivoId)) return true;
    }
  }
  return false;
}

function pendientesProv(id) {
  let n = leerJsonLocal(CLAVE_BORRADOS, []).filter((b) => b.prov === id).length;
  datos.documentos.forEach((d) => d.paginas.forEach((p) => { if (!(p.remotos && p.remotos[id])) n++; }));
  return n;
}

// Lo que llega de fuera (archivo de copia, copia de la nube, caché local) se limpia antes de usarlo: el color,
// la foto y el icono acaban dentro de atributos style/src, así que no pueden traer otra cosa que lo esperado.
const RE_COLOR_SEGURO = /^#[0-9a-f]{3,8}$/i;
const RE_FOTO_SEGURA = /^data:image\/(png|jpe?g|webp|gif);base64,[a-z0-9+/=]+$/i;
const RE_FECHA_ISO = /^\d{4}-\d{2}-\d{2}$/;
function sanearDatos(d) {
  if (!d || typeof d !== 'object') return d;
  const texto = (v) => (typeof v === 'string' ? v : v == null ? '' : String(v));
  (Array.isArray(d.personas) ? d.personas : []).forEach((p) => {
    p.nombre = texto(p.nombre);
    if (p.foto && !RE_FOTO_SEGURA.test(p.foto)) p.foto = null;
    if (p.icono && !ICONOS_AVATAR.some((i) => i.id === p.icono)) p.icono = null;
  });
  (Array.isArray(d.categorias) ? d.categorias : []).forEach((c) => {
    c.nombre = texto(c.nombre);
    if (!RE_COLOR_SEGURO.test(c.color || '')) c.color = CATEGORIA_SIN_ASIGNAR.color;
  });
  (Array.isArray(d.documentos) ? d.documentos : []).forEach((doc) => {
    doc.nombre = texto(doc.nombre);
    if (doc.fechaCaducidad && !RE_FECHA_ISO.test(doc.fechaCaducidad)) doc.fechaCaducidad = null;
    (Array.isArray(doc.paginas) ? doc.paginas : []).forEach((pg) => {
      pg.nombre = texto(pg.nombre);
      if (pg.mimeType && !/^[\w.+-]+\/[\w.+-]+$/.test(pg.mimeType)) pg.mimeType = 'application/octet-stream';
    });
  });
  return d;
}

function interpretarCopia(texto) {
  try {
    const p = JSON.parse(texto);
    if (p && p.formato === 2 && p.datos) return { dispositivo: p.dispositivo, actualizadoEn: p.actualizadoEn, datos: sanearDatos(p.datos), legado: false };
    if (p && (p.personas || p.documentos)) return { dispositivo: null, actualizadoEn: null, datos: sanearDatos(p), legado: true };
  } catch (e) { /* copia ilegible: se trata como si no hubiera */ }
  return null;
}

// La copia de la nube es "ajena" si no la subió este móvil (o es del formato
// antiguo) y este móvil aún no la había visto: hay que sumarla, no pisarla.
function hayCopiaAjena(estado, remoto) {
  if (remoto.legado) return true;
  if (remoto.dispositivo === idDispositivo()) return false;
  if (estado.actualizadoEn && estado.actualizadoEn === remoto.actualizadoEn) return false;
  return true;
}

// Cada elemento (persona, categoría, documento y página) lleva la hora de su
// última modificación, "mod". Se pone sola al guardar (estamparCambios): se
// compara con cómo estaba la última vez y, si ha cambiado, se marca la hora.
// Así, al juntar dos copias, de cada elemento gana SIEMPRE la versión más
// reciente, venga del móvil o de cualquier nube (renombrados, fechas, colores,
// fotos...). Las firmas de la última vez se guardan aparte, para no ensuciar los datos.
const CLAVE_FIRMAS = 'documentacion_firmas';
function cyrb53(texto) {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < texto.length; i++) {
    const c = texto.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2654435761);
    h2 = Math.imul(h2 ^ c, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}
function firmaDe(obj, excluir) {
  const copia = {};
  Object.keys(obj).sort().forEach((k) => { if (!excluir.includes(k)) copia[k] = obj[k]; });
  return cyrb53(JSON.stringify(copia));
}
function recorrerElementos(fn) {
  datos.personas.forEach((p) => fn('p:' + p.id, p, ['mod']));
  datos.categorias.forEach((c) => fn('c:' + c.id, c, ['mod']));
  datos.documentos.forEach((d) => {
    fn('d:' + d.id, d, ['mod', 'paginas']);
    (d.paginas || []).forEach((g) => fn('g:' + g.archivoId, g, ['mod', 'remotos', 'rutas']));
  });
}
function estamparCambios() {
  const antes = leerJsonLocal(CLAVE_FIRMAS, {});
  const ahora = {};
  const t = Date.now();
  recorrerElementos((clave, obj, excluir) => {
    const firma = firmaDe(obj, excluir);
    ahora[clave] = firma;
    if (antes[clave] !== firma) obj.mod = t;
  });
  guardarJsonLocal(CLAVE_FIRMAS, ahora);
}
// Da por buenas las versiones actuales (tras traer datos de una nube): lo
// adoptado no es un cambio propio y no debe llevar la hora de ahora.
function registrarFirmas() {
  const ahora = {};
  recorrerElementos((clave, obj, excluir) => { ahora[clave] = firmaDe(obj, excluir); });
  guardarJsonLocal(CLAVE_FIRMAS, ahora);
}
function adoptarCampos(propio, ajeno, excluir) {
  Object.keys(ajeno).forEach((k) => { if (!excluir.includes(k)) propio[k] = ajeno[k]; });
  Object.keys(propio).forEach((k) => { if (!excluir.includes(k) && !(k in ajeno)) delete propio[k]; });
}

// Suma lo de este móvil y lo de una nube SIN quitar nada de ninguno de los
// dos lados: lo que solo estaba en la nube pasa al móvil (los archivos se
// bajan después), lo que solo estaba en el móvil se sube a continuación, y de
// lo que está en los dos se queda la versión más reciente (mod). Nada se borra
// por el camino: en una nube solo se borra lo que se elimina a mano en la app
// (encolarBorrado). Contrapartida: un borrado hecho en otro móvil no se
// propaga, y lo que este aún conserve volverá a subirse.
function fusionarConNube(id, remoto) {
  const ajeno = {
    personas: remoto.datos.personas || [],
    categorias: remoto.datos.categorias || [],
    documentos: remoto.datos.documentos || [],
  };
  normalizarDocumentosPaginas(ajeno.documentos);

  const paginasAjenas = new Map(); // id de documento → archivoId de sus páginas en la nube
  const refsNube = new Map();      // archivoId → dónde dice la nube que está en ESTA nube
  const rutasNube = new Map();     // archivoId → con qué nombres la dejó
  ajeno.documentos.forEach((d) => {
    paginasAjenas.set(d.id, new Set(d.paginas.map((p) => p.archivoId)));
    d.paginas.forEach((p) => {
      if (p.remotos && p.remotos[id]) refsNube.set(p.archivoId, p.remotos[id]);
      if (p.rutas && p.rutas[id]) rutasNube.set(p.archivoId, p.rutas[id]);
    });
  });
  const idsPersonas = new Set(ajeno.personas.map((p) => p.id));
  const idsCategorias = new Set(ajeno.categorias.map((c) => c.id));
  let propioExtra = datos.personas.some((p) => !idsPersonas.has(p.id))
    || datos.categorias.some((c) => !idsCategorias.has(c.id))
    || datos.documentos.some((d) => { const s = paginasAjenas.get(d.id); return !s || d.paginas.some((p) => !s.has(p.archivoId)); });

  let adoptado = false;
  // Une dos listas por id; de cada elemento repetido gana el de "mod" mayor.
  const unir = (propios, ajenos) => {
    const porId = new Map(propios.map((x) => [x.id, x]));
    const resultado = propios.slice();
    ajenos.forEach((a) => {
      const mio = porId.get(a.id);
      if (!mio) { resultado.push(a); adoptado = true; }
      else if ((a.mod || 0) > (mio.mod || 0)) { adoptarCampos(mio, a, []); adoptado = true; }
      else if ((mio.mod || 0) > (a.mod || 0)) propioExtra = true;
    });
    return resultado;
  };
  datos.personas = unir(datos.personas, ajeno.personas);
  datos.categorias = unir(datos.categorias, ajeno.categorias);
  const propios = new Map(datos.documentos.map((d) => [d.id, d]));
  ajeno.documentos.forEach((d) => {
    const propio = propios.get(d.id);
    if (!propio) { datos.documentos.push(d); adoptado = true; return; }
    if ((d.mod || 0) > (propio.mod || 0)) { adoptarCampos(propio, d, ['paginas']); adoptado = true; }
    else if ((propio.mod || 0) > (d.mod || 0)) propioExtra = true;
    d.paginas.forEach((p) => {
      const mia = propio.paginas.find((x) => x.archivoId === p.archivoId);
      if (!mia) { propio.paginas.push(p); adoptado = true; return; }
      if (!mia.remotos) mia.remotos = {};
      if ((p.mod || 0) > (mia.mod || 0)) { adoptarCampos(mia, p, ['remotos', 'archivoId', 'rutas']); adoptado = true; }
      else if ((mia.mod || 0) > (p.mod || 0)) propioExtra = true;
      Object.keys(p.remotos || {}).forEach((k) => { if (!mia.remotos[k]) { mia.remotos[k] = p.remotos[k]; adoptado = true; } });
      if (!mia.rutas) mia.rutas = {};
      Object.keys(p.rutas || {}).forEach((k) => { if (!mia.rutas[k]) { mia.rutas[k] = p.rutas[k]; adoptado = true; } });
    });
  });
  // Lo que la propia nube lista manda sobre lo que este móvil creía: si el
  // móvil daba por subida una página que la nube no tiene, se vuelve a subir.
  datos.documentos.forEach((d) => d.paginas.forEach((p) => {
    if (!p.remotos) p.remotos = {};
    if (!p.rutas) p.rutas = {};
    const ref = refsNube.get(p.archivoId);
    if (ref) {
      if (p.remotos[id] !== ref) { p.remotos[id] = ref; adoptado = true; }
      // con los nombres que la propia nube dice que tiene el archivo
      const rutaNube = rutasNube.get(p.archivoId);
      if (rutaNube && p.rutas[id] !== rutaNube) { p.rutas[id] = rutaNube; adoptado = true; }
    } else if (p.remotos[id]) { delete p.remotos[id]; delete p.rutas[id]; adoptado = true; }
  }));

  registrarFirmas();
  if (adoptado) { subirRevisionLocal(); guardarDatosEnCacheLocal(); }
  guardarEstadoProv(id, { revSubida: propioExtra ? -1 : revisionLocal(), actualizadoEn: remoto.actualizadoEn });
  return { adoptado, propioExtra };
}

// Si algo se ha renombrado o ha cambiado de persona o categoría, el archivo se
// renombra o se mueve también en esta nube, para que los nombres coincidan en
// todo (móvil y nubes). Las carpetas antiguas que se queden vacías se borran.
async function reubicarEnNube(id, prov) {
  let movido = false;
  const limpiar = new Map(); // carpeta antigua → datos para limpiarla si queda vacía
  for (const doc of datos.documentos.slice()) {
    const destino = destinoDe(doc);
    for (const pagina of doc.paginas.slice()) {
      const ref = pagina.remotos && pagina.remotos[id];
      if (!ref) continue;
      if (!pagina.rutas) pagina.rutas = {};
      const deseada = claveRuta(destino, pagina, doc);
      const actual = pagina.rutas[id];
      if (!actual) { pagina.rutas[id] = deseada; continue; } // subida antes de anotar las rutas: se da por buena
      if (actual === deseada) continue;
      try {
        pagina.remotos[id] = await prov.mover(ref, destino, nombreArchivoRemoto(pagina, doc));
        pagina.rutas[id] = deseada;
        movido = true;
        guardarDatosEnCacheLocal();
        limpiar.set(actual.split('/').slice(0, 2).join('/'), { ref, clave: actual });
      } catch (e) { console.error(e); /* se reintenta en la siguiente pasada */ }
    }
  }
  if (prov.limpiarCarpetasVaciasDe) {
    for (const { ref, clave } of limpiar.values()) { try { await prov.limpiarCarpetasVaciasDe(ref, clave); } catch (e) { /* ignorar */ } }
  }
  return movido;
}

async function respaldarEn(id, forzar = false) {
  const prov = PROVEEDORES[id];
  let adoptado = false; // ¿esta nube ha aportado datos nuevos al móvil?
  if (!forzar && !(await hayTrabajo(id))) { estadoProv[id] = 'ok'; return false; }
  estadoProv[id] = 'copiando';
  refrescarEstadoAjustes();
  try {
    await prov.token();
    await prov.preparar();
    const borrados = await procesarBorradosPendientes(id);

    let estado = leerEstadoProv(id);
    const crudo = await prov.leerDatos();
    const remoto = crudo ? interpretarCopia(crudo) : null;
    if (crudo && !remoto) throw new Error('copia-ilegible'); // lo que hay en la nube no se pisa sin entenderlo
    if (remoto && hayCopiaAjena(estado, remoto)) {
      const fusion = fusionarConNube(id, remoto);
      estado = leerEstadoProv(id);
      if (fusion.adoptado) {
        adoptado = true;
        try { refrescarPantallaActual(); } catch (e) { /* ignorar */ }
        mostrarToast(trad('Se han traído a este móvil las novedades de {nube}', { nube: prov.nombre }));
      }
    }

    // Archivos que esta nube ha perdido (borrados a mano fuera de la app): se olvida su
    // referencia y más abajo se vuelven a subir desde el móvil, para que la copia
    // quede siempre completa. Solo en las consultas completas (no en cada copia).
    let recuperados = 0;
    if (forzar && prov.archivosPerdidos) {
      const conRef = [];
      datos.documentos.forEach((d) => d.paginas.forEach((p) => { if (p.remotos && p.remotos[id]) conRef.push(p); }));
      if (conRef.length) {
        const perdidos = new Set(await prov.archivosPerdidos(conRef.map((p) => p.remotos[id])));
        conRef.forEach((p) => {
          if (!perdidos.has(p.remotos[id])) return;
          delete p.remotos[id];
          if (p.rutas) delete p.rutas[id];
          recuperados++;
        });
        if (recuperados) guardarDatosEnCacheLocal();
      }
    }

    const movidos = await reubicarEnNube(id, prov);
    let subioAlgo = movidos || recuperados > 0;
    for (const doc of datos.documentos.slice()) {
      const persona = datos.personas.find((p) => p.id === doc.personaId) || { id: '-', nombre: 'Sin persona' };
      const categoria = datos.categorias.find((c) => c.id === doc.categoria) || CATEGORIA_SIN_ASIGNAR;
      for (const pagina of doc.paginas.slice()) {
        if (pagina.remotos && pagina.remotos[id]) continue;
        const blob = await cacheObtener(pagina.archivoId);
        if (!blob) continue; // aún no está en este móvil: se copiará cuando se descargue
        const ref = await prov.subir({ persona, categoria }, blob, nombreArchivoRemoto(pagina, doc));
        if (!paginaSigueExistiendo(pagina)) { try { await prov.borrar(ref); } catch (e) { /* ignorar */ } continue; }
        if (!pagina.remotos) pagina.remotos = {};
        pagina.remotos[id] = ref;
        if (!pagina.rutas) pagina.rutas = {};
        pagina.rutas[id] = claveRuta({ persona, categoria }, pagina, doc);
        subioAlgo = true;
        guardarDatosEnCacheLocal();
      }
    }

    if (recuperados) mostrarToast(recuperados === 1 ? trad('{nube} había perdido un archivo: se ha vuelto a subir', { nube: prov.nombre }) : trad('{nube} había perdido {n} archivos: se han vuelto a subir', { nube: prov.nombre, n: recuperados }));

    const rev = revisionLocal();
    if (subioAlgo || estado.revSubida !== rev || !remoto) {
      const actualizadoEn = new Date().toISOString();
      await prov.escribirDatos(JSON.stringify({ formato: 2, dispositivo: idDispositivo(), actualizadoEn, datos }));
      guardarEstadoProv(id, { revSubida: rev, actualizadoEn });
    }
    // Carpetas que hayan quedado vacías (por mover o borrar archivos). El
    // borrado inmediato no siempre las ve vacías (la nube tarda unos segundos en
    // actualizar sus listados), así que aquí se revisan las que hay de verdad.
    if ((movidos || borrados || forzar) && prov.barrerCarpetasVacias) {
      if (movidos) await pausa(2000);
      try { await prov.barrerCarpetasVacias(); } catch (e) { console.error(e); }
    }
    estadoProv[id] = 'ok';
    avisadoReconectar[id] = false;
    avisadoLlena[id] = false;
  } catch (e) {
    console.error(e);
    if (e.message === 'reconectar' || e.message === 'token-caducado') {
      estadoProv[id] = 'reconectar';
      if (!avisadoReconectar[id]) { avisadoReconectar[id] = true; mostrarToast(trad('Hay que volver a conectar {nube} (en Ajustes).', { nube: prov.nombre }), true); }
    } else if (e.message === 'nube-llena') {
      estadoProv[id] = 'llena';
      if (!avisadoLlena[id]) { avisadoLlena[id] = true; mostrarToast(trad('{nube} está llena: libera espacio para seguir copiando.', { nube: prov.nombre }), true); }
    } else {
      estadoProv[id] = 'error';
    }
  }
  return adoptado;
}

// Sustituye lo de este móvil (que estaba vacío) por la copia de una nube. Los archivos se van
// bajando después (descargarFaltantes) y mientras tanto se piden a la nube
// al abrirlos.
function restaurarCopia(id, remoto) {
  datos = {
    personas: remoto.datos.personas || [],
    categorias: remoto.datos.categorias || [],
    documentos: remoto.datos.documentos || [],
  };
  normalizarDocumentosPaginas(datos.documentos);
  registrarFirmas();
  const rev = subirRevisionLocal();
  guardarEstadoProv(id, { revSubida: rev, actualizadoEn: remoto.actualizadoEn });
  guardarDatosEnCacheLocal();
  estadoProv[id] = 'ok';
  entrarEnLaApp();
  descargarFaltantes();
}

// ---- Borrados en las nubes ----

function encolarBorrado(pagina, persona, categoria) {
  const refs = pagina.remotos || {};
  const cola = leerJsonLocal(CLAVE_BORRADOS, []);
  Object.keys(refs).forEach((prov) => {
    cola.push({
      prov, ref: refs[prov],
      persona: persona ? { id: persona.id, nombre: persona.nombre } : null,
      categoria: categoria ? { id: categoria.id, nombre: categoria.nombre } : null,
    });
  });
  guardarJsonLocal(CLAVE_BORRADOS, cola);
  programarRespaldo();
}

async function procesarBorradosPendientes(id) {
  let borrados = 0;
  const propios = leerJsonLocal(CLAVE_BORRADOS, []).filter((b) => b.prov === id);
  const carpetasTocadas = new Map();
  const rutasParaLimpiar = new Map(); // carpeta que contenía el archivo → una ruta suya
  for (const item of propios) {
    try { await PROVEEDORES[id].borrar(item.ref); } catch (e) { continue; } // se reintenta en la siguiente pasada
    guardarJsonLocal(CLAVE_BORRADOS, leerJsonLocal(CLAVE_BORRADOS, []).filter((b) => !(b.prov === item.prov && b.ref === item.ref)));
    borrados++;
    if (id === 'google' && item.persona && item.categoria) carpetasTocadas.set(`${item.persona.id}:${item.categoria.id}`, item);
    if (PROVEEDORES[id].limpiarCarpetasVaciasDe) rutasParaLimpiar.set(String(item.ref).replace(/[/][^/]*$/, ''), item.ref);
  }
  // Las carpetas que se queden vacías se borran (mejor esfuerzo: si falla, no pasa nada).
  for (const item of carpetasTocadas.values()) await limpiarCarpetasVaciasTrasBorrar(item.persona, item.categoria);
  for (const ref of rutasParaLimpiar.values()) { try { await PROVEEDORES[id].limpiarCarpetasVaciasDe(ref); } catch (e) { /* ignorar */ } }
  return borrados;
}

// ---- Archivos: primero en el móvil, las nubes son copia ----

async function guardarArchivoLocal(blob, idFijo = null) {
  const id = idFijo || (crypto.randomUUID && crypto.randomUUID()) || idUnico('arc');
  const db = await abrirCache();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(DB_TIENDA, 'readwrite');
    tx.objectStore(DB_TIENDA).put(blob, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error('sin-espacio'));
    tx.onabort = () => reject(tx.error || new Error('sin-espacio'));
  });
  return id;
}

async function bajarDeNubes(pagina) {
  for (const id of Object.keys(PROVEEDORES)) {
    const ref = pagina.remotos && pagina.remotos[id];
    const prov = PROVEEDORES[id];
    if (!ref || !prov.conectado()) continue;
    try {
      await prov.token();
      return await prov.bajar(ref);
    } catch (e) { console.error(e); }
  }
  return null;
}

let descargandoFaltantes = false;
// Archivos que no se han podido bajar: se saltan en lo que queda de pasada para no
// atascarla, pero la lista se vacía al recuperar la conexión, al volver a la app y en cada
// sincronización completa — si el fallo fue pasajero (un túnel, un corte de un segundo), se
// vuelve a intentar en vez de quedarse sin bajar hasta reiniciar la app.
const descargasFallidas = new Set();
function olvidarDescargasFallidas() { descargasFallidas.clear(); }
// Completa la copia local con los archivos que solo están en una nube (por
// ejemplo, tras recuperar una copia en un móvil nuevo).
async function descargarFaltantes() {
  if (descargandoFaltantes || !navigator.onLine || document.hidden || !hayProveedores()) return;
  descargandoFaltantes = true;
  let bajo = false;
  try {
    for (const doc of datos.documentos.slice()) {
      for (const pagina of doc.paginas.slice()) {
        if (descargasFallidas.has(pagina.archivoId)) continue;
        if (await cacheObtener(pagina.archivoId)) continue;
        try {
          const blob = await bajarDeNubes(pagina);
          if (blob) { await cacheGuardar(pagina.archivoId, blob); bajo = true; } else descargasFallidas.add(pagina.archivoId);
        } catch (e) { descargasFallidas.add(pagina.archivoId); }
      }
    }
  } finally { descargandoFaltantes = false; }
  if (bajo) programarRespaldo(1000);
}

// ---- Aviso de "solo en este móvil" ----
// Sale cuando hay documentos y ninguna nube conectada: la primera vez que se
// guarda un documento (o se importa una copia) y, si no se marca "No volver a
// mostrar", de nuevo cada DIAS_ENTRE_AVISOS días al abrir la app. Conectar una
// nube lo apaga. Marcarlo como "no volver" lo apaga aunque no haya nube.
const CLAVE_AVISO_SIN_NUBE = 'documentacion_aviso_sin_nube'; // { ultimo: ms, nunca: bool }
const DIAS_ENTRE_AVISOS = 7;
function avisarSiSinNube() {
  if (hayProveedores() || datos.documentos.length === 0) return;
  const estado = leerJsonLocal(CLAVE_AVISO_SIN_NUBE, {});
  if (estado.nunca) return;
  if (estado.ultimo && Date.now() - estado.ultimo < DIAS_ENTRE_AVISOS * 86400000) return;
  if ($('#raiz-modal .modal-fondo')) return;
  guardarJsonLocal(CLAVE_AVISO_SIN_NUBE, { ultimo: Date.now(), nunca: false });
  abrirModal(`
    <h3>Solo en este móvil</h3>
    <p style="color:var(--text-dim);font-size:.9rem;line-height:1.55;margin:0 0 14px;">Tus documentos están guardados solo en este móvil. Si borras los datos de la app o cambias de móvil, se perderían. Conecta una nube (Google Drive o Dropbox) para tener copia de seguridad.</p>
    <p style="color:var(--text-dim);font-size:.9rem;line-height:1.55;margin:0 0 14px;">También puedes guardar una copia en un archivo desde <strong style="color:var(--text-light)">Ajustes → Exportar copia</strong>, y recuperarla después con <strong style="color:var(--text-light)">Importar copia</strong>.</p>
    <label class="check-aviso" style="margin-bottom:14px;">
      <input type="checkbox" id="aviso-nunca">
      <span>No volver a mostrar este aviso</span>
    </label>
    <div style="display:flex;flex-direction:column;gap:10px;">
      <button class="btn-primario" id="aviso-conectar">Conectar una nube</button>
      <button class="btn-secundario" id="aviso-cerrar">Cerrar</button>
    </div>
  `);
  $('#aviso-conectar').addEventListener('click', () => $('#btn-ajustes').click());
  $('#aviso-cerrar').addEventListener('click', () => {
    guardarJsonLocal(CLAVE_AVISO_SIN_NUBE, { ultimo: Date.now(), nunca: $('#aviso-nunca').checked });
    volverAtras();
  });
}

// ---- Ajustes: estado de cada nube ----

function textoEstadoProv(id) {
  const est = estadoProv[id];
  if (est === 'copiando') return 'Copiando…';
  if (est === 'reconectar') return 'Hay que volver a conectar';
  if (est === 'llena') return 'Sin espacio: libera espacio para seguir copiando';
  if (est === 'error') return 'No se pudo copiar; se reintentará';
  const n = pendientesProv(id);
  return n > 0 ? trad(n === 1 ? '{n} pendiente de copiar' : '{n} pendientes de copiar', { n }) : 'Sincronizado';
}

// Marca de cada nube (fondo blanco, como su logotipo).
const MARCAS_PROV = {
  google: '<svg width="24" height="24" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.62z"/><path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.83.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.98v2.33A9 9 0 0 0 9 18z"/><path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.98A9 9 0 0 0 0 9c0 1.45.35 2.83.98 4.03l2.97-2.33z"/><path fill="#EA4335" d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .98 4.97l2.97 2.33C4.66 5.17 6.65 3.58 9 3.58z"/></svg>',
  dropbox: '<svg width="24" height="24" viewBox="0 0 24 24"><path fill="#0061FF" d="M6 1.807L0 5.629l6 3.822 6.001-3.822L6 1.807zM18 1.807l-6 3.822 6 3.822 6-3.822-6-3.822zM0 13.274l6 3.822 6.001-3.822L6 9.452l-6 3.822zM18 9.452l-6 3.822 6 3.822 6-3.822-6-3.822zM6 18.371l6.001 3.822 6-3.822-6-3.822L6 18.371z"/></svg>',
};

function htmlFilasProveedores() {
  return Object.values(PROVEEDORES).filter((p) => p.configurado()).map((p) => {
    const con = p.conectado();
    const est = estadoProv[p.id];
    const tono = !con ? 'off' : (est === 'reconectar' || est === 'error' || est === 'llena') ? 'aviso' : (est === 'copiando' || pendientesProv(p.id) > 0) ? 'copiando' : 'ok';
    const accion = !con ? 'conectar' : est === 'reconectar' ? 'reconectar' : 'desconectar';
    const etiqueta = { conectar: 'Conectar', reconectar: 'Reconectar', desconectar: 'Desconectar' }[accion];
    return `<div class="fila-prov">
      <span class="marca-prov" aria-hidden="true">${MARCAS_PROV[p.id] || ''}</span>
      <div class="info-prov">
        <strong>${p.nombre}</strong>
        ${con && p.correo() ? `<span class="correo-prov">${escapeHtml(p.correo())}</span>` : ''}
        <span class="estado-prov ${tono}"><i class="punto-estado"></i>${con ? textoEstadoProv(p.id) : 'Sin conectar'}</span>
      </div>
      <div class="fila-botones-prov">
        ${con ? `<button type="button" class="btn-prov" data-prov="${p.id}" data-accion="ver" aria-label="${trad('Ver carpeta en {nube}', { nube: p.nombre })}">Ver carpeta</button>` : ''}
        <button type="button" class="btn-prov${accion === 'desconectar' ? '' : ' primario'}" data-prov="${p.id}" data-accion="${accion}">${etiqueta}</button>
      </div>
    </div>`;
  }).join('');
}

// Lo que dice el sello: un único vistazo al estado real de las copias.
function estadoGeneralCopias() {
  const conectadas = Object.values(PROVEEDORES).filter((p) => p.conectado());
  if (!conectadas.length) return { tono: 'sin', titulo: 'Solo en este móvil', detalle: 'Conecta una nube para tener copia de seguridad.' };
  const flojas = conectadas.filter((p) => estadoProv[p.id] === 'reconectar' || estadoProv[p.id] === 'error' || estadoProv[p.id] === 'llena');
  if (flojas.length) {
    return { tono: 'aviso', titulo: 'Revisa tus copias', detalle: trad(flojas.length === 1 ? '{nubes} necesita atención.' : '{nubes} necesitan atención.', { nubes: unirConY(flojas.map((p) => p.nombre)) }) };
  }
  if (conectadas.some((p) => estadoProv[p.id] === 'copiando')) return { tono: 'copiando', titulo: 'Copiando…', detalle: 'Enviando los cambios a tus nubes.' };
  const pendientes = totalPendientes();
  if (pendientes > 0) return { tono: 'copiando', titulo: 'Copia pendiente', detalle: trad('{cosas} por enviar a tus nubes.', { cosas: contar(pendientes, 'elemento', 'elementos') }) };
  return { tono: 'ok', titulo: 'Todo a salvo', detalle: trad('Sincronizado con {nubes}.', { nubes: contar(conectadas.length, 'nube', 'nubes') }) };
}

const SIGNOS_SELLO = {
  ok: '<path class="signo" d="M31 50l12 12 23-25"/>',
  sin: '<rect class="signo" x="36" y="27" width="24" height="42" rx="5"/><path class="signo" d="M45 61h6"/>',
  aviso: '<path class="signo" d="M48 30v23"/><circle cx="48" cy="65" r="3.4" fill="currentColor"/>',
  copiando: '<path class="signo" d="M30 46a18 18 0 0 1 32-9M66 50a18 18 0 0 1-32 9M62 26v11H51M34 70V59h11"/>',
};

// Solo se "sella" (animación) cuando cambia el estado, no en cada repintado.
function refrescarSelloCopias() {
  const contenedor = $('#sello-copias');
  if (!contenedor) return;
  const e = estadoGeneralCopias();
  const cambio = contenedor.dataset.tono !== e.tono;
  contenedor.dataset.tono = e.tono;
  contenedor.innerHTML = `
    <svg class="sello ${e.tono}${cambio ? ' sellar' : ''}" viewBox="0 0 96 96" aria-hidden="true">
      <circle class="aro" cx="48" cy="48" r="44"/>
      <circle class="hilo" cx="48" cy="48" r="36"/>
      ${SIGNOS_SELLO[e.tono]}
    </svg>
    <div class="texto-sello">
      <div class="titular-sello">${e.titulo}</div>
      <p class="detalle-sello">${e.detalle}</p>
      ${hayProveedores() ? `<p class="ultima-sync" id="texto-ultima-sync">${textoUltimaSync()}</p>` : ''}
    </div>`;
}

function refrescarEstadoAjustes() {
  actualizarPuntoAjustes();
  refrescarSelloCopias();
  const lista = $('#lista-proveedores');
  if (lista) lista.innerHTML = htmlFilasProveedores();
}

async function desconectarProveedor(id) {
  const prov = PROVEEDORES[id];
  try { await prov.desconectar(); } catch (e) { /* ignorar */ }
  guardarProv(id, null);
  guardarEstadoProv(id, null);
  delete estadoProv[id];
  guardarJsonLocal(CLAVE_BORRADOS, leerJsonLocal(CLAVE_BORRADOS, []).filter((b) => b.prov !== id));
  refrescarEstadoAjustes();
  mostrarToast(trad('{nube} desconectado', { nube: prov.nombre }));
}

function totalPendientes() {
  return Object.keys(PROVEEDORES).filter((id) => PROVEEDORES[id].conectado()).reduce((s, id) => s + pendientesProv(id), 0);
}

// Cerrar sesión cuando lo del móvil no está a salvo en ninguna nube: tres
// avisos seguidos, y el último exige escribir BORRAR. Ninguno se puede
// pasar por accidente con un toque suelto.
function abrirCierreSesionTriple(sinNube, pendientes) {
  const personas = datos.personas.length;
  const docs = datos.documentos.length;
  const paginas = datos.documentos.reduce((n, d) => n + d.paginas.length, 0);
  const resumen = trad('{a}, {b} y {c}', { a: contar(personas, 'persona', 'personas'), b: contar(docs, 'documento', 'documentos'), c: contar(paginas, 'página', 'páginas') });
  const palabraBorrar = trad('BORRAR'); // la palabra que hay que escribir para confirmar, en el idioma de la interfaz
  const motivo = sinNube
    ? 'No hay ninguna nube conectada: no existe ninguna copia de seguridad.'
    : trad('Hay {cosas} que todavía no se han copiado a la nube.', { cosas: contar(pendientes, 'cosa', 'cosas') });
  const rojo = 'color:var(--stamp);font-size:.92rem;line-height:1.55;margin:0 0 12px;';
  const normal = 'color:var(--text-dim);font-size:.88rem;line-height:1.5;margin:0 0 14px;';
  const columna = 'display:flex;flex-direction:column;gap:10px;';

  function aviso1() {
    abrirModal(`
      <h3 style="color:var(--stamp);">Aviso 1 de 3</h3>
      <p style="${rojo}"><strong>${motivo}</strong></p>
      <p style="${normal}">Si cierras la sesión se borrarán de este móvil todos los documentos y sus archivos. No se podrán recuperar.</p>
      <div style="${columna}">
        <button class="btn-primario" id="triple-atras">Cancelar</button>
        <button class="btn-secundario" id="triple-exportar">Guardar antes una copia en un archivo</button>
        <button class="btn-secundario" id="triple-seguir">Entiendo el riesgo, continuar</button>
      </div>`);
    $('#triple-atras').addEventListener('click', volverAtras);
    $('#triple-exportar').addEventListener('click', () => abrirModalExportar());
    $('#triple-seguir').addEventListener('click', aviso2);
  }
  function aviso2() {
    abrirModal(`
      <h3 style="color:var(--stamp);">Aviso 2 de 3</h3>
      <p style="${rojo}"><strong>${trad('Se va a borrar todo esto: {resumen}.', { resumen })}</strong></p>
      <p style="${normal}">Esta es la única copia que existe. Si tienes un solo momento de duda, cancela y conecta una nube en Ajustes → Copias de seguridad.</p>
      <div style="${columna}">
        <button class="btn-primario" id="triple-atras">No, cancelar</button>
        <button class="btn-secundario" id="triple-seguir">Sí, quiero continuar</button>
      </div>`);
    $('#triple-atras').addEventListener('click', volverAtras);
    $('#triple-seguir').addEventListener('click', aviso3);
  }
  function aviso3() {
    abrirModal(`
      <h3 style="color:var(--stamp);">Aviso 3 de 3: último</h3>
      <p style="${rojo}"><strong>Esto no se puede deshacer.</strong></p>
      <p style="${normal}">Para confirmar, escribe <strong style="color:var(--text-light)">${palabraBorrar}</strong> en el recuadro.</p>
      <div class="campo"><input type="search" id="triple-texto" name="q" autocomplete="off" autocapitalize="characters" spellcheck="false" enterkeyhint="done" data-lpignore="true" data-1p-ignore data-form-type="other" readonly placeholder="${palabraBorrar}"></div>
      <div style="${columna}">
        <button class="btn-secundario" id="triple-atras">Cancelar</button>
        <button class="btn-secundario" id="triple-final" disabled>Borrar todo y cerrar sesión</button>
      </div>`);
    const texto = $('#triple-texto');
    evitarBarraAutorrelleno(texto);
    const final = $('#triple-final');
    texto.addEventListener('input', () => {
      final.disabled = texto.value.trim().toUpperCase() !== palabraBorrar.toUpperCase();
      final.classList.toggle('listo', !final.disabled); // se rellena en rojo para que se vea que ya se puede pulsar
    });
    $('#triple-atras').addEventListener('click', volverAtras);
    final.addEventListener('click', () => { if (texto.value.trim().toUpperCase() === palabraBorrar.toUpperCase()) cerrarSesionCompleta(); });
  }
  aviso1();
}

// Cierra todas las nubes y borra lo guardado en este móvil. Lo que ya estaba
// copiado en las nubes se conserva ahí.
async function cerrarSesionCompleta() {
  Object.keys(PROVEEDORES).forEach((id) => { if (PROVEEDORES[id].conectado()) { try { PROVEEDORES[id].desconectar(); } catch (e) { /* ignorar */ } } });
  const conservar = new Set([TEMA_STORAGE_KEY, SKIN_STORAGE_KEY, IDIOMA_STORAGE_KEY, VISTA_DOCS_STORAGE_KEY]); // el modo de inicio no se conserva: de cero se empieza en personas
  Object.keys(localStorage).filter((k) => k.startsWith('documentacion_') && !conservar.has(k)).forEach((k) => localStorage.removeItem(k));
  try { if (_dbPromesa) (await _dbPromesa).close(); } catch (e) { /* ignorar */ }
  await new Promise((res) => {
    try { const r = indexedDB.deleteDatabase(DB_NOMBRE); r.onsuccess = r.onerror = r.onblocked = () => res(); } catch (e) { res(); }
    setTimeout(res, 2000);
  });
  location.reload();
}

const DB_NOMBRE = 'documentacion_cache';
const DB_TIENDA = 'archivos';
const DB_TIENDA_DATOS = 'datos';
let _dbPromesa = null;

function abrirCache() {
  if (_dbPromesa) return _dbPromesa;
  _dbPromesa = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NOMBRE, 2);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(DB_TIENDA)) db.createObjectStore(DB_TIENDA);
      if (!db.objectStoreNames.contains(DB_TIENDA_DATOS)) db.createObjectStore(DB_TIENDA_DATOS);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return _dbPromesa;
}
async function cacheObtener(id) {
  try {
    const db = await abrirCache();
    return await new Promise((res) => {
      const tx = db.transaction(DB_TIENDA, 'readonly');
      const r = tx.objectStore(DB_TIENDA).get(id);
      r.onsuccess = () => res(r.result || null);
      r.onerror = () => res(null);
    });
  } catch (e) { return null; }
}
async function cacheGuardar(id, blob) {
  try {
    const db = await abrirCache();
    await new Promise((res) => {
      const tx = db.transaction(DB_TIENDA, 'readwrite');
      tx.objectStore(DB_TIENDA).put(blob, id);
      tx.oncomplete = () => res();
      tx.onerror = () => res();
    });
  } catch (e) { /* silencioso: la app sigue funcionando sin caché */ }
}
async function cacheBorrar(id) {
  try {
    const db = await abrirCache();
    await new Promise((res) => {
      const tx = db.transaction(DB_TIENDA, 'readwrite');
      tx.objectStore(DB_TIENDA).delete(id);
      tx.oncomplete = () => res();
      tx.onerror = () => res();
    });
  } catch (e) { /* ignorar */ }
}

async function obtenerBlobPagina(pagina) {
  const enCache = await cacheObtener(pagina.archivoId);
  if (enCache) return enCache;
  const blob = await bajarDeNubes(pagina);
  if (!blob) throw new Error('archivo-no-disponible');
  cacheGuardar(pagina.archivoId, blob);
  return blob;
}

// La pantalla de inicio tiene dos modos permanentes, elegidos con el botón
// de la topbar (actualizarBotonAlternarVista/renderizarPantallaInicio):
// "personas" (por defecto, cuadrícula de personas) o "categorías"
// (cuadrícula de categorías). El modo elegido se recuerda entre visitas,
// no solo mientras se navega, hasta que se vuelva a cambiar.
function obtenerModoInicioGuardado() {
  return localStorage.getItem('documentacion_modo_inicio') === 'categorias' ? 'categorias' : 'personas';
}
function guardarModoInicio(modo) {
  localStorage.setItem('documentacion_modo_inicio', modo);
}
let modoInicio = obtenerModoInicioGuardado();

function renderizarPantallaInicio() {
  if (modoInicio === 'categorias') renderizarCategoriasHome();
  else renderizarPersonas();
  actualizarTutorialModo();
}

// La primera vez que se ve cada modo se explica cómo pasar al otro, con el dibujo del botón de arriba.
// Se da por visto al pulsar "Entendido" o al usar ese botón.
const clavesTutorialModo = { personas: 'documentacion_tuto_personas', categorias: 'documentacion_tuto_categorias' };
function actualizarTutorialModo() {
  const caja = $('#tutorial-modo');
  const visto = (() => { try { return localStorage.getItem(clavesTutorialModo[modoInicio]) === '1'; } catch (e) { return true; } })();
  if (visto || modoEdicionPersonas || modoEdicionCategorias) { caja.classList.add('hidden'); caja.innerHTML = ''; return; }
  const aCategorias = modoInicio === 'personas';
  caja.innerHTML = `
    <span class="tuto-texto"><span>${aCategorias ? 'Para cambiar al modo categorías, pulsa el botón de abajo' : 'Para cambiar al modo personas, pulsa el botón de abajo'}</span> <span class="tuto-icono">${aCategorias ? ICONO_VER_LISTA : ICONO_VER_CUADRICULA}</span></span>
    <button type="button" class="tuto-cerrar">Entendido</button>`;
  caja.classList.remove('hidden');
  caja.querySelector('.tuto-cerrar').addEventListener('click', () => { marcarTutorialModoVisto(modoInicio); caja.classList.add('hidden'); caja.innerHTML = ''; });
}
function marcarTutorialModoVisto(modo) {
  try { localStorage.setItem(clavesTutorialModo[modo], '1'); } catch (e) { /* ignorar */ }
}

const ICONO_VER_LISTA = '<svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="5" width="18" height="3" rx="1.5"/><rect x="3" y="11" width="18" height="3" rx="1.5"/><rect x="3" y="17" width="18" height="3" rx="1.5"/></svg>';
const ICONO_VER_CUADRICULA = '<svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="3" width="8" height="8" rx="2"/><rect x="13" y="3" width="8" height="8" rx="2"/><rect x="3" y="13" width="8" height="8" rx="2"/><rect x="13" y="13" width="8" height="8" rx="2"/></svg>';

function actualizarBotonAlternarVista() {
  // Botón de la barra inferior: el icono y el nombre anuncian a qué vista se cambia
  const aCategorias = modoInicio !== 'categorias';
  $('#bar-vista').innerHTML = (aCategorias ? ICONO_VER_LISTA : ICONO_VER_CUADRICULA) + '<span>' + (aCategorias ? 'Categorías' : 'Personas') + '</span>';
  $('#bar-vista').setAttribute('aria-label', aCategorias ? 'Ver en lista (categorías)' : 'Ver en cuadrícula (personas)');
  const btn = $('#btn-ver-categorias-top');
  if (modoInicio === 'categorias') {
    // Ya se ve en lista (categorías) — el icono anuncia a qué se cambia: cuadrícula.
    btn.setAttribute('aria-label', 'Ver en cuadrícula (personas)');
    btn.innerHTML = ICONO_VER_CUADRICULA;
  } else {
    // Ya se ve en cuadrícula (personas) — el icono anuncia a qué se cambia: lista.
    btn.setAttribute('aria-label', 'Ver en lista (categorías)');
    btn.innerHTML = ICONO_VER_LISTA;
  }
}

const ICONO_BUSCAR = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2"/><path d="M21 21l-4.3-4.3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
const ICONO_AJUSTES = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>';

// La barra de abajo se reutiliza en la portada y dentro de una persona/categoría, pero con otro
// significado: "Buscar" pasa a ser "Compartir" (entra en modo selección para elegir qué compartir;
// así "Subir", en su mismo sitio de siempre —el segundo hueco—, no se mueve entre pantallas),
// "Categorías/Personas" pasa a ser "Desplegar/Replegar" (abre o cierra los grupos de documentos) y "Ajustes" pasa a ser "Exportar"
// (solo dentro de una persona: es lo único que le queda; en una categoría —todas las personas a la
// vez— sigue siendo "Ajustes", porque ahí abre los ajustes generales). Se llama al entrar o salir de
// una persona/categoría, y también cada vez que cambia el propio estado de desplegado/replegado.
function sincronizarBarraInferior() {
  const enDocs = personaActivaId !== null || categoriaGlobalActivaId !== null;
  const btnBuscar = $('#bar-buscar');
  const btnVista = $('#bar-vista');
  const btnAjustes = $('#bar-ajustes');
  if (enDocs) {
    btnBuscar.innerHTML = ICONOS_MENU.compartir + '<span>Compartir</span>';
    btnBuscar.setAttribute('aria-label', 'Compartir documentos');
    const desplegado = obtenerVistaDocsGuardada() === 'desplegado';
    btnVista.innerHTML = ICONOS_MENU.vista + '<span>' + (desplegado ? 'Replegar' : 'Desplegar') + '</span>';
    btnVista.setAttribute('aria-label', desplegado ? 'Replegar todo' : 'Desplegar todo');
    if (personaActivaId !== null) {
      btnAjustes.innerHTML = ICONOS_MENU.exportar + '<span>Exportar</span>';
      btnAjustes.setAttribute('aria-label', 'Exportar copia');
    } else {
      btnAjustes.innerHTML = ICONO_AJUSTES + '<span>Ajustes</span>';
      btnAjustes.setAttribute('aria-label', 'Ajustes');
    }
  } else {
    btnBuscar.innerHTML = ICONO_BUSCAR + '<span>Buscar</span>';
    btnBuscar.setAttribute('aria-label', 'Buscar documento');
    btnAjustes.innerHTML = ICONO_AJUSTES + '<span>Ajustes</span>';
    btnAjustes.setAttribute('aria-label', 'Ajustes');
    actualizarBotonAlternarVista();
  }
}

function mostrarPantallaPersonas() {
  personaActivaId = null;
  categoriaGlobalActivaId = null;
  salirModoSeleccion();
  $('#pantalla-personas').classList.remove('hidden');
  $('#pantalla-persona').classList.add('hidden');
  $('#btn-volver').classList.add('hidden');
  // En la portada, buscar / cambiar vista / ajustes están en la barra de abajo (los de arriba se quedan ocultos)
  $('#btn-buscar-top').classList.add('hidden');
  $('#btn-ver-categorias-top').classList.add('hidden');
  $('#btn-ajustes').classList.add('hidden');
  $('#avatar-topbar').classList.add('hidden');
  $('#titulo-topbar').textContent = 'DOCUMENTACIÓN';
  sincronizarBarraInferior();
  renderizarPantallaInicio();
}

function abrirPersona(personaId, sinNavegacion = false) {
  personaActivaId = personaId;
  categoriaGlobalActivaId = null;
  categoriaActiva = 'todos';
  salirModoSeleccion();
  $('#pantalla-personas').classList.add('hidden');
  $('#pantalla-persona').classList.remove('hidden');
  $('#chips-categorias').classList.remove('hidden');
  $('#btn-volver').classList.remove('hidden');
  $('#btn-buscar-top').classList.add('hidden');
  $('#btn-ver-categorias-top').classList.add('hidden');
  $('#btn-ajustes').classList.add('hidden');
  sincronizarBarraInferior();
  renderizarCabeceraPersona();
  renderizarChipsCategorias();
  renderizarAvisoCaducidadPersona();
  renderizarDocumentos();
  if (!sinNavegacion) pushNavegacion(mostrarPantallaPersonas);
}

// Vista transversal: todos los documentos de una categoría, de todas las
// personas a la vez (a diferencia de abrirPersona, que filtra por una
// sola persona). Reutiliza la misma sección #pantalla-persona, pero con
// la barra de chips mostrando personas en vez de categorías (al revés
// que en abrirPersona) y sin avisos de caducidad por persona.
function abrirCategoriaGlobal(categoriaId, sinNavegacion = false) {
  personaActivaId = null;
  categoriaGlobalActivaId = categoriaId;
  personaFiltroActiva = 'todos';
  salirModoSeleccion();
  const cat = datos.categorias.find((c) => c.id === categoriaId);
  $('#pantalla-personas').classList.add('hidden');
  $('#pantalla-persona').classList.remove('hidden');
  $('#chips-categorias').classList.remove('hidden');
  $('#aviso-caducado-persona').classList.add('hidden');
  $('#aviso-porcaducar-persona').classList.add('hidden');
  $('#btn-volver').classList.remove('hidden');
  $('#btn-buscar-top').classList.add('hidden');
  $('#btn-ver-categorias-top').classList.add('hidden');
  $('#btn-ajustes').classList.add('hidden');
  $('#avatar-topbar').classList.add('hidden');
  $('#titulo-topbar').textContent = cat ? cat.nombre : 'Categoría';
  sincronizarBarraInferior();
  renderizarChipsPersonas();
  renderizarDocumentos();
  if (!sinNavegacion) pushNavegacion(mostrarPantallaPersonas);
}

// ---- Deslizar de lado a lado ----
// Dentro de una persona (o de una categoría), un gesto horizontal pasa a la siguiente / anterior, en el orden en que
// salen en la pantalla de inicio. No da la vuelta: en la primera o la última no hace nada. No actúa sobre la
// fila de botones de filtro (que se desplaza sola), ni en modo selección, ni con una ventana abierta, ni si el dedo
// empieza pegado al borde de la pantalla (ahí Android tiene su propio gesto de "atrás").
function cambiarVentanaLateral(direccion) {
  const lista = personaActivaId ? datos.personas : (categoriaGlobalActivaId !== null ? datos.categorias : null);
  if (!lista) return false;
  const actual = lista.findIndex((x) => x.id === (personaActivaId || categoriaGlobalActivaId));
  const destino = lista[actual + direccion];
  if (actual < 0 || !destino) return false;
  if (personaActivaId) abrirPersona(destino.id, true); else abrirCategoriaGlobal(destino.id, true);
  const pantalla = $('#pantalla-persona');
  pantalla.classList.remove('desliza-izq', 'desliza-der');
  void pantalla.offsetWidth; // reinicia la animación
  pantalla.classList.add(direccion > 0 ? 'desliza-der' : 'desliza-izq');
  window.scrollTo(0, 0);
  return true;
}
(function activarDeslizarLateral() {
  let inicio = null;
  const puedeDeslizar = (e) => {
    if ($('#pantalla-persona').classList.contains('hidden')) return false;
    if (!$('#visor-completo').classList.contains('hidden') || $('#raiz-modal').querySelector('.modal-fondo')) return false;
    if (typeof modoSeleccionDocs !== 'undefined' && modoSeleccionDocs) return false;
    if (e.target.closest('.chips-categorias, input, select, textarea')) return false;
    return true;
  };
  document.addEventListener('touchstart', (e) => {
    inicio = null;
    if (e.touches.length !== 1 || !puedeDeslizar(e)) return;
    const t = e.touches[0];
    if (t.clientX < 24 || t.clientX > window.innerWidth - 24) return;
    inicio = { x: t.clientX, y: t.clientY, t: Date.now() };
  }, { passive: true });
  document.addEventListener('touchend', (e) => {
    if (!inicio) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - inicio.x, dy = t.clientY - inicio.y, dt = Date.now() - inicio.t;
    inicio = null;
    if (dt > 800 || Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 1.8) return;
    cambiarVentanaLateral(dx < 0 ? 1 : -1);
  }, { passive: true });
  document.addEventListener('touchcancel', () => { inicio = null; }, { passive: true });
})();

$('#btn-volver').addEventListener('click', volverAtras);
// Cierra el modo administrar (categorías o personas) y vuelve a la vista
// normal de la pantalla de inicio — se usa tanto como capa de navegación
// (botón atrás/gesto) como al alternar la vista con el botón de arriba.
function salirModoAdministrarInicio() {
  modoEdicionCategorias = false;
  modoEdicionPersonas = false;
  renderizarPantallaInicio();
}

function alternarVistaInicio() {
  // Si se estaba administrando, primero se quita esa capa de navegación
  // (cerrarCapas ya llama a salirModoAdministrarInicio al cerrarla).
  if (modoEdicionCategorias || modoEdicionPersonas) cerrarCapas(1);
  marcarTutorialModoVisto(modoInicio); // ya sabe usar el botón: no hace falta repetirle el aviso del modo que deja
  modoInicio = modoInicio === 'categorias' ? 'personas' : 'categorias';
  guardarModoInicio(modoInicio);
  actualizarBotonAlternarVista();
  renderizarPantallaInicio();
}
$('#btn-ver-categorias-top').addEventListener('click', alternarVistaInicio);
// Barra inferior: en la portada es Buscar/Subir/Categorías/Ajustes; dentro de una persona o
// categoría, los mismos 4 botones pasan a ser Subir/Seleccionar/Desplegar-Replegar/Ajustes
// (ver sincronizarBarraInferior, que cambia sus iconos y etiquetas al entrar y salir).
function enPantallaDocumentos() { return personaActivaId !== null || categoriaGlobalActivaId !== null; }
// Justo después de deslizar la cuadrícula de personas, el navegador se "come" el "click" del
// siguiente toque (lo gasta en frenar el deslizamiento), y el primer toque en la barra no hacía nada.
// Por eso, con el dedo, la acción se lanza en "touchend" y no en "click". Dos detalles importantes:
// - touchend siempre llega al elemento donde EMPEZÓ el toque: un deslizamiento que empieza en una
//   ficha y se suelta encima de la barra no cuenta como toque en el botón.
// - preventDefault() en touchend anula el "click" que vendría después. Sin eso, ese click se calcula
//   en el punto del dedo DESPUÉS de abrir la pantalla, cae sobre el fondo del modal recién abierto
//   y lo cierra al instante (Ajustes se abría y cerraba sin llegar a verse, toque tras toque).
// Si touchend no se puede cancelar, se deja todo al "click" normal (ratón y teclado, igual).
function alTocarBoton(el, fn) {
  let x0 = 0, y0 = 0;
  el.addEventListener('touchstart', (ev) => { x0 = ev.touches[0].clientX; y0 = ev.touches[0].clientY; }, { passive: true });
  el.addEventListener('touchend', (ev) => {
    const t = ev.changedTouches[0];
    if (!ev.cancelable || ev.touches.length > 0 || Math.hypot(t.clientX - x0, t.clientY - y0) > 10) return;
    ev.preventDefault();
    fn();
  });
  el.addEventListener('click', fn);
}
alTocarBoton($('#bar-buscar'), () => {
  if (enPantallaDocumentos()) { entrarModoSeleccion(); mostrarToast('Elige los documentos que quieras compartir'); }
  else abrirBusqueda();
});
alTocarBoton($('#bar-subir'), abrirModalSubida);
alTocarBoton($('#bar-vista'), () => {
  if (enPantallaDocumentos()) {
    guardarVistaDocs(obtenerVistaDocsGuardada() === 'desplegado' ? 'replegado' : 'desplegado');
    sincronizarBarraInferior();
  } else {
    alternarVistaInicio();
  }
});
// Dentro de una persona ya solo queda "Exportar copia" (Subir y Seleccionar tienen botón propio);
// dentro de una categoría (todas las personas a la vez) no queda nada propio, así que abre los
// ajustes generales, igual que en la portada.
alTocarBoton($('#bar-ajustes'), () => {
  if (!enPantallaDocumentos()) { abrirAjustes(true); return; }
  if (categoriaGlobalActivaId !== null) { abrirAjustes(true); return; }
  const persona = datos.personas.find((p) => p.id === personaActivaId);
  if (persona) abrirModalExportar(persona);
});

// Búsqueda global: por nombre de documento o de página, cruzando todas
// las personas y categorías a la vez. Reutiliza #visor-completo (como el
// visor de imágenes/PDF y la galería) en vez del sistema de modales,
// porque necesita su propia barra superior con un campo de texto.
$('#btn-buscar-top').addEventListener('click', abrirBusqueda);

function abrirBusqueda() {
  const visor = $('#visor-completo');
  visor.innerHTML = `
    <div class="visor-topbar busqueda-topbar">
      <button class="btn-icono-top" id="busqueda-cerrar" aria-label="Cerrar">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
      </button>
      <input type="search" id="input-busqueda" class="input-busqueda" placeholder="Buscar documento…" name="q" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="search" data-lpignore="true" data-1p-ignore data-form-type="other">
    </div>
    <div class="busqueda-resultados" id="busqueda-resultados"></div>`;
  visor.classList.remove('hidden');
  pushNavegacion(() => visor.classList.add('hidden'));

  $('#busqueda-cerrar').addEventListener('click', volverAtras);
  const input = $('#input-busqueda');
  evitarBarraAutorrelleno(input);
  input.focus();
  input.addEventListener('input', () => renderizarResultadosBusqueda(input.value));
  renderizarResultadosBusqueda('');
}

function normalizarBusqueda(str) {
  return (str || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
}

function renderizarResultadosBusqueda(query) {
  const cont = $('#busqueda-resultados');
  const q = normalizarBusqueda(query);

  if (!q) {
    cont.innerHTML = `
      <div class="estado-vacio">
        <svg width="44" height="44" viewBox="0 0 24 24" fill="none" style="color:var(--text-dim)"><circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="1.4"/><path d="M21 21l-4.3-4.3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
        <p>Escribe el nombre de un documento para buscarlo entre todas las personas.</p>
      </div>`;
    return;
  }

  const coincide = (doc) => normalizarBusqueda(doc.nombre).includes(q)
    || doc.paginas.some((pagina) => normalizarBusqueda(pagina.nombre).includes(q));
  const lista = datos.documentos.filter(coincide);

  if (lista.length === 0) {
    cont.innerHTML = `
      <div class="estado-vacio">
        <svg width="44" height="44" viewBox="0 0 24 24" fill="none" style="color:var(--text-dim)"><circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="1.4"/><path d="M21 21l-4.3-4.3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
        <p>No se ha encontrado ningún documento con ese nombre.</p>
      </div>`;
    return;
  }

  const porPersona = new Map();
  lista.forEach((doc) => {
    if (!porPersona.has(doc.personaId)) porPersona.set(doc.personaId, []);
    porPersona.get(doc.personaId).push(doc);
  });

  cont.innerHTML = '';
  datos.personas.forEach((persona) => {
    if (!porPersona.has(persona.id)) return;
    const docs = porPersona.get(persona.id).slice().sort((a, b) => (b.fechaSubida || '').localeCompare(a.fechaSubida || ''));

    const grupo = document.createElement('div');
    grupo.className = 'grupo-documentos';
    grupo.innerHTML = `<h3 class="titulo-grupo"><span class="avatar-persona avatar-mini-grupo" style="${estiloAvatar(persona)}">${contenidoAvatar(persona)}</span>${escapeHtml(persona.nombre)}</h3><div class="lista-docs"></div>`;
    const listaEl = grupo.querySelector('.lista-docs');
    docs.forEach((doc) => listaEl.appendChild(crearTarjetaDoc(doc)));
    cont.appendChild(grupo);
  });
}

function colorParaPersona(persona) {
  const idx = datos.personas.findIndex((p) => p.id === persona.id);
  return COLORES_AVATAR[Math.max(idx, 0) % COLORES_AVATAR.length];
}
function estiloAvatar(persona) {
  if (persona.foto) return `background-image:url('${persona.foto}')`;
  return `background:${colorParaPersona(persona)}`;
}
function contenidoAvatar(persona) {
  if (persona.foto || !persona.icono) return '';
  return htmlIconoAvatar(persona.icono);
}

// Igual que con modoEdicionCategorias: el botón de la topbar solo enseña
// las fichas para entrar en cada persona. Los iconos de cambiar imagen,
// renombrar y eliminar, y la ficha de "Añadir persona" al final, solo
// aparecen si se ha llegado desde Ajustes → "Administrar personas".
let modoEdicionPersonas = false;

function renderizarPersonas() {
  const cont = $('#grid-personas');
  cont.innerHTML = '';
  cont.classList.remove('pocas', 'tres', 'centrado', 'vacio', 'modo-categorias');

  if (datos.personas.length === 0 && !modoEdicionPersonas) {
    cont.classList.add('vacio');
    cont.innerHTML = `
      <div class="estado-vacio">
        <svg width="44" height="44" viewBox="0 0 24 24" fill="none" style="color:var(--text-dim)"><circle cx="12" cy="8" r="4" stroke="currentColor" stroke-width="1.4"/><path d="M4.5 20.5c0-4.6 3.4-7.3 7.5-7.3s7.5 2.7 7.5 7.3" stroke="currentColor" stroke-width="1.4"/></svg>
        <p>Todavía no tienes a nadie aquí.<br>Añade a la primera con el botón «Añadir». Para añadir más adelante, ve a Ajustes → "Personas". Si ya tenías una copia, conéctala en Ajustes → "Copias de seguridad" (o usa "Importar copia" si te la pasaron en un archivo).</p>
      </div>`;
    cont.querySelector('.estado-vacio').appendChild(crearTileAnadirPersona());
    return;
  }

  // En modo edición hay una ficha extra (el botón de "Añadir persona"),
  // así que el recuento que decide el patrón de la cuadrícula
  // (pocas/tres/centrado) también la cuenta — con 1 persona real se
  // coloca como si hubiera 2, con 2 como si hubiera 3, etc.
  const totalFichas = datos.personas.length + (modoEdicionPersonas ? 1 : 0);
  cont.classList.toggle('pocas', totalFichas <= 3);
  cont.classList.toggle('tres', totalFichas === 3);
  cont.classList.toggle('centrado', totalFichas === 4);

  datos.personas.forEach((persona) => cont.appendChild(crearTilePersonaHome(persona, modoEdicionPersonas)));
  if (modoEdicionPersonas) cont.appendChild(crearTileAnadirPersona());

  habilitarArrastreTiles('.persona-tile[data-persona-id]', datos.personas, 'personaId');
}

function crearTilePersonaHome(persona, editable) {
  const fila = document.createElement('div');
  fila.className = 'persona-tile';
  fila.dataset.personaId = persona.id;
  fila.innerHTML = `
    <button type="button" class="persona-tile-clic">
      <div class="avatar-persona" style="${estiloAvatar(persona)}">${contenidoAvatar(persona)}${htmlAvisoCaducidadPersona(persona.id)}</div>
      <span class="nombre-persona">${escapeHtml(persona.nombre)}</span>
    </button>
    ${editable ? `
    <div class="acciones-persona-tile">
      <button type="button" class="icon-btn-persona-tile" aria-label="Cambiar imagen">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M4 7h3l2-2h6l2 2h3v12H4V7z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><circle cx="12" cy="13" r="3.2" stroke="currentColor" stroke-width="1.6"/></svg>
      </button>
      <button type="button" class="icon-btn-persona-tile" aria-label="Renombrar persona">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>
      </button>
      <button type="button" class="icon-btn-persona-tile" aria-label="Eliminar persona">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
      </button>
    </div>` : ''}`;
  fila.querySelector('.persona-tile-clic').addEventListener('click', () => {
    if (Date.now() - momentoUltimoArrastrePersona < 300) return;
    abrirPersona(persona.id);
  });
  if (editable) {
    const [btnImagen, btnRenombrar, btnEliminar] = fila.querySelectorAll('.icon-btn-persona-tile');
    btnImagen.addEventListener('click', () => abrirCambiarImagenPersona(persona));
    btnRenombrar.addEventListener('click', () => abrirRenombrarPersona(persona));
    btnEliminar.addEventListener('click', () => confirmarEliminarPersona(persona));
  }
  return fila;
}

function crearTileAnadirPersona() {
  const fila = document.createElement('div');
  fila.className = 'persona-tile';
  fila.innerHTML = `
    <button type="button" class="persona-tile-clic">
      <div class="avatar-persona avatar-nueva-persona">
        <svg width="32%" height="32%" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
      </div>
      <span class="nombre-persona">Añadir</span>
    </button>`;
  fila.querySelector('.persona-tile-clic').addEventListener('click', () => abrirModalNuevaPersona());
  return fila;
}

function abrirCambiarImagenPersona(persona) {
  abrirModal(`
    <h3>Cambiar imagen</h3>
    <div class="selector-foto">
      <div class="avatar-persona" id="preview-avatar-persona" style="${estiloAvatar(persona)}">${contenidoAvatar(persona)}</div>
      <div class="acciones-foto">
        <button class="btn-secundario" id="op-foto-camara" type="button">Hacer foto</button>
        <button class="btn-secundario" id="op-foto-galeria" type="button">Galería</button>
        <button class="btn-secundario" id="op-foto-icono" type="button">Icono</button>
      </div>
      <input type="file" id="input-foto-camara-persona" accept="image/*" capture="user" class="visually-hidden">
      <input type="file" id="input-foto-galeria-persona" accept="image/*" class="visually-hidden">
    </div>
    <div id="zona-iconos-persona" class="hidden">${htmlGridIconosAvatar(persona.icono)}</div>
  `);
  const previewPersona = $('#preview-avatar-persona');
  const zonaIconosPersona = $('#zona-iconos-persona');
  const inputCamara = $('#input-foto-camara-persona');
  const inputGaleria = $('#input-foto-galeria-persona');
  previewPersona.addEventListener('click', () => inputGaleria.click());
  $('#op-foto-icono').addEventListener('click', () => zonaIconosPersona.classList.toggle('hidden'));

  const alElegirFotoPersona = (input) => {
    const f = input.files[0];
    input.value = '';
    if (!f) return;
    abrirModal('<h3>Ajustar foto</h3><div id="zona-recorte-persona"></div>');
    montarAjustePosicionFoto($('#zona-recorte-persona'), f, {
      onConfirmar: async (dataUrl) => {
        persona.icono = null;
        persona.foto = dataUrl;
        await guardarMetadatos();
        cerrarCapas(1); // cierra el recorte y la ventana de cambiar imagen (una sola capa real)
        renderizarPersonas();
        mostrarToast('Foto actualizada');
      },
      onCancelar: () => volverAtras(),
    });
  };
  $('#op-foto-camara').addEventListener('click', () => inputCamara.click());
  $('#op-foto-galeria').addEventListener('click', () => inputGaleria.click());
  inputCamara.addEventListener('change', () => alElegirFotoPersona(inputCamara));
  inputGaleria.addEventListener('change', () => alElegirFotoPersona(inputGaleria));

  zonaIconosPersona.addEventListener('click', async (e) => {
    const btn = e.target.closest('.opcion-icono');
    if (!btn) return;
    persona.foto = null;
    persona.icono = btn.dataset.icono;
    await guardarMetadatos();
    volverAtras();
    renderizarPersonas();
    mostrarToast('Icono actualizado');
  });
}

function abrirRenombrarPersona(persona) {
  abrirModalRenombrar('Renombrar persona', persona.nombre, (nuevo) => {
    if (nuevo === persona.nombre) { volverAtras(); return; }
    persona.nombre = nuevo;
    guardarMetadatos().then(() => {
      volverAtras();
      renderizarPersonas();
      mostrarToast('Nombre actualizado');
    });
  }, LIMITE_NOMBRE);
}

async function borrarPersonaYDocumentos(persona, docs) {
  mostrarToast('Eliminando…');
  for (const doc of docs) {
    const categoriaObj = datos.categorias.find((c) => c.id === doc.categoria) || CATEGORIA_SIN_ASIGNAR;
    for (const pagina of doc.paginas) {
      encolarBorrado(pagina, persona, categoriaObj); // en las nubes se borra en segundo plano
      cacheBorrar(pagina.archivoId);
    }
  }
  datos.documentos = datos.documentos.filter((d) => d.personaId !== persona.id);
  datos.personas = datos.personas.filter((p) => p.id !== persona.id);
  await guardarMetadatos();
  renderizarPersonas();
  mostrarToast('Persona eliminada');
}

function confirmarEliminarPersona(persona) {
  const docs = datos.documentos.filter((d) => d.personaId === persona.id);
  if (docs.length === 0) { borrarPersonaYDocumentos(persona, docs); return; }
  abrirModal(`
    <h3>${trad('¿Eliminar a {nombre}?', { nombre: escapeHtml(persona.nombre) })}</h3>
    <p style="color:var(--text-dim);font-size:.88rem;margin:0 0 14px;">
      ${trad(docs.length === 1 ? 'Se eliminarán también sus {n} documento de todas las nubes conectadas. Esta acción no se puede deshacer.' : 'Se eliminarán también sus {n} documentos de todas las nubes conectadas. Esta acción no se puede deshacer.', { n: docs.length })}
    </p>
    <div class="campo">
      <label for="input-confirmar-nombre">Escribe <strong style="color:var(--text-light)">${escapeHtml(persona.nombre)}</strong> para confirmar</label>
      <input type="search" id="input-confirmar-nombre" name="q" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="enter" data-lpignore="true" data-1p-ignore data-form-type="other" readonly>
    </div>
    <div class="modal-acciones">
      <button class="btn-secundario" id="modal-cancelar">Cancelar</button>
      <button class="btn-primario btn-peligro" id="modal-confirmar-borrar-persona" disabled>Eliminar</button>
    </div>
  `);
  $('#modal-cancelar').addEventListener('click', volverAtras);
  const inputConfirmar = $('#input-confirmar-nombre');
  const btnConfirmar = $('#modal-confirmar-borrar-persona');
  evitarBarraAutorrelleno(inputConfirmar);
  inputConfirmar.addEventListener('input', () => {
    btnConfirmar.disabled = inputConfirmar.value.trim().toLowerCase() !== persona.nombre.trim().toLowerCase();
  });
  btnConfirmar.addEventListener('click', async () => {
    if (inputConfirmar.value.trim().toLowerCase() !== persona.nombre.trim().toLowerCase()) return;
    // Solo esta capa (el propio modal de confirmación), no
    // cerrarTodasLasCapas(): si se borra estando en modo administrar
    // (capa persistente, ver salirModoAdministrarInicio), cerrarlo todo
    // saldría también de ese modo sin querer.
    cerrarCapas(1);
    await borrarPersonaYDocumentos(persona, docs);
  });
}

// La otra mitad del modo de inicio "categorías" (ver modoInicio). A
// diferencia de la cuadrícula de personas (tarjetas cuadradas con
// avatar), aquí son barras horizontales a todo el ancho con el nombre
// dentro. El orden se puede arrastrar igual que las personas. Esta misma
// pantalla hace también de "administrar categorías" — cada barra lleva
// sus propios botones de renombrar/eliminar, y al final hay uno para
// añadir una nueva — no existe ya una ventana aparte para esto.
// Navegar a esta pantalla con el botón de la topbar (alternar vista) solo
// enseña las barras para entrar en cada categoría. Los botones de
// renombrar/eliminar y el de "Nueva categoría" solo aparecen si se ha
// llegado desde Ajustes → "Administrar categorías" (modoEdicionCategorias)
// — evita que salgan de más cada vez que simplemente se está mirando la
// lista de categorías.
let modoEdicionCategorias = false;

function renderizarCategoriasHome() {
  const cont = $('#grid-personas');
  cont.innerHTML = '';
  cont.classList.remove('pocas', 'tres', 'centrado', 'vacio');
  cont.classList.add('modo-categorias');

  // Al empezar no hay ninguna categoría: se explica y se ofrece ya el botón de crear la primera
  // (en modo administrar el botón sale de todos modos al final de la lista).
  if (datos.categorias.length === 0 && !modoEdicionCategorias) {
    cont.classList.remove('modo-categorias');
    cont.classList.add('vacio');
    cont.innerHTML = `
      <div class="estado-vacio">
        <svg width="44" height="44" viewBox="0 0 24 24" fill="none" style="color:var(--text-dim)"><path d="M4 5h6.5l2 2.2H20v11.3H4V5z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>
        <p>Todavía no tienes categorías.<br>Crea la primera con el botón «Nueva categoría» y así ordenarás tus documentos por tipo. Para crear más adelante, ve a Ajustes → "Categorías".</p>
      </div>`;
    const btnPrimera = document.createElement('button');
    btnPrimera.className = 'categoria-barra-nueva';
    btnPrimera.type = 'button';
    btnPrimera.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg> Nueva categoría';
    btnPrimera.addEventListener('click', abrirNuevaCategoria);
    cont.querySelector('.estado-vacio').appendChild(btnPrimera);
    return;
  }

  datos.categorias.forEach((cat) => cont.appendChild(crearBarraCategoriaHome(cat, modoEdicionCategorias)));

  if (modoEdicionCategorias) {
    const btnNueva = document.createElement('button');
    btnNueva.className = 'categoria-barra-nueva';
    btnNueva.type = 'button';
    btnNueva.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg> Nueva categoría';
    btnNueva.addEventListener('click', abrirNuevaCategoria);
    cont.appendChild(btnNueva);
  }

  habilitarArrastreTiles('.categoria-barra', datos.categorias, 'catId');
}

function crearBarraCategoriaHome(cat, editable) {
  const fila = document.createElement('div');
  fila.className = 'categoria-barra';
  fila.dataset.catId = cat.id;
  fila.style.background = cat.color;
  fila.style.setProperty('--color-categoria', cat.color); // por si el estilo pinta el color en otra capa (Cómic)
  fila.innerHTML = `
    <button class="categoria-barra-nombre" type="button">${escapeHtml(cat.nombre)}</button>
    ${!editable && estadoCaducidadCategoria(cat.id) ? `<span class="aviso-caducidad-persona ${estadoCaducidadCategoria(cat.id)}" aria-label="Tiene documentos caducados o a punto de caducar">${svgAvisoCaducidad('80%')}</span>` : ''}
    ${editable ? `
    <button class="icon-btn-cat-bar" type="button" aria-label="Renombrar categoría">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>
    </button>
    <button class="icon-btn-cat-bar" type="button" aria-label="Cambiar color">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M12 3s7 7.58 7 12a7 7 0 1 1-14 0c0-4.42 7-12 7-12z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>
    </button>
    <button class="icon-btn-cat-bar" type="button" aria-label="Eliminar categoría">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
    </button>` : ''}`;
  const abrirEstaCategoria = () => {
    if (Date.now() - momentoUltimoArrastrePersona < 300) return;
    abrirCategoriaGlobal(cat.id);
  };
  fila.querySelector('.categoria-barra-nombre').addEventListener('click', abrirEstaCategoria);
  // El aviso de caducidad es un elemento suelto (no va dentro del botón del nombre, para poder
  // ponerlo a su propio tamaño fijo) — sin este listener, tocarlo no hacía nada.
  fila.querySelector('.aviso-caducidad-persona')?.addEventListener('click', abrirEstaCategoria);
  if (editable) {
    fila.querySelector('[aria-label="Renombrar categoría"]').addEventListener('click', () => abrirRenombrarCategoria(cat));
    fila.querySelector('[aria-label="Cambiar color"]').addEventListener('click', () => abrirRuedaColorCategoria(cat, fila));
    fila.querySelector('[aria-label="Eliminar categoría"]').addEventListener('click', () => confirmarEliminarCategoria(cat));
  }
  return fila;
}

// Tono fijo (tal como se pinta la rueda) para que el color elegido siempre tenga buen
// contraste con el texto/icono blanco que va encima en toda la app: el centro de la rueda
// es blanco de verdad (s:0, l:100) y, según se toca más lejos del centro, sube la saturación
// y baja la luminosidad hasta llegar a estos valores del borde (colores "duros").
const SATURACION_BORDE_RUEDA = 92, LUMINOSIDAD_BORDE_RUEDA = 45;

function hslAHex(h, s, l) {
  s /= 100; l /= 100;
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const aHex = (x) => Math.round(255 * x).toString(16).padStart(2, '0');
  return `#${aHex(f(0))}${aHex(f(8))}${aHex(f(4))}`;
}

// Tono y saturación (0-100) de un color guardado — hace falta para saber dónde colocar el
// punto al abrir la rueda: el ángulo lo da el tono, la distancia al centro la da cuánto de
// saturado esté (comparado con el máximo del borde, SATURACION_BORDE_RUEDA).
function hexAHS(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255, g = parseInt(hex.slice(3, 5), 16) / 255, b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  const l = (max + min) / 2;
  if (d === 0) return { h: 0, s: 0 };
  let h;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  h *= 60;
  if (h < 0) h += 360;
  const s = d / (1 - Math.abs(2 * l - 1));
  return { h, s: s * 100 };
}

// La rueda de color, reutilizable (cambiar el color de una categoría y crear una nueva). htmlRuedaColor da su HTML
// (muestra del color + rueda) y montarRuedaColor le pone el comportamiento dentro de "contenedor".
// alElegir(color) se llama mientras se arrastra; alSoltar(color), al levantar el dedo.
function htmlRuedaColor(color) {
  return `<div class="rueda-color-muestra" style="background:${color}"></div>
    <div class="rueda-color-cont">
      <div class="rueda-color"></div>
      <div class="rueda-color-selector"></div>
    </div>`;
}
function montarRuedaColor(contenedor, colorInicial, alElegir, alSoltar) {
  const rueda = contenedor.querySelector('.rueda-color');
  const selector = contenedor.querySelector('.rueda-color-selector');
  const muestra = contenedor.querySelector('.rueda-color-muestra');

  // El punto se coloca en el mismo píxel donde está el dedo (limitado al borde si se sale del
  // círculo) — NO directo al radio fijo solo según el ángulo, que es lo que hacía que un
  // arrastre casi vertical (o casi horizontal) pareciera "girar en un solo eje": cualquier
  // pequeño desvío del centro se traducía en un ángulo grande y el punto saltaba de golpe al
  // borde en esa dirección. Siguiendo el píxel real del dedo, el movimiento es siempre directo.
  function colocarSelectorPx(x, y) {
    selector.style.left = x + 'px';
    selector.style.top = y + 'px';
  }
  // Posición inicial (al abrir, sin gesto todavía): no hay un píxel de dedo del que partir, así
  // que aquí sí hace falta calcularla a partir del color guardado — el ángulo según su tono, la
  // distancia al centro según cuánto de saturado esté (0 = blanco/centro, el máximo del borde
  // (o más) = pegado al borde).
  function colocarSelectorPorColor(hex, radioPx) {
    const { h, s } = hexAHS(hex);
    const t = Math.min(1, s / SATURACION_BORDE_RUEDA);
    const anguloRad = h * Math.PI / 180;
    colocarSelectorPx(radioPx + radioPx * t * Math.sin(anguloRad), radioPx - radioPx * t * Math.cos(anguloRad));
  }
  colocarSelectorPorColor(colorInicial, rueda.clientWidth / 2);

  function elegirDesdeEvento(clientX, clientY) {
    const r = rueda.getBoundingClientRect();
    let dx = clientX - (r.left + r.width / 2);
    let dy = clientY - (r.top + r.height / 2);
    const radioMax = r.width / 2 - 2; // un pelín dentro del borde
    const distancia = Math.hypot(dx, dy) || 1;
    if (distancia > radioMax) { const f = radioMax / distancia; dx *= f; dy *= f; }
    const hue = (Math.atan2(dx, -dy) * 180 / Math.PI + 360) % 360;
    // t: 0 en el centro (blanco) → 1 en el borde (el color duro de SATURACION/LUMINOSIDAD_BORDE).
    const t = Math.min(1, distancia / radioMax);
    const color = hslAHex(hue, t * SATURACION_BORDE_RUEDA, 100 - t * (100 - LUMINOSIDAD_BORDE_RUEDA));
    colocarSelectorPx(r.width / 2 + dx, r.height / 2 + dy);
    muestra.style.background = color;
    if (alElegir) alElegir(color);
    return color;
  }

  // Se sigue el dedo con "pointer capture" en vez del patrón de listeners en window que se usa
  // para arrastrar fichas/selección: aquí no hace falta detectar cuándo el dedo SALE del
  // círculo para cancelar nada, todo lo contrario — se quiere seguir el gesto aunque el dedo se
  // vaya fuera del borde mientras se arrastra, y pointer capture ya lo hace sin más código.
  // preventDefault, además, para que el navegador no intente hacer scroll con el mismo gesto.
  let colorElegido = colorInicial;
  rueda.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    try { rueda.setPointerCapture(e.pointerId); } catch (err) { /* algunos navegadores no lo permiten; se sigue igualmente */ }
    colorElegido = elegirDesdeEvento(e.clientX, e.clientY);
    const mover = (ev) => { ev.preventDefault(); colorElegido = elegirDesdeEvento(ev.clientX, ev.clientY); };
    const soltar = () => {
      rueda.removeEventListener('pointermove', mover);
      if (alSoltar) alSoltar(colorElegido);
    };
    rueda.addEventListener('pointermove', mover);
    rueda.addEventListener('pointerup', soltar, { once: true });
    rueda.addEventListener('pointercancel', soltar, { once: true });
  });
}

function abrirRuedaColorCategoria(cat, filaHome) {
  abrirModal(`
    <h3>Color de la categoría</h3>
    <div id="rueda-color-bloque">${htmlRuedaColor(cat.color)}</div>
    <div class="modal-acciones">
      <button class="btn-secundario" id="modal-cancelar">Cerrar</button>
    </div>
  `);
  $('#modal-cancelar').addEventListener('click', volverAtras);
  montarRuedaColor($('#rueda-color-bloque'), cat.color,
    (color) => { if (filaHome) { filaHome.style.background = color; filaHome.style.setProperty('--color-categoria', color); } },
    (color) => { if (color !== cat.color) { cat.color = color; guardarMetadatos(); } });
}

function abrirRenombrarCategoria(cat) {
  abrirModalRenombrar('Renombrar categoría', cat.nombre, (nuevo) => {
    if (nuevo.toLowerCase() === CATEGORIA_SIN_ASIGNAR.nombre.toLowerCase()) {
      mostrarToast(trad('"{nombre}" es un nombre reservado, elige otro.', { nombre: trad(CATEGORIA_SIN_ASIGNAR.nombre) }), true);
      return;
    }
    if (nuevo === cat.nombre) { volverAtras(); return; }
    cat.nombre = nuevo;
    guardarMetadatos().then(() => {
      volverAtras();
      renderizarCategoriasHome();
      mostrarToast('Categoría renombrada');
    });
  }, LIMITE_NOMBRE);
}

function abrirNuevaCategoria(alCrear, alCancelar) {
  // El color de salida es uno de la paleta, pero se puede cambiar con la misma rueda que para editar el color
  const colorPorDefecto = COLORES_AVATAR[datos.categorias.length % COLORES_AVATAR.length];
  abrirModalRenombrar('Nueva categoría', '', (nombre, colorElegido) => {
    if (nombre.toLowerCase() === CATEGORIA_SIN_ASIGNAR.nombre.toLowerCase()) {
      mostrarToast(trad('"{nombre}" es un nombre reservado, elige otro.', { nombre: trad(CATEGORIA_SIN_ASIGNAR.nombre) }), true);
      return;
    }
    const id = 'cat-' + Date.now();
    const color = colorElegido || colorPorDefecto;
    datos.categorias.push({ id, nombre, color });
    guardarMetadatos().then(() => {
      if (typeof alCrear === 'function') { refrescarPantallaActual(); mostrarToast('Categoría creada'); alCrear(id); return; } // (desde "Subir documento")
      volverAtras();
      renderizarCategoriasHome();
      mostrarToast('Categoría creada');
    });
  }, LIMITE_NOMBRE, typeof alCancelar === 'function' ? alCancelar : null, colorPorDefecto);
}

function confirmarEliminarCategoria(cat) {
  const num = datos.documentos.filter((d) => d.categoria === cat.id).length;
  // Sin documentos de por medio, no hay nada que avisar: se borra
  // directamente en vez de pedir confirmación para nada.
  if (num === 0) { eliminarCategoriaGuardando(cat, false); return; }
  abrirModal(`
    <h3>Eliminar categoría</h3>
    <p style="color:var(--text-dim);font-size:.88rem;margin:0 0 14px;">${trad(num === 1 ? '¿Eliminar «{cat}»? Sus {n} documento pasarán a mostrarse como «{sin}».' : '¿Eliminar «{cat}»? Sus {n} documentos pasarán a mostrarse como «{sin}».', { cat: escapeHtml(cat.nombre), n: num, sin: trad(CATEGORIA_SIN_ASIGNAR.nombre) })}</p>
    <div class="modal-acciones">
      <button class="btn-secundario" id="modal-cancelar">Cancelar</button>
      <button class="btn-primario btn-peligro" id="btn-confirmar-eliminar-cat">Eliminar</button>
    </div>
  `);
  $('#modal-cancelar').addEventListener('click', volverAtras);
  $('#btn-confirmar-eliminar-cat').addEventListener('click', () => eliminarCategoriaGuardando(cat, true));
}

// habiaModalAbierto: si se pasó por el modal de confirmación (había
// documentos), hay que cerrar exactamente esa capa. Si no (el atajo sin
// confirmación de arriba), no se abrió ningún modal y no hay nada que
// cerrar. No se usa cerrarTodasLasCapas() aquí a propósito: si se borra
// estando en modo administrar (una capa de navegación propia y
// persistente, ver salirModoAdministrarInicio), cerrarlo todo saldría
// también de ese modo sin querer.
async function eliminarCategoriaGuardando(cat, habiaModalAbierto) {
  datos.categorias = datos.categorias.filter((c) => c.id !== cat.id);
  await guardarMetadatos();
  if (habiaModalAbierto) cerrarCapas(1);
  renderizarCategoriasHome();
  mostrarToast('Categoría eliminada');
}

// El user-select:none del CSS no basta en algunos móviles Android: al
// mantener pulsado (para arrastrar una persona, o un documento) sale
// igualmente el menú/selección nativa de texto (las "gotas" azules),
// incluso si el dedo pasa por huecos entre tarjetas mientras arrastra.
// Se anula para toda la página (salvo en campos de texto de verdad,
// donde sí hace falta poder seleccionar/pegar), una sola vez, en vez de
// tarjeta por tarjeta.
function debeBloquearSeleccion(e) {
  return !e.target.closest('input, textarea, [contenteditable]');
}
document.addEventListener('contextmenu', (e) => { if (debeBloquearSeleccion(e)) e.preventDefault(); });
document.addEventListener('selectstart', (e) => { if (debeBloquearSeleccion(e)) e.preventDefault(); });

// Inercia hecha a mano para el scroll "convertido" de habilitarArrastreTiles
// — hace falta porque esas fichas necesitan touch-action:none permanente
// (para distinguir de forma fiable "mantener pulsado para arrastrar" de
// "deslizar para hacer scroll" con JS), y con touch-action:none el
// navegador nunca coge el gesto, así que no hay inercia nativa de por sí.
// Un WeakMap por zona de scroll permite cancelar la inercia en marcha si
// se empieza a tocar otra vez antes de que termine de frenar.
const inerciaScrollActiva = new WeakMap();
function detenerInerciaScroll(zona) {
  const id = inerciaScrollActiva.get(zona);
  if (id) { cancelAnimationFrame(id); inerciaScrollActiva.delete(zona); }
}
function lanzarInerciaScroll(zona, historial) {
  if (historial.length < 2) return;
  const primero = historial[0];
  const ultimo = historial[historial.length - 1];
  const dt = ultimo.t - primero.t;
  if (dt <= 0 || dt > 150) return; // el dedo ya estaba parado antes de soltar
  let velocidad = (ultimo.y - primero.y) / dt; // px/ms, con el signo del gesto (subir dedo = valor negativo)
  const VELOCIDAD_MIN = 0.02;
  const FRICCION = 0.94;
  if (Math.abs(velocidad) < VELOCIDAD_MIN) return;
  function paso() {
    velocidad *= FRICCION;
    const maximo = Math.max(0, zona.scrollHeight - zona.clientHeight);
    const siguiente = zona.scrollTop - velocidad * 16;
    zona.scrollTop = siguiente;
    // scrollTop se autolimita a [0, máximo] — si ya no se ha movido más
    // que lo que tocaba (topó con un extremo), no merece la pena seguir.
    const topoBorde = (siguiente <= 0 && velocidad > 0) || (siguiente >= maximo && velocidad < 0);
    if (topoBorde || Math.abs(velocidad) < VELOCIDAD_MIN) {
      inerciaScrollActiva.delete(zona);
      return;
    }
    inerciaScrollActiva.set(zona, requestAnimationFrame(paso));
  }
  inerciaScrollActiva.set(zona, requestAnimationFrame(paso));
}

// Arrastrar para reordenar en la pantalla de inicio — usada tanto por la
// cuadrícula de personas como por las barras de categorías (ver
// renderizarPersonas/renderizarCategoriasHome). claseTile es el selector
// CSS de cada ficha ('.persona-tile' o '.categoria-barra'), arrayDatos es
// el array real (datos.personas o datos.categorias, se reordena en el
// sitio) y atributoDataset el nombre del data-* que guarda su id.
// opciones.contenedor / opciones.zonaScroll: por defecto la cuadrícula de la portada (personas o
// categorías), pero se puede pasar otro contenedor — p. ej. la galería de páginas de un documento,
// donde el propio contenedor ES la zona con scroll (no hay un "main" exterior distinto).
// opciones.campoId: qué propiedad del objeto identifica cada ficha al reordenar el array de datos
// (por defecto "id"; las páginas de un documento no tienen id propio, así que usan "archivoId").
// opciones.alGuardarOrden: aviso opcional tras guardar, para refrescar algo que dependa del orden
// (p. ej. las etiquetas "Página 1", "Página 2"… de la galería, que son por posición).
function habilitarArrastreTiles(claseTile, arrayDatos, atributoDataset, opciones = {}) {
  const contenedor = opciones.contenedor || $('#grid-personas');
  const zonaScroll = opciones.zonaScroll || $('main');
  const campoId = opciones.campoId || 'id';
  const DURACION_PULSACION = 320;
  const UMBRAL_MOVIMIENTO = 20;

  contenedor.querySelectorAll(claseTile).forEach((tile) => {
    tile.addEventListener('pointerdown', (eventoInicial) => {
      if (eventoInicial.button !== undefined && eventoInicial.button !== 0) return;
      const inicioX = eventoInicial.clientX;
      const inicioY = eventoInicial.clientY;
      const scrollInicial = zonaScroll.scrollTop;
      // Si todo cabe en la pantalla (pocas personas), no hay nada que
      // desplazar — sin esto, el intento de "convertir en scroll" movía
      // igualmente unos pocos píxeles aunque no hubiera más contenido.
      const hayScrollDisponible = zonaScroll.scrollHeight - zonaScroll.clientHeight > 4;
      let ultimoEvento = eventoInicial;
      let cancelado = false;
      let convertidoEnScroll = false;
      detenerInerciaScroll(zonaScroll);

      // Para poder seguir deslizando un poco al soltar el dedo (inercia):
      // guarda las últimas posiciones con su instante, para estimar la
      // velocidad justo antes de soltar.
      const historial = [];
      function registrarMuestra(y) {
        historial.push({ t: performance.now(), y });
        if (historial.length > 5) historial.shift();
      }

      const timer = setTimeout(() => {
        if (cancelado) return;
        cancelado = true;
        limpiar();
        iniciarArrastre(tile, ultimoEvento);
      }, DURACION_PULSACION);

      const cancelarSiSeMueve = (ev) => {
        ultimoEvento = ev;
        const dx = ev.clientX - inicioX;
        const dy = ev.clientY - inicioY;
        if (!cancelado && (Math.abs(dx) > UMBRAL_MOVIMIENTO || Math.abs(dy) > UMBRAL_MOVIMIENTO)) {
          cancelado = true;
          clearTimeout(timer);
          if (Math.abs(dy) > Math.abs(dx)) convertidoEnScroll = true;
        }
        if (convertidoEnScroll && hayScrollDisponible) {
          registrarMuestra(ev.clientY);
          zonaScroll.scrollTop = scrollInicial - dy;
        }
      };
      const cancelarPorSoltar = () => {
        cancelado = true;
        clearTimeout(timer);
        limpiar();
        if (convertidoEnScroll && hayScrollDisponible) lanzarInerciaScroll(zonaScroll, historial);
      };
      function limpiar() {
        window.removeEventListener('pointermove', cancelarSiSeMueve);
        window.removeEventListener('pointerup', cancelarPorSoltar);
        window.removeEventListener('pointercancel', cancelarPorSoltar);
      }
      window.addEventListener('pointermove', cancelarSiSeMueve, { passive: true }); // no llama a preventDefault: el scroll lo mueve a mano
      window.addEventListener('pointerup', cancelarPorSoltar, { once: true });
      window.addEventListener('pointercancel', cancelarPorSoltar, { once: true });
    });
  });

  function iniciarArrastre(tile, eventoInicial) {
    if (navigator.vibrate) navigator.vibrate(12);
    tile.classList.add('arrastrando-tile');
    tile.style.touchAction = 'none';
    try { tile.setPointerCapture(eventoInicial.pointerId); } catch (e) { /* ignorar */ }

    const rectInicial = tile.getBoundingClientRect();
    const offsetX = eventoInicial.clientX - rectInicial.left;
    const offsetY = eventoInicial.clientY - rectInicial.top;

    let punteroX = eventoInicial.clientX;
    let punteroY = eventoInicial.clientY;

    function posicionNatural() {
      const rc = contenedor.getBoundingClientRect();
      return { left: rc.left + tile.offsetLeft, top: rc.top + tile.offsetTop };
    }
    function actualizarTransform(clientX, clientY) {
      const base = posicionNatural();
      const x = clientX - offsetX - base.left;
      const y = clientY - offsetY - base.top;
      tile.style.transform = `translate(${x}px, ${y}px) scale(1.06)`;
    }
    function comprobarIntercambio(clientX, clientY) {
      const debajo = document.elementFromPoint(clientX, clientY);
      const tileDebajo = debajo && debajo.closest(claseTile);
      if (tileDebajo && tileDebajo !== tile && contenedor.contains(tileDebajo)) {
        const tiles = Array.from(contenedor.children);
        const iOrigen = tiles.indexOf(tile);
        const iDestino = tiles.indexOf(tileDebajo);
        if (iOrigen !== -1 && iDestino !== -1) {
          if (iOrigen < iDestino) tileDebajo.after(tile);
          else tileDebajo.before(tile);
          actualizarTransform(clientX, clientY);
        }
      }
    }
    actualizarTransform(punteroX, punteroY);

    const MARGEN_AUTOSCROLL = 70;
    const VELOCIDAD_MAX_AUTOSCROLL = 10;
    let rafAutoscroll = null;
    function bucleAutoscroll() {
      const rect = zonaScroll.getBoundingClientRect();
      let velocidad = 0;
      if (punteroY < rect.top + MARGEN_AUTOSCROLL) {
        velocidad = -VELOCIDAD_MAX_AUTOSCROLL * Math.min((rect.top + MARGEN_AUTOSCROLL - punteroY) / MARGEN_AUTOSCROLL, 1);
      } else if (punteroY > rect.bottom - MARGEN_AUTOSCROLL) {
        velocidad = VELOCIDAD_MAX_AUTOSCROLL * Math.min((punteroY - (rect.bottom - MARGEN_AUTOSCROLL)) / MARGEN_AUTOSCROLL, 1);
      }
      if (velocidad > 0) {
        const ultimo = contenedor.lastElementChild;
        if (ultimo) {
          const rcContenedor = contenedor.getBoundingClientRect();
          const margenHastaElBorde = (rcContenedor.top + ultimo.offsetTop + ultimo.offsetHeight) - rect.bottom;
          velocidad = Math.min(velocidad, Math.max(margenHastaElBorde, 0));
        }
      } else if (velocidad < 0) {
        const primero = contenedor.firstElementChild;
        if (primero) {
          const rcContenedor = contenedor.getBoundingClientRect();
          const margenHastaElBorde = rect.top - (rcContenedor.top + primero.offsetTop);
          velocidad = -Math.min(-velocidad, Math.max(margenHastaElBorde, 0));
        }
      }
      if (velocidad !== 0) {
        const antes = zonaScroll.scrollTop;
        const nuevo = antes + velocidad;
        if (nuevo !== antes) {
          zonaScroll.scrollTop = nuevo;
          actualizarTransform(punteroX, punteroY);
          comprobarIntercambio(punteroX, punteroY);
        }
      }
      rafAutoscroll = requestAnimationFrame(bucleAutoscroll);
    }
    rafAutoscroll = requestAnimationFrame(bucleAutoscroll);

    function onMove(ev) {
      punteroX = ev.clientX;
      punteroY = ev.clientY;
      actualizarTransform(punteroX, punteroY);
      comprobarIntercambio(punteroX, punteroY);
    }

    function onUp() {
      if (rafAutoscroll) cancelAnimationFrame(rafAutoscroll);
      try { tile.releasePointerCapture(eventoInicial.pointerId); } catch (e) { /* ignorar */ }
      tile.classList.remove('arrastrando-tile');
      tile.style.transform = '';
      tile.style.touchAction = '';
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      momentoUltimoArrastrePersona = Date.now();
      guardarOrdenDesdeDOM();
    }

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  }

  function guardarOrdenDesdeDOM() {
    const idsEnOrden = Array.from(contenedor.querySelectorAll(claseTile)).map((el) => el.dataset[atributoDataset]);
    arrayDatos.sort((a, b) => idsEnOrden.indexOf(String(a[campoId])) - idsEnOrden.indexOf(String(b[campoId])));
    guardarMetadatos();
    if (opciones.alGuardarOrden) opciones.alGuardarOrden();
  }
}

function renderizarCabeceraPersona() {
  const persona = datos.personas.find((p) => p.id === personaActivaId);
  if (!persona) return;
  const avatarTop = $('#avatar-topbar');
  avatarTop.classList.remove('hidden');
  avatarTop.setAttribute('style', estiloAvatar(persona));
  avatarTop.innerHTML = contenidoAvatar(persona);
  $('#titulo-topbar').textContent = persona.nombre;
}

function abrirModalNuevaPersona(despuesDeAnadir, alCancelar) {
  fotoPendienteDataUrl = null;
  iconoPendienteId = null;
  abrirModal(`
    <h3>Nueva persona</h3>
    <div id="seccion-normal-nuevo">
      <div class="selector-foto">
        <div class="avatar-persona" id="preview-avatar-nuevo" style="background:var(--ink-3);">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style="color:var(--text-dim)"><path d="M4 7h3l2-2h6l2 2h3v12H4V7z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><circle cx="12" cy="13" r="3.2" stroke="currentColor" stroke-width="1.6"/></svg>
        </div>
        <div class="acciones-foto">
          <button class="btn-secundario" id="btn-foto-camara" type="button">Hacer foto</button>
          <button class="btn-secundario" id="btn-foto-galeria" type="button">Galería</button>
          <button class="btn-secundario" id="btn-foto-icono" type="button">Icono</button>
        </div>
        <input type="file" id="input-foto-camara" accept="image/*" capture="user" class="visually-hidden">
        <input type="file" id="input-foto-galeria" accept="image/*" class="visually-hidden">
      </div>
      <div id="zona-iconos-nuevo" class="hidden">${htmlGridIconosAvatar(null)}</div>
      <div class="campo">
        <label for="input-nombre-persona">Nombre</label>
        <input type="search" id="input-nombre-persona" name="q" placeholder="Añadir nombre" maxlength="${LIMITE_NOMBRE}" autocomplete="off" autocapitalize="words" spellcheck="false" enterkeyhint="enter" data-lpignore="true" data-1p-ignore data-form-type="other" readonly>
      </div>
      <div class="modal-acciones">
        <button class="btn-secundario" id="modal-cancelar">Cancelar</button>
        <button class="btn-primario inactivo" id="modal-guardar-persona" aria-disabled="true">Añadir</button>
      </div>
    </div>
    <div id="zona-recorte-nuevo" class="hidden"></div>
  `);

  const seccionNormal = $('#seccion-normal-nuevo');
  const zonaRecorte = $('#zona-recorte-nuevo');
  const preview = $('#preview-avatar-nuevo');
  const zonaIconos = $('#zona-iconos-nuevo');
  const inputCamara = $('#input-foto-camara');
  const inputGaleria = $('#input-foto-galeria');
  $('#btn-foto-camara').addEventListener('click', () => inputCamara.click());
  $('#btn-foto-galeria').addEventListener('click', () => inputGaleria.click());
  $('#btn-foto-icono').addEventListener('click', () => zonaIconos.classList.toggle('hidden'));
  zonaIconos.addEventListener('click', (e) => {
    const btn = e.target.closest('.opcion-icono');
    if (!btn) return;
    fotoPendienteDataUrl = null;
    iconoPendienteId = btn.dataset.icono;
    preview.setAttribute('style', `background:var(--ink-3);`);
    preview.innerHTML = htmlIconoAvatar(iconoPendienteId);
    zonaIconos.querySelectorAll('.opcion-icono').forEach((b) => b.classList.toggle('activo', b === btn));
    zonaIconos.classList.add('hidden');
  });
  const alElegirFoto = (input) => {
    const f = input.files[0];
    input.value = '';
    if (!f) return;
    seccionNormal.classList.add('hidden');
    zonaRecorte.classList.remove('hidden');
    montarAjustePosicionFoto(zonaRecorte, f, {
      onConfirmar: (dataUrl) => {
        iconoPendienteId = null;
        fotoPendienteDataUrl = dataUrl;
        preview.setAttribute('style', `background-image:url('${dataUrl}');background-size:cover;background-position:center;`);
        preview.innerHTML = '';
        zonaRecorte.classList.add('hidden');
        zonaRecorte.innerHTML = '';
        seccionNormal.classList.remove('hidden');
      },
      onCancelar: () => {
        zonaRecorte.classList.add('hidden');
        zonaRecorte.innerHTML = '';
        seccionNormal.classList.remove('hidden');
      },
    });
  };
  inputCamara.addEventListener('change', () => alElegirFoto(inputCamara));
  inputGaleria.addEventListener('change', () => alElegirFoto(inputGaleria));

  // El botón se ve apagado mientras falta el nombre, pero recibe el toque: si se pulsa así, parpadea el nombre
  const revisar = () => { const falta = !$('#input-nombre-persona').value.trim(); $('#modal-guardar-persona').classList.toggle('inactivo', falta); $('#modal-guardar-persona').setAttribute('aria-disabled', falta ? 'true' : 'false'); };
  $('#input-nombre-persona').addEventListener('input', revisar);
  evitarBarraAutorrelleno($('#input-nombre-persona'));
  $('#modal-cancelar').addEventListener('click', typeof alCancelar === 'function' ? alCancelar : volverAtras);
  $('#modal-guardar-persona').addEventListener('click', async () => {
    const nombre = $('#input-nombre-persona').value.trim();
    if (!nombre) { parpadearFalta($('#input-nombre-persona')); $('#input-nombre-persona').focus(); return; }
    const btn = $('#modal-guardar-persona');
    if (btn.disabled) return; // evita doble toque -> doble persona
    btn.disabled = true;
    const nueva = { id: 'p-' + Date.now(), nombre, foto: fotoPendienteDataUrl, icono: iconoPendienteId };
    datos.personas.push(nueva);
    await guardarMetadatos();
    renderizarPantallaInicio();
    if (typeof despuesDeAnadir === 'function') refrescarPantallaActual(); // que los botones de la pantalla de detrás incluyan a la nueva
    mostrarToast('Persona añadida');
    // Si se llegó desde otra acción (p. ej. subir un documento sin personas), se continúa con ella en la misma
    // capa; si no, se cierra el modal.
    if (typeof despuesDeAnadir === 'function') despuesDeAnadir(nueva); else volverAtras();
  });
}

function montarRecortador(contenedor, file, opciones) {
  const {
    radioMarco = 32,
    textoAyuda = 'Arrastra con un dedo para moverla, pellizca con dos para hacer zoom o girarla',
    textoConfirmar = 'Usar esta foto',
    generarSalida, onConfirmar, onCancelar,
    giro = false,   // añade la barra de giro fino y los botones de 90°
    marcoMax = null, // { ancho, alto }: con giro, el marco se adapta a la foto (y se intercambia al girar 90°)
    formaMarco = '', // clip-path opcional: el marco enseña exactamente la forma en la que se verá la foto
  } = opciones;
  let { anchoMarco, altoMarco } = opciones;

  contenedor.innerHTML = `
    <div class="recorte-marco" id="recorte-marco" style="width:${anchoMarco}px;height:${altoMarco}px;border-radius:${radioMarco}px;${formaMarco ? `clip-path:${formaMarco};` : ''}"></div>
    ${giro ? `
    <div class="recorte-controles">
      <div class="recorte-giro">
        <button type="button" id="recorte-giro-izq" aria-label="Girar 90 grados a la izquierda">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
        </button>
        <div class="recorte-giro-barra">
          <span class="recorte-giro-grados" id="recorte-giro-grados">0°</span>
          <input type="range" id="recorte-giro-rango" min="-45" max="45" step="0.5" value="0" aria-label="Girar la foto">
        </div>
        <button type="button" id="recorte-giro-der" aria-label="Girar 90 grados a la derecha">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.13-9.36L23 10"/></svg>
        </button>
      </div>
      <div class="recorte-giro recorte-zoom">
        <button type="button" id="recorte-zoom-menos" aria-label="Alejar">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7.5"/><line x1="21" y1="21" x2="16.5" y2="16.5"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
        </button>
        <div class="recorte-giro-barra">
          <span class="recorte-giro-grados" id="recorte-zoom-etiqueta">×1,0</span>
          <input type="range" id="recorte-zoom-rango" min="0" max="1" step="0.005" value="0" aria-label="Zoom de la foto">
        </div>
        <button type="button" id="recorte-zoom-mas" aria-label="Acercar">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7.5"/><line x1="21" y1="21" x2="16.5" y2="16.5"/><line x1="8" y1="11" x2="14" y2="11"/><line x1="11" y1="8" x2="11" y2="14"/></svg>
        </button>
      </div>
    </div>
` : ''}
    <p class="recorte-ayuda">${textoAyuda}</p>
    <div class="modal-acciones">
      <button class="btn-secundario" id="recorte-cancelar" type="button">Cancelar</button>
      <button class="btn-primario" id="recorte-guardar" type="button">${textoConfirmar}</button>
    </div>
  `;

  const marco = contenedor.querySelector('#recorte-marco');
  const img = new Image();
  const url = URL.createObjectURL(file);
  // cx,cy: dónde cae el centro de la imagen dentro del marco (píxeles del
  // marco). rot: giro en radianes. escala: cuánto se agranda la imagen
  // respecto a su tamaño real.
  let cx = 0, cy = 0, rot = 0, escala = 1;

  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

  // Escala mínima para que, con el giro actual, la imagen siga tapando
  // el marco entero sin dejar huecos en las esquinas: el rectángulo de
  // la imagen (sin girar) tiene que cubrir el propio marco girado el
  // ángulo contrario — es la fórmula exacta, no una aproximación.
  function escalaMinima(angulo) {
    const c = Math.abs(Math.cos(angulo)), s = Math.abs(Math.sin(angulo));
    return Math.max(
      (anchoMarco * c + altoMarco * s) / img.naturalWidth,
      (anchoMarco * s + altoMarco * c) / img.naturalHeight
    );
  }

  function aplicarTransform() {
    escala = clamp(escala, escalaMinima(rot), escalaMinima(rot) * 4);
    img.style.transform = `translate(${cx - img.naturalWidth / 2}px, ${cy - img.naturalHeight / 2}px) rotate(${rot}rad) scale(${escala})`;
    sincronizarGiro();
    sincronizarZoom();
  }

  // ---- Barra de zoom fino
  // El zoom va de ×1 (la foto justo cubre el marco) a ×4, con escala logarítmica para que la
  // barra se note igual de fina al principio y al final. Acerca y aleja desde el centro del marco.
  const ZOOM_MAX = 4;
  const rangoZoom = contenedor.querySelector('#recorte-zoom-rango');
  const etiquetaZoom = contenedor.querySelector('#recorte-zoom-etiqueta');
  function sincronizarZoom() {
    if (!rangoZoom) return;
    const factor = Math.max(1, escala / escalaMinima(rot));
    rangoZoom.value = String(Math.min(1, Math.log(factor) / Math.log(ZOOM_MAX)));
    etiquetaZoom.textContent = '×' + factor.toFixed(1).replace('.', ',');
  }
  function zoomHasta(factor) {
    const centro = { x: anchoMarco / 2, y: altoMarco / 2 };
    const ancla = puntoImagenBajo(centro); // el punto de la foto que está en el centro del marco se queda ahí
    escala = escalaMinima(rot) * clamp(factor, 1, ZOOM_MAX);
    const c = Math.cos(rot), s = Math.sin(rot);
    cx = centro.x - (ancla.x * c - ancla.y * s) * escala;
    cy = centro.y - (ancla.x * s + ancla.y * c) * escala;
    aplicarTransform();
  }
  if (rangoZoom) {
    rangoZoom.addEventListener('input', () => zoomHasta(Math.pow(ZOOM_MAX, parseFloat(rangoZoom.value))));
    const paso = (delta) => zoomHasta(Math.pow(ZOOM_MAX, clamp(parseFloat(rangoZoom.value) + delta, 0, 1)));
    contenedor.querySelector('#recorte-zoom-menos').addEventListener('click', () => paso(-0.1));
    contenedor.querySelector('#recorte-zoom-mas').addEventListener('click', () => paso(0.1));
  }

  // ---- Barra de giro fino y botones de 90°
  // El giro total es un múltiplo de 90° más un ajuste fino de -45° a 45° (el de la barra).
  const CUARTO = Math.PI / 2;
  let base90 = 0;
  const rango = contenedor.querySelector('#recorte-giro-rango');
  const etiquetaGrados = contenedor.querySelector('#recorte-giro-grados');
  function sincronizarGiro() {
    if (!rango) return;
    // el múltiplo de 90° solo cambia si el giro se sale de su rango (así la barra no salta en ±45°)
    if (Math.abs(rot - base90) > CUARTO / 2 + 1e-6) base90 = Math.round(rot / CUARTO) * CUARTO;
    const fino = Math.round((rot - base90) * 180 / Math.PI * 10) / 10;
    rango.value = String(fino);
    etiquetaGrados.textContent = (fino > 0 ? '+' : '') + String(fino).replace('.', ',') + '°';
  }
  // Con el giro, el marco toma la proporción de la foto (o la inversa si está girada 90° o 270°).
  function ajustarMarcoAlGiro() {
    if (!giro || !marcoMax) return;
    const vertical = Math.abs(Math.round(base90 / CUARTO)) % 2 === 1;
    const proporcion = vertical ? img.naturalHeight / img.naturalWidth : img.naturalWidth / img.naturalHeight;
    let ancho = marcoMax.ancho, alto = Math.round(marcoMax.ancho / proporcion);
    if (alto > marcoMax.alto) { alto = marcoMax.alto; ancho = Math.round(marcoMax.alto * proporcion); }
    anchoMarco = ancho; altoMarco = alto;
    marco.style.width = ancho + 'px'; marco.style.height = alto + 'px';
  }
  function girar90(sentido) {
    rot += sentido * CUARTO; // se conserva el ajuste fino que hubiera
    sincronizarGiro();
    ajustarMarcoAlGiro();
    cx = anchoMarco / 2; cy = altoMarco / 2;
    escala = escalaMinima(rot);
    aplicarTransform();
  }
  if (rango) {
    rango.addEventListener('input', () => {
      rot = base90 + parseFloat(rango.value) * Math.PI / 180;
      aplicarTransform();
    });
    contenedor.querySelector('#recorte-giro-izq').addEventListener('click', () => girar90(-1));
    contenedor.querySelector('#recorte-giro-der').addEventListener('click', () => girar90(1));
  }

  img.onload = () => {
    img.style.width = img.naturalWidth + 'px';
    img.style.height = img.naturalHeight + 'px';
    img.style.transformOrigin = '50% 50%';
    escala = escalaMinima(0);
    cx = anchoMarco / 2;
    cy = altoMarco / 2;
    aplicarTransform();
  };
  img.src = url;
  marco.appendChild(img);

  const punteros = new Map();
  let panRef = null;
  let pinchRef = null;

  function posRelativa(e) {
    const r = marco.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }
  function distancia(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
  function puntoMedio(a, b) { return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; }
  function angulo(a, b) { return Math.atan2(b.y - a.y, b.x - a.x); }

  // Punto de la imagen (relativo a su propio centro, tal cual sin girar
  // ni escalar) que cae bajo un punto de pantalla dado, con la
  // transformación actual — para mantenerlo fijo bajo los dedos mientras
  // se hace zoom, se gira y se arrastra a la vez, en el mismo gesto.
  function puntoImagenBajo(p) {
    const dx = p.x - cx, dy = p.y - cy;
    const c = Math.cos(-rot), s = Math.sin(-rot);
    return { x: (dx * c - dy * s) / escala, y: (dx * s + dy * c) / escala };
  }

  marco.addEventListener('pointerdown', (e) => {
    marco.setPointerCapture(e.pointerId);
    punteros.set(e.pointerId, posRelativa(e));
    if (punteros.size === 1) {
      const p = punteros.values().next().value;
      panRef = { x: p.x, y: p.y, cx, cy };
      pinchRef = null;
    } else if (punteros.size === 2) {
      const [a, b] = [...punteros.values()];
      pinchRef = {
        dist: distancia(a, b),
        angulo: angulo(a, b),
        escalaInicio: escala,
        rotInicio: rot,
        ancla: puntoImagenBajo(puntoMedio(a, b)),
      };
      panRef = null;
    }
  });
  marco.addEventListener('pointermove', (e) => {
    if (!punteros.has(e.pointerId)) return;
    punteros.set(e.pointerId, posRelativa(e));
    if (punteros.size === 1 && panRef) {
      const p = punteros.values().next().value;
      cx = panRef.cx + (p.x - panRef.x);
      cy = panRef.cy + (p.y - panRef.y);
      aplicarTransform();
    } else if (punteros.size === 2 && pinchRef) {
      const [a, b] = [...punteros.values()];
      const factor = distancia(a, b) / pinchRef.dist;
      rot = pinchRef.rotInicio + (angulo(a, b) - pinchRef.angulo);
      escala = clamp(pinchRef.escalaInicio * factor, escalaMinima(rot), escalaMinima(0) * 4);
      const centro = puntoMedio(a, b);
      const c = Math.cos(rot), s = Math.sin(rot);
      cx = centro.x - (pinchRef.ancla.x * c - pinchRef.ancla.y * s) * escala;
      cy = centro.y - (pinchRef.ancla.x * s + pinchRef.ancla.y * c) * escala;
      aplicarTransform();
    }
  });
  function soltarPuntero(e) {
    punteros.delete(e.pointerId);
    if (punteros.size === 1) {
      const p = punteros.values().next().value;
      panRef = { x: p.x, y: p.y, cx, cy };
      pinchRef = null;
    } else {
      panRef = null;
      pinchRef = null;
    }
  }
  marco.addEventListener('pointerup', soltarPuntero);
  marco.addEventListener('pointercancel', soltarPuntero);

  contenedor.querySelector('#recorte-cancelar').addEventListener('click', () => {
    URL.revokeObjectURL(url);
    onCancelar();
  });
  contenedor.querySelector('#recorte-guardar').addEventListener('click', () => {
    const salida = generarSalida({ img, cx, cy, escala, rotacion: rot, anchoMarco, altoMarco });
    Promise.resolve(salida).then((resultado) => {
      URL.revokeObjectURL(url);
      onConfirmar(resultado);
    });
  });
}

// Forma del pozo cuadrado del avatar en el estilo Metálico (600×600 del dibujo, con el chaflán
// de adorno arriba a la derecha y los pequeños en las otras esquinas). La foto se guarda siempre
// cuadrada (sirve igual en todos los estilos); con este estilo el marco de encuadre solo enseña,
// además, la esquina que tapará el chaflán.
const FORMA_POZO_METALICO = 'polygon(3.33% 0, 61.33% 0, 100% 34.33%, 100% 96.67%, 96.67% 100%, 3.33% 100%, 0 96.67%, 0 3.33%)';

function montarAjustePosicionFoto(contenedor, file, { onConfirmar, onCancelar }) {
  const metal = obtenerSkinGuardado() === 'metalico';
  const TAMANO_MARCO = 220;
  const TAMANO_SALIDA = 240;
  montarRecortador(contenedor, file, {
    anchoMarco: TAMANO_MARCO, altoMarco: TAMANO_MARCO, radioMarco: metal ? 0 : 32,
    formaMarco: metal ? FORMA_POZO_METALICO : '',
    giro: true,
    onCancelar, onConfirmar,
    generarSalida: ({ img, cx, cy, escala, rotacion }) => {
      const factor = TAMANO_SALIDA / TAMANO_MARCO;
      const canvas = document.createElement('canvas');
      canvas.width = TAMANO_SALIDA; canvas.height = TAMANO_SALIDA;
      const ctx = canvas.getContext('2d');
      ctx.translate(cx * factor, cy * factor);
      ctx.rotate(rotacion);
      ctx.scale(escala * factor, escala * factor);
      ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
      return canvas.toDataURL('image/jpeg', .85);
    },
  });
}

// ── Recorte automático de documentos (bordes de la tarjeta o el papel) ──
// Usa OpenCV.js (visión por ordenador, ~10 MB), que NO se carga al abrir la app:
// solo la primera vez que se hace una foto de un documento, y después queda en la
// caché del navegador (ver sw.js). Todo ocurre en el móvil; la foto no sale de él.
const OPENCV_URL = 'opencv.js';
const ESCANER_LADO_DETECCION = 720;   // la búsqueda de bordes se hace sobre una copia pequeña
const ESCANER_LADO_MAX_SALIDA = 3000; // y el recorte final sale de la foto grande (tope por memoria)
let promesaOpenCv = null;

// Devuelve { cv } y no cv a secas: el objeto cv de OpenCV.js se comporta como una
// promesa (tiene .then), y resolver una promesa con él provoca un bucle infinito.
function cargarOpenCv() {
  if (promesaOpenCv) return promesaOpenCv;
  promesaOpenCv = new Promise((resolve, reject) => {
    if (window.cv && window.cv.Mat) { resolve({ cv: window.cv }); return; }
    let resuelto = false;
    let sondeo = null;
    const terminar = (fallo) => {
      if (resuelto) return;
      resuelto = true;
      clearInterval(sondeo);
      if (fallo) { promesaOpenCv = null; reject(fallo); } else resolve({ cv: window.cv });
    };
    const revisar = () => { if (window.cv && window.cv.Mat) terminar(); };
    // OpenCV avisa por aquí cuando termina de arrancar su motor interno (WebAssembly).
    window.Module = Object.assign(window.Module || {}, { onRuntimeInitialized: revisar });
    const s = document.createElement('script');
    s.src = OPENCV_URL;
    s.async = true;
    s.onerror = () => terminar(new Error('No se pudo cargar OpenCV'));
    document.head.appendChild(s);
    sondeo = setInterval(revisar, 250);
    setTimeout(() => terminar(new Error('OpenCV tarda demasiado')), 60000);
  });
  return promesaOpenCv;
}

// Ordena 4 puntos en sentido horario como [arriba-izq, arriba-der, abajo-der, abajo-izq]
// respecto a la foto: se empieza por la esquina cuyo primer lado queda lo más horizontal
// posible, para que un documento enderezado no salga girado sin necesidad. (Ordenar por
// suma/diferencia de coordenadas falla con giros de ~45° o más: repite esquinas.)
function ordenarEsquinas(pts) {
  const cx = pts.reduce((s, q) => s + q.x, 0) / 4, cy = pts.reduce((s, q) => s + q.y, 0) / 4;
  const ord = pts.slice().sort((a, b) => Math.atan2(a.y - cy, a.x - cx) - Math.atan2(b.y - cy, b.x - cx));
  let mejor = 0, mejorCos = -2;
  for (let i = 0; i < 4; i++) {
    const a = ord[i], b = ord[(i + 1) % 4];
    const largo = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const c = (b.x - a.x) / largo; // 1 = el lado apunta justo hacia la derecha
    if (c > mejorCos + 1e-9) { mejorCos = c; mejor = i; }
  }
  return [ord[mejor], ord[(mejor + 1) % 4], ord[(mejor + 2) % 4], ord[(mejor + 3) % 4]];
}

// ¿Es un cuadrilátero razonable para un documento? Ángulos cerca de 90° (con margen
// por la perspectiva) y lados opuestos de longitud parecida.
function cuadrilateroValido(p) {
  const lado = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const arriba = lado(p[0], p[1]), derecha = lado(p[1], p[2]), abajo = lado(p[2], p[3]), izquierda = lado(p[3], p[0]);
  if (Math.min(arriba, derecha, abajo, izquierda) < 20) return false;
  if (Math.max(arriba, abajo) / Math.min(arriba, abajo) > 1.7) return false;
  if (Math.max(derecha, izquierda) / Math.min(derecha, izquierda) > 1.7) return false;
  for (let i = 0; i < 4; i++) {
    const a = p[(i + 3) % 4], b = p[i], c = p[(i + 1) % 4];
    const v1 = { x: a.x - b.x, y: a.y - b.y }, v2 = { x: c.x - b.x, y: c.y - b.y };
    const cos = (v1.x * v2.x + v1.y * v2.y) / (Math.hypot(v1.x, v1.y) * Math.hypot(v2.x, v2.y));
    const grados = Math.acos(Math.max(-1, Math.min(1, cos))) * 180 / Math.PI;
    if (grados < 60 || grados > 120) return false;
  }
  return true;
}

function areaPoligono(p) {
  let a = 0;
  for (let i = 0; i < p.length; i++) { const q = p[(i + 1) % p.length]; a += p[i].x * q.y - q.x * p[i].y; }
  return Math.abs(a) / 2;
}

// ── Detector por rectas: busca las rectas dominantes de la foto (transformada de Hough),
// prueba combinaciones de 4 que formen un cuadrilátero y se queda con el mayor que tenga
// borde coherente en sus 4 lados. Después afina cada lado con los píxeles de borde
// cercanos, así las esquinas salen exactas aunque la tarjeta tenga las esquinas redondeadas.
// Los bordes se miran en los tres canales de color (R, G, B), no solo en gris: así se ve
// el límite entre, por ejemplo, una tarjeta verde y una mesa marrón de brillo parecido.

// Recta x·cosθ + y·senθ = ρ, guardada como { r, c, s }.
function interseccionRectas(a, b) {
  const det = a.c * b.s - a.s * b.c;
  if (Math.abs(det) < 0.15) return null; // casi paralelas
  return { x: (a.r * b.s - b.r * a.s) / det, y: (a.c * b.r - b.c * a.r) / det };
}

// Rectas más votadas de un mapa de bordes, sin repetidas (mismo ángulo y posición).
function rectasDominantes(cv, bordes, ancho, alto, maximo) {
  const lineas = new cv.Mat();
  const res = [];
  try {
    cv.HoughLines(bordes, lineas, 1, Math.PI / 360, Math.round(0.15 * Math.min(ancho, alto)));
    const total = Math.min(lineas.rows, 120);
    for (let i = 0; i < total && res.length < maximo; i++) {
      const r = lineas.data32F[i * 2], th = lineas.data32F[i * 2 + 1];
      const l = { r, c: Math.cos(th), s: Math.sin(th) };
      if (!res.some((k) => rectasParecidas(k, l))) res.push(l);
    }
  } finally { lineas.delete(); }
  return res;
}

function rectasParecidas(k, l) {
  const punto = k.c * l.c + k.s * l.s;
  return (punto > 0.9945 && Math.abs(k.r - l.r) < 14) || (punto < -0.9945 && Math.abs(k.r + l.r) < 14);
}

// Apoyo de un lado p→q según el gradiente de color de la imagen. En cada punto del lado se
// mira, a ±2 px en la dirección perpendicular, si hay un cambio fuerte en algún canal; solo
// cuenta la componente del gradiente perpendicular al lado, así los bordes que van en otra
// dirección (texturas, texto) no suman. Devuelve { apoyo, coherencia }: qué fracción del
// lado tiene borde y si ese borde siempre tiene el mismo signo (interior más claro que el
// exterior en todo el lado; una cuadrícula o una textura lo alternan, un borde de tarjeta no).
function apoyoDeLado(gxs, gys, ancho, alto, p, q, centro) {
  const largo = Math.hypot(q.x - p.x, q.y - p.y);
  let nx = -(q.y - p.y) / largo, ny = (q.x - p.x) / largo;
  if ((centro.x - p.x) * nx + (centro.y - p.y) * ny < 0) { nx = -nx; ny = -ny; } // hacia dentro
  const n = Math.max(8, Math.ceil(largo / 2));
  let bien = 0, positivos = 0, negativos = 0;
  for (let i = 0; i < n; i++) {
    const t = 0.04 + 0.92 * (i / (n - 1));
    const x0 = p.x + (q.x - p.x) * t, y0 = p.y + (q.y - p.y) * t;
    let mejor = 0;
    for (let k = -2; k <= 2; k++) {
      const x = Math.round(x0 + nx * k), y = Math.round(y0 + ny * k);
      if (x < 0 || y < 0 || x >= ancho || y >= alto) continue;
      const pos = y * ancho + x;
      for (let ch = 0; ch < gxs.length; ch++) {
        const proy = gxs[ch][pos] * nx + gys[ch][pos] * ny;
        if (Math.abs(proy) > Math.abs(mejor)) mejor = proy;
      }
    }
    if (Math.abs(mejor) >= 22) { bien++; if (mejor > 0) positivos++; else negativos++; }
  }
  return { apoyo: bien / n, coherencia: bien ? Math.abs(positivos - negativos) / bien : 0 };
}

// Brillo mediano del interior junto a un lado (a 8 px hacia dentro). Sirve para descartar
// cuadriláteros cuyo interior mezcla materiales distintos (p. ej. madera y papel).
function brilloInteriorDeLado(gris, ancho, alto, p, q, centro) {
  const largo = Math.hypot(q.x - p.x, q.y - p.y);
  let nx = -(q.y - p.y) / largo, ny = (q.x - p.x) / largo;
  if ((centro.x - p.x) * nx + (centro.y - p.y) * ny < 0) { nx = -nx; ny = -ny; }
  const valores = [];
  const n = Math.max(6, Math.ceil(largo / 6));
  for (let i = 0; i < n; i++) {
    const t = 0.15 + 0.7 * (i / (n - 1));
    const x = Math.round(p.x + (q.x - p.x) * t + nx * 8), y = Math.round(p.y + (q.y - p.y) * t + ny * 8);
    if (x >= 0 && y >= 0 && x < ancho && y < alto) valores.push(gris[y * ancho + x]);
  }
  if (!valores.length) return 0;
  valores.sort((a, b) => a - b);
  return valores[valores.length >> 1];
}

// Mejor cuadrilátero formado por 4 de las rectas: dos parejas casi paralelas cruzadas.
// Entre los válidos (los 4 lados con borde coherente) se elige el de mayor área: así, si
// la tarjeta tiene una franja o un recuadro interior, gana el borde exterior.
function mejorCuadrilateroDeRectas(rectas, gxs, gys, gris, ancho, alto, minLado, minMedia) {
  const areaTotal = ancho * alto;
  const margen = Math.max(ancho, alto) * 0.03;
  const pares = [];
  for (let i = 0; i < rectas.length; i++) {
    for (let j = i + 1; j < rectas.length; j++) {
      const a = rectas[i], b = rectas[j];
      const punto = a.c * b.c + a.s * b.s;
      if (Math.abs(punto) < 0.8192) continue; // más de 35° entre ellas: no son "opuestas"
      const rb = punto < 0 ? -b.r : b.r;
      if (Math.abs(a.r - rb) < 0.12 * Math.min(ancho, alto)) continue; // demasiado juntas
      pares.push([a, b]);
    }
  }
  let mejor = null;
  for (let i = 0; i < pares.length; i++) {
    for (let j = i + 1; j < pares.length; j++) {
      const [a0, a1] = pares[i], [b0, b1] = pares[j];
      if (a0 === b0 || a0 === b1 || a1 === b0 || a1 === b1) continue;
      if (Math.abs(a0.c * b0.c + a0.s * b0.s) > 0.62) continue; // las parejas deben cruzarse casi en ángulo recto (≥ 52°)
      const p00 = interseccionRectas(a0, b0), p01 = interseccionRectas(a0, b1);
      const p11 = interseccionRectas(a1, b1), p10 = interseccionRectas(a1, b0);
      if (!p00 || !p01 || !p11 || !p10) continue;
      const ciclo = [p00, p01, p11, p10];
      if (ciclo.some((q) => q.x < -margen || q.y < -margen || q.x > ancho + margen || q.y > alto + margen)) continue;
      const pts = ordenarEsquinas(ciclo);
      const area = areaPoligono(pts);
      if (area < areaTotal * 0.10 || area > areaTotal * 0.92 || !cuadrilateroValido(pts)) continue;
      if (mejor && area < mejor.area * 0.92) continue; // ya hay uno claramente mayor: no hace falta medir este
      const centro = { x: (pts[0].x + pts[1].x + pts[2].x + pts[3].x) / 4, y: (pts[0].y + pts[1].y + pts[2].y + pts[3].y) / 4 };
      const lados = [0, 1, 2, 3].map((k) => apoyoDeLado(gxs, gys, ancho, alto, pts[k], pts[(k + 1) % 4], centro));
      if (lados.some((l) => l.apoyo < minLado || l.coherencia < 0.6)) continue;
      const media = lados.reduce((s, l) => s + l.apoyo, 0) / 4;
      if (media < minMedia) continue;
      const brillos = [0, 1, 2, 3].map((k) => brilloInteriorDeLado(gris, ancho, alto, pts[k], pts[(k + 1) % 4], centro));
      if (Math.max(...brillos) - Math.min(...brillos) > 110) continue; // el interior mezcla materiales distintos
      // Entre áreas parecidas (±8 %) se prefiere el de más borde; si no, el mayor.
      if (!mejor || area > mejor.area * 1.08 || (area > mejor.area * 0.92 && media > mejor.media)) mejor = { pts, area, media };
    }
  }
  return mejor;
}

// Ajusta cada lado a los píxeles de borde cercanos (ajuste por mínimos cuadrados total,
// dos pasadas cada vez más estrictas) y recalcula las esquinas.
function afinarEsquinas(pts, puntos, ancho, alto) {
  let cur = pts.map((q) => ({ x: q.x, y: q.y }));
  for (const tol of [5, 2.5]) {
    const rectas = [];
    for (let k = 0; k < 4; k++) {
      const p = cur[k], q = cur[(k + 1) % 4];
      const largo = Math.hypot(q.x - p.x, q.y - p.y);
      const dx = (q.x - p.x) / largo, dy = (q.y - p.y) / largo;
      const nx = -dy, ny = dx;
      let n = 0, sx = 0, sy = 0; const sel = [];
      for (let i = 0; i < puntos.length; i += 2) {
        const x = puntos[i], y = puntos[i + 1];
        const t = (x - p.x) * dx + (y - p.y) * dy;
        if (t < largo * 0.05 || t > largo * 0.95) continue;
        if (Math.abs((x - p.x) * nx + (y - p.y) * ny) > tol) continue;
        sel.push(x, y); n++; sx += x; sy += y;
      }
      if (n < 15) return pts; // muy pocos puntos: no se fía del ajuste
      const mx = sx / n, my = sy / n;
      let sxx = 0, sxy = 0, syy = 0;
      for (let i = 0; i < sel.length; i += 2) { const ex = sel[i] - mx, ey = sel[i + 1] - my; sxx += ex * ex; sxy += ex * ey; syy += ey * ey; }
      const ang = 0.5 * Math.atan2(2 * sxy, sxx - syy); // dirección principal
      const ux = Math.cos(ang), uy = Math.sin(ang);
      const c = -uy, s = ux;                            // normal
      rectas.push({ r: mx * c + my * s, c, s });
    }
    const nuevas = [];
    for (let k = 0; k < 4; k++) {
      const q = interseccionRectas(rectas[(k + 3) % 4], rectas[k]); // esquina k = lado (k-1) con lado k
      if (!q) return pts;
      nuevas.push(q);
    }
    // no debe alejarse demasiado de la propuesta inicial
    if (nuevas.some((q, k) => Math.hypot(q.x - pts[k].x, q.y - pts[k].y) > 0.05 * Math.hypot(ancho, alto))) return pts;
    cur = nuevas;
  }
  return cur;
}

// Devuelve las 4 esquinas [arriba-izq, arriba-der, abajo-der, abajo-izq] en píxeles de
// la copia pequeña, o null si no hay un documento claro.
function buscarEsquinasDocumento(cv, canvasPeq) {
  const src = cv.imread(canvasPeq);
  const gris = new cv.Mat(), suave = new cv.Mat();
  const planos = new cv.MatVector();
  const trabajo = [];
  const nuevo = () => { const m = new cv.Mat(); trabajo.push(m); return m; };
  const ancho = src.cols, alto = src.rows;
  try {
    cv.cvtColor(src, gris, cv.COLOR_RGBA2GRAY);
    cv.GaussianBlur(gris, suave, new cv.Size(5, 5), 0);
    cv.split(src, planos);
    const gxs = [], gys = [];
    const suaves = [];
    for (let ch = 0; ch < 3; ch++) {
      const plano = planos.get(ch); trabajo.push(plano);
      const s = nuevo(); cv.GaussianBlur(plano, s, new cv.Size(5, 5), 0); suaves.push(s);
      const gx = nuevo(), gy = nuevo();
      cv.Sobel(s, gx, cv.CV_32F, 1, 0, 3); cv.Sobel(s, gy, cv.CV_32F, 0, 1, 3);
      gxs.push(gx.data32F); gys.push(gy.data32F);
    }

    // Rectas candidatas: de un mapa de bordes estricto y de uno permisivo (bordes débiles),
    // cada uno unión de los bordes de los tres canales de color.
    const rectas = [];
    let bordesFinos = null;
    for (const [bajo, altoUmbral] of [[50, 130], [15, 45]]) {
      const union = nuevo();
      suaves.forEach((s, ch) => {
        const b = nuevo(); cv.Canny(s, b, bajo, altoUmbral);
        if (ch === 0) b.copyTo(union); else cv.bitwise_or(union, b, union);
      });
      for (const l of rectasDominantes(cv, union, ancho, alto, 30)) {
        if (!rectas.some((k) => rectasParecidas(k, l))) rectas.push(l);
      }
      bordesFinos = union; // el último (permisivo) sirve para afinar
    }
    if (rectas.length < 4) return null;

    const mejor = mejorCuadrilateroDeRectas(rectas, gxs, gys, suave.data, ancho, alto, 0.8, 0.88);
    if (!mejor) return null;
    const puntos = [];
    const px = bordesFinos.data;
    for (let i = 0; i < px.length; i++) if (px[i]) puntos.push(i % ancho, (i / ancho) | 0);
    return afinarEsquinas(mejor.pts, puntos, ancho, alto);
  } finally {
    src.delete(); gris.delete(); suave.delete(); planos.delete(); trabajo.forEach((m) => m.delete());
  }
}

function cargarImagenDeArchivo(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('No se pudo leer la foto')); };
    img.src = url;
  });
}

// Busca las esquinas del documento en la foto. Devuelve { esquinas } en píxeles de la foto
// original ([arriba-izq, arriba-der, abajo-der, abajo-izq]) o null si no encuentra un
// documento claro. `img` es opcional (si ya está cargada, se reutiliza).
async function detectarEsquinasEnFoto(file, img) {
  const { cv } = await cargarOpenCv();
  img = img || await cargarImagenDeArchivo(file);
  const kPeq = Math.min(1, ESCANER_LADO_DETECCION / Math.max(img.naturalWidth, img.naturalHeight));
  const canvasPeq = document.createElement('canvas');
  canvasPeq.width = Math.round(img.naturalWidth * kPeq); canvasPeq.height = Math.round(img.naturalHeight * kPeq);
  canvasPeq.getContext('2d').drawImage(img, 0, 0, canvasPeq.width, canvasPeq.height);
  const brutas = buscarEsquinasDocumento(cv, canvasPeq);
  if (!brutas) return null;
  // Un pelo hacia dentro (0,7 %) para no dejar el borde de la sombra ni del fondo.
  const centro = { x: brutas.reduce((s, q) => s + q.x, 0) / 4, y: brutas.reduce((s, q) => s + q.y, 0) / 4 };
  const esquinas = brutas.map((q) => ({
    x: (centro.x + (q.x - centro.x) * 0.993) * (img.naturalWidth / canvasPeq.width),
    y: (centro.y + (q.y - centro.y) * 0.993) * (img.naturalHeight / canvasPeq.height),
  }));
  return { esquinas };
}

// Recorta y endereza la foto por las 4 esquinas dadas (píxeles de la foto original), como
// si el documento se hubiera fotografiado de frente. Devuelve { file, ancho, alto }.
async function enderezarConEsquinas(file, esquinas, img) {
  const { cv } = await cargarOpenCv();
  img = img || await cargarImagenDeArchivo(file);
  const ordenadas = ordenarEsquinas(esquinas);
  // La foto grande (con tope de tamaño) es de donde sale el resultado, para no perder nitidez.
  const k = Math.min(1, ESCANER_LADO_MAX_SALIDA / Math.max(img.naturalWidth, img.naturalHeight));
  const canvasGrande = document.createElement('canvas');
  canvasGrande.width = Math.round(img.naturalWidth * k); canvasGrande.height = Math.round(img.naturalHeight * k);
  canvasGrande.getContext('2d').drawImage(img, 0, 0, canvasGrande.width, canvasGrande.height);
  const p = ordenadas.map((q) => ({ x: q.x * k, y: q.y * k }));

  const lado = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const ancho = Math.round(Math.max(lado(p[0], p[1]), lado(p[3], p[2])));
  const alto = Math.round(Math.max(lado(p[0], p[3]), lado(p[1], p[2])));
  if (ancho < 100 || alto < 100) return null;

  const src = cv.imread(canvasGrande);
  const dst = new cv.Mat();
  const desde = cv.matFromArray(4, 1, cv.CV_32FC2, [p[0].x, p[0].y, p[1].x, p[1].y, p[2].x, p[2].y, p[3].x, p[3].y]);
  const hasta = cv.matFromArray(4, 1, cv.CV_32FC2, [0, 0, ancho, 0, ancho, alto, 0, alto]);
  const salida = document.createElement('canvas');
  try {
    const M = cv.getPerspectiveTransform(desde, hasta);
    cv.warpPerspective(src, dst, M, new cv.Size(ancho, alto), cv.INTER_LINEAR, cv.BORDER_REPLICATE);
    M.delete();
    cv.imshow(salida, dst);
  } finally { src.delete(); dst.delete(); desde.delete(); hasta.delete(); }
  const blob = await new Promise((resolve) => salida.toBlob(resolve, 'image/jpeg', .95));
  if (!blob) return null;
  const nombreBase = file.name.replace(/\.[^.]+$/, '') || 'documento';
  return { file: new File([blob], nombreBase + '.jpg', { type: 'image/jpeg' }), ancho, alto };
}

// Recorte para fotos de documentos: el marco se adapta a la proporción de
// la propia foto (no fuerza un cuadrado), y el resultado se recorta a la
// resolución nativa de la imagen (copia 1:1 de los píxeles, sin reescalar)
// para no perder calidad — el archivo recortado es el que se sube a Drive.
//
// Recorte automático: nada más abrir la foto se buscan en segundo plano los bordes
// del documento. Si se encuentran y aún no se ha tocado el recorte, la foto se
// sustituye por el documento ya recortado y enderezado; con un botón se puede volver
// a la foto original y viceversa. "Ajustar esquinas" abre un editor con las 4 esquinas
// arrastrables (empezando por las detectadas) para corregir cuando la detección falle.
// Si algo falla, el recorte manual funciona igual que siempre.
function montarRecorteDocumento(contenedor, file, { onConfirmar, onCancelar }) {
  const ANCHO_MAX = 280, ALTO_MAX = 380;
  let estadoAuto = 'buscando';   // buscando | listo | sin-bordes | no-disponible
  let usandoAuto = false;
  let original = null;           // { file, ancho, alto }
  let automatico = null;         // { file, ancho, alto }
  let esquinasDetectadas = null; // en píxeles de la foto original
  let imagenOriginal = null;     // la foto ya cargada (se reutiliza para detectar y enderezar)
  let tocado = false;            // ya se movió el recorte con los dedos
  let cerrado = false;

  function pintarEstadoAuto() {
    const zona = contenedor.querySelector('#recorte-auto');
    if (!zona) return;
    const botonEsquinas = estadoAuto === 'buscando' || estadoAuto === 'no-disponible' ? '' : '<button type="button" id="recorte-auto-esquinas">Ajustar esquinas</button>';
    if (estadoAuto === 'buscando') {
      zona.innerHTML = '<span class="recorte-auto-texto"><span class="recorte-auto-punto"></span>Buscando los bordes del documento…</span>';
    } else if (estadoAuto === 'listo') {
      zona.innerHTML = (usandoAuto
        ? '<span class="recorte-auto-texto">Recortado automáticamente</span><button type="button" id="recorte-auto-alternar">Ver foto original</button>'
        : '<button type="button" id="recorte-auto-alternar">Recorte automático</button>') + botonEsquinas;
      zona.querySelector('#recorte-auto-alternar').addEventListener('click', () => {
        usandoAuto = !usandoAuto;
        tocado = false;
        mostrar(usandoAuto ? automatico : original);
      });
    } else if (estadoAuto === 'sin-bordes') {
      zona.innerHTML = '<span class="recorte-auto-texto">No he encontrado los bordes</span>' + botonEsquinas;
    } else {
      zona.innerHTML = '<span class="recorte-auto-texto">Recorte automático no disponible ahora: recórtalo a mano</span>';
    }
    const b = zona.querySelector('#recorte-auto-esquinas');
    if (b) b.addEventListener('click', abrirEditorEsquinas);
  }

  function mostrar(variante) {
    let anchoMarco = ANCHO_MAX, altoMarco = Math.round(ANCHO_MAX / (variante.ancho / variante.alto));
    if (altoMarco > ALTO_MAX) { altoMarco = ALTO_MAX; anchoMarco = Math.round(ALTO_MAX * (variante.ancho / variante.alto)); }

    montarRecortador(contenedor, variante.file, {
      anchoMarco, altoMarco, radioMarco: 14,
      giro: true, marcoMax: { ancho: ANCHO_MAX, alto: ALTO_MAX },
      textoAyuda: 'Arrastra con un dedo para encajar el documento, pellizca con dos para hacer zoom o girarlo',
      textoConfirmar: 'Usar este recorte',
      onCancelar: () => { cerrado = true; onCancelar(); },
      generarSalida: ({ img, cx, cy, escala, rotacion, anchoMarco, altoMarco }) => {
        // 1 píxel del canvas de salida = 1 píxel real de la foto original,
        // al nivel de zoom actual, para no perder calidad al recortar.
        const factor = 1 / escala;
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(anchoMarco * factor);
        canvas.height = Math.round(altoMarco * factor);
        const ctx = canvas.getContext('2d');
        ctx.scale(factor, factor);
        ctx.translate(cx, cy);
        ctx.rotate(rotacion);
        ctx.scale(escala, escala);
        ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
        return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', .95));
      },
      onConfirmar: (blob) => {
        cerrado = true;
        const nombreBase = file.name.replace(/\.[^.]+$/, '') || 'documento';
        onConfirmar(new File([blob], nombreBase + '.jpg', { type: 'image/jpeg' }));
      },
    });

    contenedor.querySelector('.modal-acciones').insertAdjacentHTML('beforebegin', '<div class="recorte-auto" id="recorte-auto"></div>');
    contenedor.querySelector('#recorte-marco').addEventListener('pointerdown', () => { tocado = true; });
    contenedor.querySelector('.recorte-controles').addEventListener('pointerdown', () => { tocado = true; });
    pintarEstadoAuto();
  }

  // Editor de esquinas: la foto entera con un cuadrilátero de 4 puntos arrastrables y una
  // lupa mientras se arrastra. Al aceptar, se endereza por esas esquinas y se pasa al recorte.
  function abrirEditorEsquinas() {
    const w = original.ancho, h = original.alto;
    const ANCHO_ED = 300, ALTO_ED = 400;
    let ancho = ANCHO_ED, alto = Math.round(ANCHO_ED * h / w);
    if (alto > ALTO_ED) { alto = ALTO_ED; ancho = Math.round(ALTO_ED * w / h); }
    const k = ancho / w; // píxeles de pantalla por píxel de la foto
    // Punto de partida: las esquinas detectadas o, si no las hay, un rectángulo con margen.
    let pts = (esquinasDetectadas || [{ x: w * .1, y: h * .1 }, { x: w * .9, y: h * .1 }, { x: w * .9, y: h * .9 }, { x: w * .1, y: h * .9 }]).map((q) => ({ x: q.x, y: q.y }));
    const urlFoto = URL.createObjectURL(file);
    const cerrarEditor = () => URL.revokeObjectURL(urlFoto);

    contenedor.innerHTML = `
      <div class="esquinas-marco" id="esquinas-marco" style="width:${ancho}px;height:${alto}px;">
        <img src="${urlFoto}" alt="" draggable="false">
        <svg class="esquinas-svg" viewBox="0 0 ${ancho} ${alto}" width="${ancho}" height="${alto}">
          <polygon class="esquinas-borde" points=""></polygon>
          <polygon class="esquinas-poligono" points=""></polygon>
          ${[0, 1, 2, 3].map((i) => `<circle class="esquinas-punto" data-i="${i}" r="11"></circle>`).join('')}
        </svg>
        <div class="esquinas-lupa" id="esquinas-lupa" style="background-image:url('${urlFoto}')"></div>
      </div>
      <p class="recorte-ayuda">Arrastra cada esquina hasta una esquina del documento</p>
      <div class="modal-acciones">
        <button class="btn-secundario" id="esquinas-cancelar" type="button">Volver</button>
        <button class="btn-primario" id="esquinas-aceptar" type="button">Enderezar</button>
      </div>`;
    const marco = contenedor.querySelector('#esquinas-marco');
    const svg = marco.querySelector('svg');
    const lupa = marco.querySelector('#esquinas-lupa');
    const poligonos = marco.querySelectorAll('polygon');
    const puntos = [...marco.querySelectorAll('.esquinas-punto')];

    function pintar() {
      const lista = pts.map((q) => `${(q.x * k).toFixed(1)},${(q.y * k).toFixed(1)}`).join(' ');
      poligonos.forEach((p) => p.setAttribute('points', lista));
      puntos.forEach((c, i) => { c.setAttribute('cx', (pts[i].x * k).toFixed(1)); c.setAttribute('cy', (pts[i].y * k).toFixed(1)); });
    }
    pintar();

    const ZOOM = 3, LUPA = 104;
    function mostrarLupa(q) {
      lupa.style.display = 'block';
      lupa.style.backgroundSize = `${w * k * ZOOM}px ${h * k * ZOOM}px`;
      lupa.style.backgroundPosition = `${LUPA / 2 - q.x * k * ZOOM}px ${LUPA / 2 - q.y * k * ZOOM}px`;
      // se coloca en el lado contrario al dedo para no taparse
      lupa.style.left = q.x * k < ancho / 2 ? `${ancho - LUPA - 8}px` : '8px';
    }

    let activo = -1, desfase = { x: 0, y: 0 };
    const enFoto = (e) => { const r = svg.getBoundingClientRect(); return { x: (e.clientX - r.left) / k, y: (e.clientY - r.top) / k }; };
    svg.addEventListener('pointerdown', (e) => {
      const p = enFoto(e);
      let mejor = -1, mejorD = 32 / k; // radio de agarre: 32 px de pantalla
      pts.forEach((q, i) => { const d = Math.hypot(q.x - p.x, q.y - p.y); if (d < mejorD) { mejorD = d; mejor = i; } });
      if (mejor < 0) return;
      activo = mejor; desfase = { x: pts[mejor].x - p.x, y: pts[mejor].y - p.y };
      svg.setPointerCapture(e.pointerId);
      mostrarLupa(pts[activo]);
      e.preventDefault();
    });
    svg.addEventListener('pointermove', (e) => {
      if (activo < 0) return;
      const p = enFoto(e);
      pts[activo] = { x: Math.max(0, Math.min(w, p.x + desfase.x)), y: Math.max(0, Math.min(h, p.y + desfase.y)) };
      pintar(); mostrarLupa(pts[activo]);
    });
    const soltar = () => { activo = -1; lupa.style.display = 'none'; };
    svg.addEventListener('pointerup', soltar);
    svg.addEventListener('pointercancel', soltar);

    contenedor.querySelector('#esquinas-cancelar').addEventListener('click', () => {
      cerrarEditor();
      mostrar(usandoAuto ? automatico : original);
    });
    contenedor.querySelector('#esquinas-aceptar').addEventListener('click', async () => {
      const boton = contenedor.querySelector('#esquinas-aceptar');
      boton.disabled = true; boton.textContent = 'Enderezando…';
      try {
        const res = await enderezarConEsquinas(file, pts, imagenOriginal);
        cerrarEditor();
        if (cerrado || !contenedor.isConnected) return;
        if (!res) { mostrarToast('Las esquinas están demasiado juntas.', true); mostrar(usandoAuto ? automatico : original); return; }
        esquinasDetectadas = pts;
        automatico = res; estadoAuto = 'listo'; usandoAuto = true; tocado = false;
        mostrar(automatico);
      } catch (e) {
        console.error(e);
        cerrarEditor();
        mostrarToast('No se pudo enderezar la foto.', true);
        if (!cerrado && contenedor.isConnected) mostrar(usandoAuto ? automatico : original);
      }
    });
  }

  const urlPrevia = URL.createObjectURL(file);
  const preImg = new Image();
  preImg.onload = () => {
    URL.revokeObjectURL(urlPrevia);
    imagenOriginal = preImg;
    original = { file, ancho: preImg.naturalWidth, alto: preImg.naturalHeight };
    mostrar(original);

    detectarEsquinasEnFoto(file, preImg).then(async (det) => {
      if (cerrado || !contenedor.isConnected) return;
      if (!det) { estadoAuto = 'sin-bordes'; pintarEstadoAuto(); return; }
      esquinasDetectadas = det.esquinas;
      const res = await enderezarConEsquinas(file, det.esquinas, preImg);
      if (cerrado || !contenedor.isConnected) return;
      if (!res) { estadoAuto = 'sin-bordes'; pintarEstadoAuto(); return; }
      automatico = res;
      estadoAuto = 'listo';
      if (!tocado && !usandoAuto) { usandoAuto = true; mostrar(automatico); } else pintarEstadoAuto();
    }).catch((e) => {
      console.warn('Recorte automático no disponible', e);
      if (cerrado || !contenedor.isConnected) return;
      estadoAuto = 'no-disponible';
      pintarEstadoAuto();
    });
  };
  preImg.onerror = () => { URL.revokeObjectURL(urlPrevia); cerrado = true; onCancelar(); };
  preImg.src = urlPrevia;
}

function renderizarChipsCategorias() {
  const cont = $('#chips-categorias');
  cont.innerHTML = '';
  cont.classList.remove('chips-personas');
  const docsPersona = datos.documentos.filter((d) => d.personaId === personaActivaId);

  const chipTodos = crearChip({ id: 'todos', nombre: 'Todos', color: '#EDE9DE' });
  cont.appendChild(chipTodos);

  const categoriasConDocs = datos.categorias.filter((cat) => docsPersona.some((d) => d.categoria === cat.id));
  categoriasConDocs.forEach((cat) => cont.appendChild(crearChip(cat)));

  if (categoriaActiva !== 'todos' && !categoriasConDocs.some((c) => c.id === categoriaActiva)) {
    categoriaActiva = 'todos';
  }
}

function crearChip(cat) {
  const btn = document.createElement('button');
  const esCategoria = cat.id !== 'todos';
  btn.className = 'chip' + (esCategoria ? ' chip-categoria' : '') + (cat.id === categoriaActiva ? ' activo' : '');
  if (esCategoria) btn.style.background = cat.color;
  btn.textContent = cat.nombre;
  btn.addEventListener('click', () => {
    categoriaActiva = cat.id;
    renderizarChipsCategorias();
    renderizarDocumentos();
  });
  return btn;
}

// Mismo patrón que renderizarChipsCategorias/crearChip, pero al revés:
// aquí la categoría ya está fija (es la pantalla) y los chips filtran por
// persona — usados en abrirCategoriaGlobal, la vista transversal.
function renderizarChipsPersonas() {
  const cont = $('#chips-categorias');
  cont.innerHTML = '';
  cont.classList.add('chips-personas');
  const docsCategoria = datos.documentos.filter((d) => d.categoria === categoriaGlobalActivaId);

  const chipTodos = crearChipPersona({ id: 'todos', nombre: 'Todos' });
  cont.appendChild(chipTodos);

  const personasConDocs = datos.personas.filter((p) => docsCategoria.some((d) => d.personaId === p.id));
  personasConDocs.forEach((p) => cont.appendChild(crearChipPersona(p)));

  if (personaFiltroActiva !== 'todos' && !personasConDocs.some((p) => p.id === personaFiltroActiva)) {
    personaFiltroActiva = 'todos';
  }
}

// Igual que el selector de persona al subir un archivo: foto (o icono) y nombre debajo.
function crearChipPersona(persona) {
  const btn = document.createElement('button');
  const esTodos = persona.id === 'todos';
  btn.type = 'button';
  btn.className = 'opcion-persona' + (persona.id === personaFiltroActiva ? ' activa' : '');
  const avatar = esTodos
    ? `<span class="avatar-persona avatar-todos"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="9" cy="8" r="3.2"/><path d="M3 19.5c0-3.4 2.7-5.6 6-5.6s6 2.2 6 5.6"/><circle cx="16.5" cy="9" r="2.6"/><path d="M16.5 14c2.7 0 4.5 1.9 4.5 4.8"/></svg></span>`
    : `<span class="avatar-persona" style="${estiloAvatar(persona)}">${contenidoAvatar(persona)}</span>`;
  btn.innerHTML = avatar + `<span class="op-nombre">${escapeHtml(esTodos ? trad('Todos') : persona.nombre)}</span>`;
  btn.addEventListener('click', () => {
    personaFiltroActiva = persona.id;
    renderizarChipsPersonas();
    renderizarDocumentos();
  });
  return btn;
}

// ---- Desplegar / replegar (botón de la barra de abajo dentro de una persona o categoría) ----
// "replegado": los grupos de documentos salen cerrados, solo con su título; tocar uno lo abre.
// "desplegado": todos abiertos. Ver hacerGrupoPlegable.
const VISTA_DOCS_STORAGE_KEY = 'documentacion_vista_docs';
function obtenerVistaDocsGuardada() {
  return localStorage.getItem(VISTA_DOCS_STORAGE_KEY) === 'desplegado' ? 'desplegado' : 'replegado';
}
function guardarVistaDocs(modo) {
  localStorage.setItem(VISTA_DOCS_STORAGE_KEY, modo);
  gruposAlternados.clear();
  renderizarDocumentos();
}

// En "replegado" los grupos salen cerrados (solo los títulos) y en "desplegado" abiertos; tocar un
// título lo abre o cierra solo a él. Aquí se guardan los que el usuario ha cambiado respecto a eso.
// Con un filtro de chip puesto solo hay un grupo y se enseña siempre abierto.
const gruposAlternados = new Set();
function hacerGrupoPlegable(grupo, clave, numDocs, conFiltro, conCuenta = true) {
  const titulo = grupo.querySelector('.titulo-grupo');
  titulo.insertAdjacentHTML('beforeend', `${conCuenta ? `<span class="cuenta-grupo">(${numDocs})</span>` : ''}<svg class="flecha-grupo" width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`);
  if (conFiltro) return;
  const contexto = categoriaGlobalActivaId !== null ? 'c:' + categoriaGlobalActivaId : 'p:' + personaActivaId;
  const id = contexto + '|' + clave;
  const plegado = () => (obtenerVistaDocsGuardada() === 'replegado') !== gruposAlternados.has(id);
  grupo.classList.add('plegable');
  grupo.abrirGrupo = () => { if (plegado()) alternar(); };
  grupo.classList.toggle('plegado', plegado());
  titulo.setAttribute('role', 'button');
  titulo.tabIndex = 0;
  const alternar = () => {
    if (gruposAlternados.has(id)) gruposAlternados.delete(id); else gruposAlternados.add(id);
    grupo.classList.toggle('plegado', plegado());
    titulo.setAttribute('aria-expanded', String(!plegado()));
  };
  titulo.setAttribute('aria-expanded', String(!plegado()));
  titulo.addEventListener('click', alternar);
  titulo.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); alternar(); } });
}

// Frase "Usa el botón [subir] para añadir el primero." con el dibujo del botón de la barra de arriba, que también
// funciona como botón (activarBotonSubirInline le pone la acción).
function htmlFraseSubirPrimero() {
  return `<span>Usa el botón</span> <button type="button" class="icono-boton-inline" aria-label="Subir documento"><svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 4v12m0-12l-4 4m4-4l4 4M5 17v2a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button> <span>para añadir el primero.</span>`;
}
function activarBotonSubirInline(cont) {
  const boton = cont.querySelector('.icono-boton-inline');
  if (boton) boton.addEventListener('click', abrirModalSubida);
}

function renderizarDocumentos() {
  if (categoriaGlobalActivaId !== null) { renderizarDocumentosPorCategoria(); return; }

  const lista = datos.documentos.filter((d) => {
    if (d.personaId !== personaActivaId) return false;
    if (categoriaActiva !== 'todos' && d.categoria !== categoriaActiva) return false;
    return true;
  });

  const cont = $('#contenido-documentos');
  if (lista.length === 0) {
    cont.innerHTML = `
      <div class="estado-vacio">
        <svg width="44" height="44" viewBox="0 0 24 24" fill="none"><path d="M4 4h11l5 5v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z" stroke="currentColor" stroke-width="1.4"/><path d="M14 4v5h5" stroke="currentColor" stroke-width="1.4"/></svg>
        <p>No hay documentos aquí.<br>${htmlFraseSubirPrimero()}</p>
      </div>`;
    activarBotonSubirInline(cont);
    return;
  }

  // Documentos cuya categoría ya no existe (borrada aquí, o traída de una
  // importación con una categoría que en este dispositivo nunca existió):
  // todos caen juntos bajo "Sin categoría", sin importar qué id concreto
  // tuvieran guardado, para no acabar con varios grupos repetidos con
  // ese mismo título.
  const idsValidos = new Set(datos.categorias.map((c) => c.id));
  const claveCategoria = (doc) => idsValidos.has(doc.categoria) ? doc.categoria : CATEGORIA_SIN_ASIGNAR.id;

  const porCategoria = new Map();
  lista.forEach((doc) => {
    const clave = claveCategoria(doc);
    if (!porCategoria.has(clave)) porCategoria.set(clave, []);
    porCategoria.get(clave).push(doc);
  });

  const ordenCategorias = datos.categorias
    .map((c) => c.id)
    .filter((id) => porCategoria.has(id));
  if (porCategoria.has(CATEGORIA_SIN_ASIGNAR.id)) ordenCategorias.push(CATEGORIA_SIN_ASIGNAR.id);

  cont.innerHTML = '';
  ordenCategorias.forEach((catId) => {
    const cat = datos.categorias.find((c) => c.id === catId) || CATEGORIA_SIN_ASIGNAR;
    const docs = porCategoria.get(catId).slice().sort((a, b) => (b.fechaSubida || '').localeCompare(a.fechaSubida || ''));

    const grupo = document.createElement('div');
    grupo.className = 'grupo-documentos';
    grupo.innerHTML = `<h3 class="titulo-grupo"><span class="punto-grupo" style="color:${cat.color}"></span>${escapeHtml(cat.nombre)}</h3><div class="lista-docs"></div>`;
    const listaEl = grupo.querySelector('.lista-docs');
    docs.forEach((doc) => listaEl.appendChild(crearTarjetaDoc(doc)));
    hacerGrupoPlegable(grupo, catId, docs.length, categoriaActiva !== 'todos', false);
    cont.appendChild(grupo);
  });
}

// Misma lista de documentos que renderizarDocumentos, pero para la vista
// transversal por categoría (abrirCategoriaGlobal): en vez de agrupar por
// categoría (ya está fija, sería redundante), agrupa por persona, con su
// nombre y avatar encabezando cada grupo.
function renderizarDocumentosPorCategoria() {
  renderizarAvisoCaducidadCategoria();
  const lista = datos.documentos.filter((d) => {
    if (d.categoria !== categoriaGlobalActivaId) return false;
    if (personaFiltroActiva !== 'todos' && d.personaId !== personaFiltroActiva) return false;
    return true;
  });
  const cont = $('#contenido-documentos');
  if (lista.length === 0) {
    cont.innerHTML = `
      <div class="estado-vacio">
        <svg width="44" height="44" viewBox="0 0 24 24" fill="none"><path d="M4 4h11l5 5v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z" stroke="currentColor" stroke-width="1.4"/><path d="M14 4v5h5" stroke="currentColor" stroke-width="1.4"/></svg>
        <p>No hay documentos en esta categoría.<br>${htmlFraseSubirPrimero()}</p>
      </div>`;
    activarBotonSubirInline(cont);
    return;
  }

  const porPersona = new Map();
  lista.forEach((doc) => {
    if (!porPersona.has(doc.personaId)) porPersona.set(doc.personaId, []);
    porPersona.get(doc.personaId).push(doc);
  });

  cont.innerHTML = '';
  datos.personas.forEach((persona) => {
    if (!porPersona.has(persona.id)) return;
    const docs = porPersona.get(persona.id).slice().sort((a, b) => (b.fechaSubida || '').localeCompare(a.fechaSubida || ''));

    const grupo = document.createElement('div');
    grupo.className = 'grupo-documentos';
    grupo.innerHTML = `<h3 class="titulo-grupo"><span class="avatar-persona avatar-mini-grupo" style="${estiloAvatar(persona)}">${contenidoAvatar(persona)}</span>${escapeHtml(persona.nombre)}</h3><div class="lista-docs"></div>`;
    const listaEl = grupo.querySelector('.lista-docs');
    docs.forEach((doc) => listaEl.appendChild(crearTarjetaDoc(doc)));
    hacerGrupoPlegable(grupo, persona.id, docs.length, personaFiltroActiva !== 'todos', false);
    cont.appendChild(grupo);
  });
}

// Devuelve la ficha (o fichas) de un documento para la lista: si tiene varias páginas, cada una sale
// como su propia ficha, una debajo de otra (un DocumentFragment con varias fichas en vez de una sola).
function crearTarjetaDoc(doc) {
  if (doc.paginas.length > 1) {
    const frag = document.createDocumentFragment();
    doc.paginas.forEach((_, indice) => {
      const fila = crearTarjetaDocUnica(doc, indice);
      // Solo la primera página abre documento nuevo: las demás van pegadas a ella, para que
      // se vea de un vistazo qué páginas son del mismo documento (ver .inicio-doc en el CSS).
      if (indice === 0) fila.classList.add('inicio-doc');
      frag.appendChild(fila);
    });
    return frag;
  }
  const fila = crearTarjetaDocUnica(doc, null);
  fila.classList.add('inicio-doc');
  return fila;
}

// indicePagina === null → documento de una sola página. Un número → ficha de esa página concreta de
// un documento de varias, con el nombre de la página al lado del nombre del documento para distinguirlas.
function crearTarjetaDocUnica(doc, indicePagina) {
  const modoExpandido = indicePagina !== null;
  const pagina = modoExpandido ? doc.paginas[indicePagina] : doc.paginas[0];
  const badge = calcularBadgeCaducidad(doc.fechaCaducidad);
  const esImagen = (pagina.mimeType || '').startsWith('image/');
  const variasPaginas = doc.paginas.length > 1;

  // La primera página se guarda con el mismo nombre que el documento mientras no se le
  // ponga uno a mano (ver #input-nombre en abrirModalSubida) — mostrar ese mismo nombre
  // también a la derecha sería redundante con el de la izquierda, así que solo se muestra
  // el nombre de la página cuando de verdad es distinto; si no, se deja sitio a la caducidad.
  const nombrePagina = pagina.nombre || trad('Página {n}', { n: (indicePagina ?? 0) + 1 });
  const badgePaginaRedundante = modoExpandido && nombrePagina === doc.nombre;
  const mostrarBadgePagina = modoExpandido && variasPaginas && !badgePaginaRedundante;

  const clave = claveSeleccion(doc, indicePagina);
  const fila = document.createElement('button');
  fila.className = 'doc-fila' + (docsSeleccionados.has(clave) ? ' seleccionada' : '') + (badge ? ' ' + badge.estado : '');
  // Fondo teñido con el color de la categoría del documento: ayuda a distinguir unas fichas
  // de otras cuando hay varias seguidas (sobre todo con varios documentos desplegados en
  // páginas sueltas, donde si no todas se ven iguales).
  const categoriaDoc = datos.categorias.find((c) => c.id === doc.categoria) || CATEGORIA_SIN_ASIGNAR;
  fila.style.setProperty('--color-categoria', categoriaDoc.color);
  fila.dataset.docId = doc.id;
  fila.innerHTML = `
    <div class="miniatura">
      ${esImagen ? '<div class="skeleton"></div>' : `<svg class="icono-pdf" width="44" height="44" viewBox="0 0 24 24" fill="none"><path d="M6 3h9l5 5v13H6V3z" stroke="currentColor" stroke-width="1.3"/><path d="M15 3v5h5" stroke="currentColor" stroke-width="1.3"/></svg>`}
      <span class="check-seleccion"><svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M4 12l6 6L20 6" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
      ${badge ? `<span class="cinta-caducidad ${badge.estado}">${trad(badge.estado === 'caducado' ? 'Caducado' : 'Por caducar')}</span>` : ''}
    </div>
    <div class="info">
      <p class="doc-nombre">${escapeHtml(doc.nombre)}</p>
      ${mostrarBadgePagina
        ? `<span class="badge-mini pagina">${escapeHtml(nombrePagina)}</span>`
        : (badge ? `<span class="badge-mini ${badge.estado}">${badge.texto}</span>` : '')}
    </div>`;

  // Mantener pulsado selecciona el documento (para compartir varios); aquí NUNCA sirve para
  // moverlo, solo para seleccionarlo. Con un dedo real el toque tiembla unos píxeles aunque se
  // mantenga "quieto" — cancelar con el primer pointermove (como antes) hacía que casi nunca
  // llegara a dispararse. Se tolera un pequeño movimiento (como en arrastrar personas/categorías)
  // y solo se cancela si es un desplazamiento de verdad, para no confundirlo con hacer scroll.
  const UMBRAL_MOVIMIENTO_LP_DOC = 12;
  let presionLargaDisparada = false;
  fila.addEventListener('pointerdown', (eventoInicial) => {
    if (eventoInicial.button !== undefined && eventoInicial.button !== 0) return;
    const inicioX = eventoInicial.clientX, inicioY = eventoInicial.clientY;
    let cancelado = false;
    const timer = setTimeout(() => {
      if (cancelado) return;
      cancelado = true;
      limpiar();
      presionLargaDisparada = true;
      if (navigator.vibrate) navigator.vibrate(12);
      alternarSeleccionDoc(clave, fila, true);
    }, 420);
    const cancelarSiSeMueve = (ev) => {
      if (cancelado) return;
      if (Math.hypot(ev.clientX - inicioX, ev.clientY - inicioY) > UMBRAL_MOVIMIENTO_LP_DOC) { cancelado = true; clearTimeout(timer); limpiar(); }
    };
    const cancelarPorSoltar = () => { if (cancelado) return; cancelado = true; clearTimeout(timer); limpiar(); };
    function limpiar() {
      window.removeEventListener('pointermove', cancelarSiSeMueve);
      window.removeEventListener('pointerup', cancelarPorSoltar);
      window.removeEventListener('pointercancel', cancelarPorSoltar);
    }
    window.addEventListener('pointermove', cancelarSiSeMueve, { passive: true });
    window.addEventListener('pointerup', cancelarPorSoltar, { once: true });
    window.addEventListener('pointercancel', cancelarPorSoltar, { once: true });
  });
  fila.addEventListener('click', () => {
    // El toque de soltar el dedo, tras una pulsación larga que ya ha seleccionado el
    // documento, no debe volver a alternar la selección (la dejaría desmarcada otra vez).
    if (presionLargaDisparada) { presionLargaDisparada = false; return; }
    if (modoSeleccionDocs) { alternarSeleccionDoc(clave, fila); return; }
    abrirVisor(doc, modoExpandido ? indicePagina : 0);
  });

  if (esImagen) {
    obtenerBlobPagina(pagina).then((blob) => {
      const url = URL.createObjectURL(blob);
      const cont = fila.querySelector('.miniatura');
      const img = document.createElement('img');
      img.src = url; img.alt = doc.nombre; img.loading = 'lazy';
      img.onload = () => {
        cont.querySelector('.skeleton')?.remove();
        // Documentos verticales: la ficha crece lo justo para que quepa
        // entera la foto, en vez de recortarla en un recuadro apaisado.
        if (img.naturalHeight > img.naturalWidth) {
          cont.style.aspectRatio = `${img.naturalWidth} / ${img.naturalHeight}`;
        }
        URL.revokeObjectURL(url);
      };
      img.onerror = () => URL.revokeObjectURL(url);
      cont.appendChild(img);
    }).catch(() => { fila.querySelector('.skeleton')?.remove(); });
  }

  return fila;
}

function activarModoSeleccion() {
  modoSeleccionDocs = true;
  document.body.classList.add('modo-seleccion');
  actualizarBarraSeleccion();
}
function entrarModoSeleccion() {
  if (modoSeleccionDocs) return;
  activarModoSeleccion();
  pushNavegacion(limpiarModoSeleccion);
}

// Identifica lo que selecciona una ficha: un documento de una sola página es el documento entero; en
// los de varias, cada página es su propia unidad, independiente de las demás páginas del mismo documento.
function claveSeleccion(doc, indicePagina) {
  return indicePagina === null ? doc.id : `${doc.id}#${indicePagina}`;
}

function alternarSeleccionDoc(clave, fila, activarModo = false) {
  if (activarModo) entrarModoSeleccion();
  if (!modoSeleccionDocs) return;
  if (docsSeleccionados.has(clave)) {
    docsSeleccionados.delete(clave);
    fila.classList.remove('seleccionada');
  } else {
    docsSeleccionados.add(clave);
    fila.classList.add('seleccionada');
  }
  actualizarBarraSeleccion();
}

// Resuelve las claves guardadas (id de documento entero, o "id#índice" de una página suelta)
// en pares {doc, indicePagina}, para compartir/borrar solo lo que de verdad está marcado.
function unidadesSeleccionadas() {
  return [...docsSeleccionados].map((clave) => {
    const [id, indiceStr] = clave.split('#');
    const doc = datos.documentos.find((d) => d.id === id);
    if (!doc) return null;
    return { doc, indicePagina: indiceStr === undefined ? null : Number(indiceStr) };
  }).filter(Boolean);
}

function actualizarBarraSeleccion() {
  const n = docsSeleccionados.size;
  $('#texto-seleccion').textContent = trad(n === 1 ? '{n} seleccionado' : '{n} seleccionados', { n });
  $('#btn-compartir-seleccion').disabled = n === 0;
  $('#barra-seleccion').classList.toggle('hidden', !modoSeleccionDocs);
}

function limpiarModoSeleccion() {
  modoSeleccionDocs = false;
  docsSeleccionados.clear();
  document.body.classList.remove('modo-seleccion');
  $$('.doc-fila.seleccionada').forEach((f) => f.classList.remove('seleccionada'));
  $('#barra-seleccion').classList.add('hidden');
}
function salirModoSeleccion() {
  if (!modoSeleccionDocs) return;
  limpiarModoSeleccion();
}

$('#btn-cancelar-seleccion').addEventListener('click', volverAtras);
$('#btn-compartir-seleccion').addEventListener('click', () => {
  // Cada unidad seleccionada puede ser un documento entero (modo replegado) o una sola
  // página suelta (modo desplegado) — se comparten exactamente las páginas marcadas.
  const unidades = unidadesSeleccionadas();
  if (!unidades.length) return;
  const paginas = unidades.flatMap((u) => u.indicePagina === null ? u.doc.paginas : [u.doc.paginas[u.indicePagina]]);
  const titulo = unidades.length === 1
    ? (unidades[0].indicePagina === null ? unidades[0].doc.nombre : (unidades[0].doc.paginas[unidades[0].indicePagina].nombre || unidades[0].doc.nombre))
    : trad('{n} documentos', { n: unidades.length });

  // Las mismas dos opciones que en el menú de un documento suelto, para no tener que
  // salir de la selección y entrar uno por uno si lo que se quiere es el PDF.
  abrirModal(`
    <div class="ajustes">
      ${cabeceraMenu(titulo)}
      <div class="grupo">
        ${filaMenu('op-compartir-sel', 'azul', ICONOS_MENU.compartir, 'Compartir', 'Envía los archivos por correo, etc.')}
        ${filaMenu('op-compartir-sel-pdf', 'morado', ICONOS_MENU.pdf, 'Compartir como PDF', paginas.length === 1 ? 'Un PDF con este documento' : 'Un solo PDF con todo lo elegido')}
      </div>
    </div>
  `);
  activarArrastreParaCerrar($('.cabecera-hoja'));
  // Se cierran de golpe el menú y el modo selección (cerrarCapas es síncrono, así no se
  // pisa con lo que viene después) y se comparte con lo que ya está guardado aquí arriba,
  // porque al salir del modo selección la lista de marcados se vacía.
  const cerrarYCompartir = (accion) => { cerrarCapas(2); accion(); };
  $('#op-compartir-sel').addEventListener('click', () => cerrarYCompartir(() => compartirPaginas(paginas, titulo)));
  $('#op-compartir-sel-pdf').addEventListener('click', () => cerrarYCompartir(() => compartirPaginasComoPdf(paginas, titulo)));
});

// Al compartir (correo, etc.) el archivo lleva EXACTAMENTE el mismo nombre que tiene en la nube.
function nombreArchivoParaCompartir(pagina) {
  return nombreArchivoRemoto(pagina, documentoDePagina(pagina));
}

// Comparte una o varias páginas sueltas (de uno o varios documentos).
async function compartirPaginas(paginas, tituloGrupo) {
  if (!paginas.length) return;
  if (!navigator.share) {
    mostrarToast('Este móvil no permite compartir archivos desde el navegador.', true);
    return;
  }
  mostrarToast('Preparando…');
  try {
    const archivos = await Promise.all(paginas.map(async (pagina) => {
      const blob = await obtenerBlobPagina(pagina);
      return new File([blob], nombreArchivoParaCompartir(pagina), { type: pagina.mimeType || blob.type });
    }));
    if (navigator.canShare && !navigator.canShare({ files: archivos })) {
      mostrarToast('Estos archivos no se pueden compartir desde aquí.', true);
      return;
    }
    await navigator.share({
      files: archivos,
      title: tituloGrupo || (archivos.length === 1 ? paginas[0].nombre : trad('{n} documentos', { n: archivos.length })),
    });
  } catch (e) {
    if (e.name !== 'AbortError') mostrarToast('No se pudo compartir.', true);
  }
}

function medirImagenBlob(blob) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve({ ancho: img.naturalWidth, alto: img.naturalHeight }); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('no se pudo leer la imagen')); };
    img.src = url;
  });
}

// Construye un PDF de una o varias páginas cuyo tamaño es exactamente el
// de cada imagen (sin márgenes ni hoja en blanco alrededor): la página ES
// el documento. Incrusta los JPEG tal cual, sin volver a comprimirlos.
// paginas: [{ bytesJpeg, anchoPx, altoPx }]
function construirPdfDesdeImagenes(paginas) {
  const DPI = 150;
  const encoder = new TextEncoder();
  const partes = [];
  const offsets = [];
  let offset = 0;

  const agregarTexto = (str) => { const b = encoder.encode(str); partes.push(b); offset += b.length; };
  const agregarBytes = (b) => { partes.push(b); offset += b.length; };
  const marcarObjeto = () => offsets.push(offset);

  agregarTexto('%PDF-1.4\n');

  const n = paginas.length;
  const idsPagina = [];
  for (let i = 0; i < n; i++) idsPagina.push(3 + i * 3);

  marcarObjeto(); // objeto 1: catálogo
  agregarTexto('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');

  marcarObjeto(); // objeto 2: árbol de páginas
  agregarTexto(`2 0 obj\n<< /Type /Pages /Kids [${idsPagina.map((id) => `${id} 0 R`).join(' ')}] /Count ${n} >>\nendobj\n`);

  paginas.forEach((pagina, i) => {
    const idPagina = 3 + i * 3;
    const idImagen = idPagina + 1;
    const idContenido = idPagina + 2;
    const anchoPt = Math.round(pagina.anchoPx * 72 / DPI);
    const altoPt = Math.round(pagina.altoPx * 72 / DPI);

    marcarObjeto();
    agregarTexto(`${idPagina} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${anchoPt} ${altoPt}] /Resources << /XObject << /Im0 ${idImagen} 0 R >> >> /Contents ${idContenido} 0 R >>\nendobj\n`);

    marcarObjeto();
    agregarTexto(`${idImagen} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${pagina.anchoPx} /Height ${pagina.altoPx} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${pagina.bytesJpeg.length} >>\nstream\n`);
    agregarBytes(pagina.bytesJpeg);
    agregarTexto('\nendstream\nendobj\n');

    const contenido = `q ${anchoPt} 0 0 ${altoPt} 0 0 cm /Im0 Do Q`;
    marcarObjeto();
    agregarTexto(`${idContenido} 0 obj\n<< /Length ${contenido.length} >>\nstream\n${contenido}\nendstream\nendobj\n`);
  });

  const totalObjetos = 2 + n * 3;
  const xrefOffset = offset;
  agregarTexto(`xref\n0 ${totalObjetos + 1}\n0000000000 65535 f \n`);
  offsets.forEach((o) => agregarTexto(String(o).padStart(10, '0') + ' 00000 n \n'));
  agregarTexto(`trailer\n<< /Size ${totalObjetos + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);

  const total = partes.reduce((s, p) => s + p.length, 0);
  const resultado = new Uint8Array(total);
  let pos = 0;
  for (const p of partes) { resultado.set(p, pos); pos += p.length; }
  return resultado;
}

async function compartirPaginaComoPdf(pagina) {
  // Si ya es un PDF, no hay nada que convertir: se comparte tal cual.
  if ((pagina.mimeType || '').startsWith('application/pdf')) {
    await compartirPaginas([pagina]);
    return;
  }
  if (!navigator.share) {
    mostrarToast('Este móvil no permite compartir archivos desde el navegador.', true);
    return;
  }
  mostrarToast('Generando PDF…');
  try {
    const blob = await obtenerBlobPagina(pagina);
    const { ancho, alto } = await medirImagenBlob(blob);
    const bytesJpeg = new Uint8Array(await blob.arrayBuffer());
    const bytesPdf = construirPdfDesdeImagenes([{ bytesJpeg, anchoPx: ancho, altoPx: alto }]);
    const archivo = new File([bytesPdf], (nombreBaseRemoto(pagina, documentoDePagina(pagina)) || 'documento') + '.pdf', { type: 'application/pdf' });
    if (navigator.canShare && !navigator.canShare({ files: [archivo] })) {
      mostrarToast('Este archivo no se puede compartir desde aquí.', true);
      return;
    }
    await navigator.share({ files: [archivo], title: pagina.nombre });
  } catch (e) {
    if (e.name !== 'AbortError') mostrarToast('No se pudo generar el PDF.', true);
  }
}

// Une todas las páginas del documento en un único PDF de varias hojas.
async function compartirDocumentoComoPdf(doc) {
  if (doc.paginas.length === 1) { await compartirPaginaComoPdf(doc.paginas[0]); return; }
  if (!navigator.share) {
    mostrarToast('Este móvil no permite compartir archivos desde el navegador.', true);
    return;
  }
  mostrarToast('Generando PDF…');
  try {
    const paginasPdf = await Promise.all(doc.paginas.map(async (pagina) => {
      const blob = await obtenerBlobPagina(pagina);
      const { ancho, alto } = await medirImagenBlob(blob);
      const bytesJpeg = new Uint8Array(await blob.arrayBuffer());
      return { bytesJpeg, anchoPx: ancho, altoPx: alto };
    }));
    const bytesPdf = construirPdfDesdeImagenes(paginasPdf);
    const archivo = new File([bytesPdf], (doc.nombre || 'documento') + '.pdf', { type: 'application/pdf' });
    if (navigator.canShare && !navigator.canShare({ files: [archivo] })) {
      mostrarToast('Este archivo no se puede compartir desde aquí.', true);
      return;
    }
    await navigator.share({ files: [archivo], title: doc.nombre });
  } catch (e) {
    if (e.name !== 'AbortError') mostrarToast('No se pudo generar el PDF.', true);
  }
}

// Une en un solo PDF todo lo que esté seleccionado, aunque sean de personas o categorías
// distintas. Las páginas que YA son un PDF no se pueden meter dentro de otro PDF: se envían
// aparte, junto al que se genera con las fotos, para no dejarse nada por el camino.
async function compartirPaginasComoPdf(paginas, titulo) {
  const esPdf = (p) => (p.mimeType || '').startsWith('application/pdf');
  const imagenes = paginas.filter((p) => !esPdf(p));
  const pdfsSueltos = paginas.filter(esPdf);
  if (!imagenes.length) { await compartirPaginas(pdfsSueltos, titulo); return; }
  if (!navigator.share) {
    mostrarToast('Este móvil no permite compartir archivos desde el navegador.', true);
    return;
  }
  mostrarToast('Generando PDF…');
  try {
    const paginasPdf = await Promise.all(imagenes.map(async (pagina) => {
      const blob = await obtenerBlobPagina(pagina);
      const { ancho, alto } = await medirImagenBlob(blob);
      return { bytesJpeg: new Uint8Array(await blob.arrayBuffer()), anchoPx: ancho, altoPx: alto };
    }));
    const archivos = [new File([construirPdfDesdeImagenes(paginasPdf)], (titulo || 'documentos') + '.pdf', { type: 'application/pdf' })];
    for (const pagina of pdfsSueltos) {
      archivos.push(new File([await obtenerBlobPagina(pagina)], nombreArchivoParaCompartir(pagina), { type: 'application/pdf' }));
    }
    if (navigator.canShare && !navigator.canShare({ files: archivos })) {
      mostrarToast('Estos archivos no se pueden compartir desde aquí.', true);
      return;
    }
    await navigator.share({ files: archivos, title: titulo });
  } catch (e) {
    if (e.name !== 'AbortError') mostrarToast('No se pudo generar el PDF.', true);
  }
}

function calcularBadgeCaducidad(fecha) {
  if (!fecha) return null;
  const dias = diasHastaCaducidad(fecha);
  if (dias === 0) return { estado: 'caducado', texto: trad('Caducó hoy') };
  if (dias < 0) return { estado: 'caducado', texto: trad(dias === -1 ? 'Caducó hace {n} día' : 'Caducó hace {n} días', { n: -dias }) };
  if (dias <= 60) return { estado: 'aviso', texto: trad(dias === 1 ? '{n} día' : '{n} días', { n: dias }) };
  return null;
}
// Cuenta, para una persona, cuántos de sus documentos están ya
// caducados y cuántos solo en aviso (dentro de los 60 días, sin vencer
// aún) — de aquí salen tanto la insignia de su botón como la barra de
// su propia pantalla.
function contarCaducidadesPersona(personaId) {
  let caducados = 0, avisos = 0;
  datos.documentos.forEach((d) => {
    if (d.personaId !== personaId) return;
    const badge = calcularBadgeCaducidad(d.fechaCaducidad);
    if (!badge) return;
    if (badge.estado === 'caducado') caducados++; else avisos++;
  });
  return { caducados, avisos };
}
function estadoCaducidadPersona(personaId) {
  const { caducados, avisos } = contarCaducidadesPersona(personaId);
  if (caducados > 0) return 'caducado';
  if (avisos > 0) return 'aviso';
  return null;
}
function svgAvisoCaducidad(tamano) {
  return `<svg width="${tamano}" height="${tamano}" viewBox="0 0 24 24" fill="none"><path d="M12 7.5v6M12 17h.01" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>`;
}
function htmlAvisoCaducidadPersona(personaId) {
  const estado = estadoCaducidadPersona(personaId);
  return estado
    ? `<span class="aviso-caducidad-persona ${estado}" aria-label="Tiene documentos caducados o a punto de caducar">${svgAvisoCaducidad('80%')}</span>`
    : '';
}
// Pinta los dos avisos de arriba (caducados / a punto de caducar) con los recuentos dados. Son los mismos
// elementos en la pantalla de una persona y en la de una categoría.
function pintarAvisosCaducidad(caducados, avisos) {
  const placa = (texto) => `<span class="banner-placa"><span>${texto}</span><span class="banner-flecha" aria-hidden="true">›</span></span>`;
  const bannerCaducado = $('#aviso-caducado-persona');
  bannerCaducado.classList.toggle('hidden', caducados === 0);
  if (caducados > 0) bannerCaducado.innerHTML = placa(trad(caducados === 1 ? 'Tiene {n} documento caducado' : 'Tiene {n} documentos caducados', { n: caducados }));
  const bannerAviso = $('#aviso-porcaducar-persona');
  bannerAviso.classList.toggle('hidden', avisos === 0);
  if (avisos > 0) bannerAviso.innerHTML = placa(trad(avisos === 1 ? 'Tiene {n} documento a punto de caducar' : 'Tiene {n} documentos a punto de caducar', { n: avisos }));
}
function renderizarAvisoCaducidadPersona() {
  const { caducados, avisos } = contarCaducidadesPersona(personaActivaId);
  pintarAvisosCaducidad(caducados, avisos);
}
// En la pantalla de una categoría: los documentos de esa categoría (de la persona elegida en los chips, si hay).
function renderizarAvisoCaducidadCategoria() {
  pintarAvisosCaducidad(documentosConAviso('caducado').length, documentosConAviso('aviso').length);
}
// Estado de caducidad de una categoría entera (para la marca de su barra): el peor de sus documentos.
function estadoCaducidadCategoria(catId) {
  let estado = null;
  datos.documentos.forEach((d) => {
    if (d.categoria !== catId) return;
    const b = calcularBadgeCaducidad(d.fechaCaducidad);
    if (!b) return;
    if (b.estado === 'caducado') estado = 'caducado';
    else if (!estado) estado = 'aviso';
  });
  return estado;
}
// Al pulsar un aviso: la lista se desplaza (en la misma pantalla) hasta el documento y lo resalta un
// momento. Con varios en ese estado, cada toque va al siguiente (del que antes caduca al que después).
function documentosConAviso(estado) {
  return datos.documentos
    .filter((d) => {
      if (categoriaGlobalActivaId !== null) {
        if (d.categoria !== categoriaGlobalActivaId) return false;
        if (personaFiltroActiva !== 'todos' && d.personaId !== personaFiltroActiva) return false;
      } else if (d.personaId !== personaActivaId) return false;
      return (calcularBadgeCaducidad(d.fechaCaducidad) || {}).estado === estado;
    })
    .sort((a, b) => a.fechaCaducidad.localeCompare(b.fechaCaducidad));
}
let ultimoSaltoAviso = { contexto: null, indice: -1 };
function irADocumentosConAviso(estado) {
  const docs = documentosConAviso(estado);
  if (!docs.length) return;
  const contexto = [estado, personaActivaId, categoriaGlobalActivaId, personaFiltroActiva, docs.map((d) => d.id).join(',')].join('|');
  const indice = ultimoSaltoAviso.contexto === contexto ? (ultimoSaltoAviso.indice + 1) % docs.length : 0;
  ultimoSaltoAviso = { contexto, indice };
  const doc = docs[indice];
  if (categoriaGlobalActivaId === null && categoriaActiva !== 'todos' && doc.categoria !== categoriaActiva) {
    categoriaActiva = 'todos';
    renderizarChipsCategorias();
    renderizarDocumentos();
  }
  const fila = document.querySelector(`#contenido-documentos .doc-fila[data-doc-id="${doc.id}"]`);
  if (!fila) return;
  const grupo = fila.closest('.grupo-documentos');
  if (grupo && grupo.abrirGrupo) grupo.abrirGrupo();
  fila.scrollIntoView({ behavior: 'smooth', block: 'center' });
  document.querySelectorAll('.doc-fila.destacada').forEach((e) => e.classList.remove('destacada'));
  void fila.offsetWidth;
  fila.classList.add('destacada');
}
['caducado', 'aviso'].forEach((estado) => {
  const banner = $(estado === 'caducado' ? '#aviso-caducado-persona' : '#aviso-porcaducar-persona');
  banner.setAttribute('role', 'button');
  banner.tabIndex = 0;
  banner.addEventListener('click', () => irADocumentosConAviso(estado));
  banner.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); irADocumentosConAviso(estado); } });
});
function obtenerAvisosCaducidad() {
  try { return JSON.parse(localStorage.getItem('documentacion_avisos_caducidad') || '{}'); }
  catch (e) { return {}; }
}
function guardarAvisosCaducidad(avisos) {
  try { localStorage.setItem('documentacion_avisos_caducidad', JSON.stringify(avisos)); }
  catch (e) { /* ignorar */ }
}
function diasHastaCaducidad(fecha) {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const cad = new Date(fecha + 'T00:00:00');
  return Math.round((cad - hoy) / 86400000);
}

function comprobarCaducidadesYNotificar() {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const avisos = obtenerAvisosCaducidad();
  const gruposVivos = new Set();
  let cambiado = false;

  // Varias fotos (anverso/reverso) del mismo documento comparten
  // persona+categoría y suelen caducar el mismo día — se agrupan para
  // que solo llegue un aviso por categoría, no uno por cada foto.
  const grupos = new Map();
  datos.documentos.forEach((doc) => {
    if (!doc.fechaCaducidad) return;
    const clave = `${doc.personaId}:${doc.categoria}`;
    if (!grupos.has(clave)) grupos.set(clave, []);
    grupos.get(clave).push(doc);
  });

  grupos.forEach((docs, clave) => {
    gruposVivos.add(clave);
    // Manda la fecha más próxima a caducar dentro del grupo.
    const docMasProximo = docs.reduce((a, b) =>
      diasHastaCaducidad(a.fechaCaducidad) < diasHastaCaducidad(b.fechaCaducidad) ? a : b);
    const dias = diasHastaCaducidad(docMasProximo.fechaCaducidad);

    let estado = avisos[clave];
    if (!estado || estado.fecha !== docMasProximo.fechaCaducidad) {
      estado = { fecha: docMasProximo.fechaCaducidad, aviso60: false, aviso30: false, avisoCaducado: false };
    }

    const necesitaAvisoCaducado = dias <= 0 && !estado.avisoCaducado;
    const necesitaAviso30 = !necesitaAvisoCaducado && dias <= 30 && !estado.aviso30;
    const necesitaAviso60 = !necesitaAvisoCaducado && !necesitaAviso30 && dias <= 60 && !estado.aviso60;

    if (necesitaAvisoCaducado || necesitaAviso30 || necesitaAviso60) {
      notificarCaducidad(docMasProximo, dias);
      estado.aviso60 = true;
      if (necesitaAviso30 || necesitaAvisoCaducado) estado.aviso30 = true;
      if (necesitaAvisoCaducado) estado.avisoCaducado = true;
      cambiado = true;
    }
    avisos[clave] = estado;
  });

  Object.keys(avisos).forEach((clave) => {
    if (!gruposVivos.has(clave)) { delete avisos[clave]; cambiado = true; }
  });

  if (cambiado) guardarAvisosCaducidad(avisos);
}

// Imagen de la persona para la notificación (cuadrada, 192 px): su foto, o su icono sobre su color, o la inicial
// de su nombre. Así la notificación no repite dos veces el icono de la app (el pequeño ya lo pone el sistema).
async function imagenPersonaParaNotificacion(persona) {
  if (!persona) return 'icono.png';
  try {
    const T = 192;
    const lienzo = document.createElement('canvas');
    lienzo.width = lienzo.height = T;
    const ctx = lienzo.getContext('2d');
    const cargar = (src) => new Promise((ok, ko) => { const im = new Image(); im.onload = () => ok(im); im.onerror = ko; im.src = src; });
    if (persona.foto) {
      const im = await cargar(persona.foto);
      const lado = Math.min(im.width, im.height);
      ctx.drawImage(im, (im.width - lado) / 2, (im.height - lado) / 2, lado, lado, 0, 0, T, T);
    } else {
      ctx.fillStyle = colorParaPersona(persona);
      ctx.fillRect(0, 0, T, T);
      const ic = ICONOS_AVATAR.find((i) => i.id === persona.icono);
      if (ic) {
        ctx.drawImage(await cargar(ic.img), 0, 0, T, T);
      } else {
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 110px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText((persona.nombre || '?').trim().charAt(0).toUpperCase(), T / 2, T / 2 + 6);
      }
    }
    return lienzo.toDataURL('image/png');
  } catch (e) { return 'icono.png'; }
}

async function notificarCaducidad(doc, dias) {
  const persona = datos.personas.find((p) => p.id === doc.personaId);
  const categoria = datos.categorias.find((c) => c.id === doc.categoria);
  const que = categoria ? categoria.nombre : doc.nombre;
  const estado = dias < 0 ? 'ha caducado' : dias === 0 ? 'caduca hoy' : dias === 1 ? 'caduca mañana' : 'caduca en {n} días';
  // Título cortito: en el móvil comparte la línea con el nombre de la app y la hora, y solo caben unas 12 letras.
  const titulo = trad(dias < 0 ? 'Caducado' : 'Por caducar');
  // "Carnet de Ana ha caducado.": con o sin la persona, en el idioma de la interfaz
  const cuerpo = persona ? trad('{doc} de {persona} ' + estado + '.', { doc: que, persona: persona.nombre, n: dias }) : trad('{doc} ' + estado + '.', { doc: que, n: dias });
  const opciones = {
    body: cuerpo, icon: await imagenPersonaParaNotificacion(persona), badge: 'icono_notificacion.png',
    tag: 'caducidad-' + doc.id, data: { personaId: doc.personaId },
  };
  if (navigator.serviceWorker) {
    navigator.serviceWorker.ready.then((reg) => reg.showNotification(titulo, opciones)).catch(() => {});
  } else {
    try { new Notification(titulo, opciones); } catch (e) { /* ignorar */ }
  }
}

// Zoom del visor de una imagen: doble toque para acercar (a un nivel fijo) o para volver al tamaño
// original si ya estaba ampliada, doble toque SIN soltar y deslizando arriba/abajo para variar el
// zoom en el momento, pellizco con dos dedos, y arrastrar con un dedo para moverse por la imagen
// ampliada. Todo a mano (sin el zoom nativo del navegador — touch-action:none en .visor-cuerpo, ver
// el CSS) para poder combinar doble-toque-y-arrastre con lo demás en el mismo gesto.
// Con la imagen a tamaño normal (sin ampliar), ese mismo arrastre de un dedo no mueve nada — se deja
// para decidir al soltar si fue un deslizar de lado a lado (cambiar de página), avisando con
// onDeslizar(1 o -1) si lo pasan. Solo tiene efecto cuando NO está ampliada, igual que el deslizar
// entre personas/categorías, para no pelearse con el arrastre-para-moverse cuando sí lo está.
function activarZoomVisor(cuerpo, onDeslizar) {
  const img = cuerpo.querySelector('img');
  if (!img) return;
  const ZOOM_MIN = 1, ZOOM_DOBLE_TOQUE = 2.5, ZOOM_MAX = 5;
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  const distancia = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const puntoMedio = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  const centroCuerpo = () => {
    const r = cuerpo.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  };

  let escala = 1, panX = 0, panY = 0;
  const punteros = new Map();
  let pinchRef = null, panRef = null, dobleToqueRef = null;
  let inicioToque = null, ultimoToqueArriba = null;

  function aplicar(conTransicion) {
    img.style.transition = conTransicion ? 'transform .25s ease' : 'none';
    img.style.transform = `translate(${panX}px, ${panY}px) scale(${escala})`;
  }
  function limitar() {
    const r = cuerpo.getBoundingClientRect();
    const w = img.offsetWidth * escala, h = img.offsetHeight * escala;
    const maxPanX = Math.max(0, (w - r.width) / 2), maxPanY = Math.max(0, (h - r.height) / 2);
    panX = clamp(panX, -maxPanX, maxPanX);
    panY = clamp(panY, -maxPanY, maxPanY);
  }
  function esSegundoToque(e) {
    if (!ultimoToqueArriba) return false;
    return Date.now() - ultimoToqueArriba.t < 350 && distancia(e, ultimoToqueArriba) < 40;
  }

  cuerpo.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    cuerpo.setPointerCapture(e.pointerId);
    punteros.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (punteros.size === 2) {
      dobleToqueRef = null; panRef = null; inicioToque = null;
      const [a, b] = [...punteros.values()];
      const centro = puntoMedio(a, b), c = centroCuerpo();
      pinchRef = {
        dist: distancia(a, b), escalaInicio: escala, panXInicio: panX, panYInicio: panY,
        offXInicio: centro.x - (c.x + panX), offYInicio: centro.y - (c.y + panY),
      };
      return;
    }
    if (punteros.size !== 1) return;
    inicioToque = { x: e.clientX, y: e.clientY, t: Date.now() };
    if (esSegundoToque(e)) {
      const c = centroCuerpo();
      dobleToqueRef = {
        x: e.clientX, y: e.clientY, escalaInicio: escala, panXInicio: panX, panYInicio: panY,
        offXInicio: e.clientX - (c.x + panX), offYInicio: e.clientY - (c.y + panY), movido: false,
      };
      ultimoToqueArriba = null;
    } else {
      // Con zoom normal (escala 1) el arrastre no mueve la imagen: se deja para decidir al soltar
      // si fue un deslizar de lado a lado (cambiar de página, ver esDeslizar más abajo). Con la
      // imagen ampliada, el mismo arrastre sí mueve la imagen (desplazarse por ella).
      panRef = { x: e.clientX, y: e.clientY, t: Date.now(), panXInicio: panX, panYInicio: panY, esDeslizar: escala <= 1.01 };
    }
  });

  cuerpo.addEventListener('pointermove', (e) => {
    if (!punteros.has(e.pointerId)) return;
    punteros.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (punteros.size === 2 && pinchRef) {
      const [a, b] = [...punteros.values()];
      const nuevaEscala = clamp(pinchRef.escalaInicio * (distancia(a, b) / pinchRef.dist), ZOOM_MIN, ZOOM_MAX);
      panX = pinchRef.panXInicio + pinchRef.offXInicio * (1 - nuevaEscala / pinchRef.escalaInicio);
      panY = pinchRef.panYInicio + pinchRef.offYInicio * (1 - nuevaEscala / pinchRef.escalaInicio);
      escala = nuevaEscala;
      limitar();
      aplicar(false);
      return;
    }
    if (dobleToqueRef) {
      const deltaY = dobleToqueRef.y - e.clientY, deltaX = e.clientX - dobleToqueRef.x;
      if (!dobleToqueRef.movido && Math.hypot(deltaX, deltaY) > 8) dobleToqueRef.movido = true;
      if (dobleToqueRef.movido) {
        const nuevaEscala = clamp(dobleToqueRef.escalaInicio * Math.pow(2, deltaY / 150), ZOOM_MIN, ZOOM_MAX);
        panX = dobleToqueRef.panXInicio + dobleToqueRef.offXInicio * (1 - nuevaEscala / dobleToqueRef.escalaInicio);
        panY = dobleToqueRef.panYInicio + dobleToqueRef.offYInicio * (1 - nuevaEscala / dobleToqueRef.escalaInicio);
        escala = nuevaEscala;
        aplicar(false);
      }
      return;
    }
    if (panRef && !panRef.esDeslizar) {
      panX = panRef.panXInicio + (e.clientX - panRef.x);
      panY = panRef.panYInicio + (e.clientY - panRef.y);
      limitar(); // si no, arrastrando rápido la imagen se puede ir mucho más allá de su borde de
      // verdad (el límite solo se aplicaba al soltar) y se ve el fondo oscuro del visor de golpe
      aplicar(false);
    }
  });

  function soltar(e) {
    punteros.delete(e.pointerId);

    if (pinchRef) {
      if (punteros.size >= 2) return;
      pinchRef = null;
      limitar(); aplicar(true);
      if (punteros.size === 1) {
        const [p] = [...punteros.values()];
        panRef = { x: p.x, y: p.y, panXInicio: panX, panYInicio: panY };
      }
      inicioToque = null;
      return;
    }

    if (dobleToqueRef) {
      if (punteros.size > 0) return;
      if (!dobleToqueRef.movido) {
        const nuevaEscala = escala > 1.01 ? ZOOM_MIN : ZOOM_DOBLE_TOQUE;
        const c = centroCuerpo();
        const offX = dobleToqueRef.x - (c.x + panX), offY = dobleToqueRef.y - (c.y + panY);
        panX += offX * (1 - nuevaEscala / escala);
        panY += offY * (1 - nuevaEscala / escala);
        escala = nuevaEscala;
        if (escala <= 1.01) { panX = 0; panY = 0; }
      } else if (escala < 1.08) {
        escala = 1; panX = 0; panY = 0;
      }
      limitar(); aplicar(true);
      dobleToqueRef = null; ultimoToqueArriba = null; inicioToque = null;
      return;
    }

    if (panRef) {
      if (punteros.size > 0) return;
      if (panRef.esDeslizar) {
        const dx = e.clientX - panRef.x, dy = e.clientY - panRef.y, dt = Date.now() - panRef.t;
        if (onDeslizar && dt <= 800 && Math.abs(dx) >= 70 && Math.abs(dx) >= Math.abs(dy) * 1.8) onDeslizar(dx < 0 ? 1 : -1);
      } else {
        limitar(); aplicar(true);
      }
      panRef = null;
    }

    if (punteros.size === 0 && inicioToque) {
      const esToqueCorto = distancia(e, inicioToque) < 12 && Date.now() - inicioToque.t < 400;
      ultimoToqueArriba = esToqueCorto ? { x: e.clientX, y: e.clientY, t: Date.now() } : null;
    }
    inicioToque = null;
  }
  cuerpo.addEventListener('pointerup', soltar);
  cuerpo.addEventListener('pointercancel', soltar);
}

// sinNavegacion: al cambiar de página deslizando (ver abajo) se reconstruye el visor entero con
// esta misma función, pero sin abrir un paso nuevo en el historial — un solo "atrás" tiene que
// cerrar el visor, no ir pasando página a página. direccionDeslizar (1 o -1) es solo para la
// animación de entrada del cuerpo, igual que al deslizar entre personas/categorías. volverAGaleria:
// este documento se abrió desde su galería de páginas (ver abrirGaleriaDocumento) — "atrás"/cerrar
// debe reabrir esa galería en vez de cerrar el visor del todo, si no un "atrás" se come dos pasos a
// la vez pero el segundo no se ve (la galería ya no estaba en el DOM, el visor la había pisado) y el
// siguiente "atrás" no hace nada (cierra un visor que ya estaba oculto).
async function abrirVisor(doc, indicePagina = 0, sinNavegacion = false, direccionDeslizar = 0, volverAGaleria = false) {
  const pagina = doc.paginas[indicePagina];
  const esImagen = (pagina.mimeType || '').startsWith('image/');
  const visor = $('#visor-completo');
  const badgeVisor = calcularBadgeCaducidad(doc.fechaCaducidad);
  visor.innerHTML = `
    <div class="visor-topbar">
      <button class="btn-icono-top" id="visor-cerrar" aria-label="Cerrar">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
      </button>
      <span class="titulo">${escapeHtml(pagina.nombre || doc.nombre)}</span>
      <div class="espaciador"></div>
      <button class="btn-icono-top" id="visor-descargar" aria-label="Descargar">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 3v12m0 0l-4-4m4 4l4-4M5 19h14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
      <button class="btn-icono-top" id="visor-ajustes" aria-label="Opciones del documento">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="5" cy="12" r="1.7" fill="currentColor"/><circle cx="12" cy="12" r="1.7" fill="currentColor"/><circle cx="19" cy="12" r="1.7" fill="currentColor"/></svg>
      </button>
    </div>
    <div class="visor-cuerpo" id="visor-cuerpo">
      <div class="estado-carga"><div class="spinner"></div><span>Abriendo…</span></div>
    </div>
    ${badgeVisor ? `<button type="button" class="visor-actualizar ${badgeVisor.estado}" id="visor-actualizar">${ICONOS_MENU.subir}<span>${trad('Actualizar documento')}</span><small>${badgeVisor.texto}</small></button>` : ''}`;
  visor.classList.remove('hidden');
  $('#visor-actualizar')?.addEventListener('click', () => abrirModalActualizar(doc));
  if (direccionDeslizar) {
    const cuerpoNuevo = $('#visor-cuerpo');
    cuerpoNuevo.classList.add(direccionDeslizar > 0 ? 'desliza-der' : 'desliza-izq');
  }
  let urlActual = null;
  const cerrarVisor = () => {
    if (urlActual) URL.revokeObjectURL(urlActual);
    if (volverAGaleria) abrirGaleriaDocumento(doc, true);
    else visor.classList.add('hidden');
  };
  if (sinNavegacion) reemplazarCapaActual(cerrarVisor);
  else pushNavegacion(cerrarVisor);

  $('#visor-cerrar').addEventListener('click', volverAtras);
  $('#visor-ajustes').addEventListener('click', () => abrirMenuPagina(doc, indicePagina));

  try {
    const blob = await obtenerBlobPagina(pagina);
    const url = URL.createObjectURL(blob);
    urlActual = url;
    const cuerpo = $('#visor-cuerpo');
    if (esImagen) {
      cuerpo.innerHTML = `<img src="${url}" alt="${escapeHtml(pagina.nombre || doc.nombre)}">`;
      activarZoomVisor(cuerpo, doc.paginas.length > 1 ? (direccion) => {
        const destino = indicePagina + direccion;
        if (destino < 0 || destino >= doc.paginas.length) return;
        abrirVisor(doc, destino, true, direccion, volverAGaleria);
      } : null);
    } else {
      cuerpo.innerHTML = `
        <div class="visor-pdf">
          <svg width="52" height="52" viewBox="0 0 24 24" fill="none"><path d="M6 3h9l5 5v13H6V3z" stroke="currentColor" stroke-width="1.3"/><path d="M15 3v5h5" stroke="currentColor" stroke-width="1.3"/></svg>
          <p>Documento PDF — ábrelo con el visor de tu móvil.</p>
        </div>`;
    }
    $('#visor-descargar').addEventListener('click', () => {
      const a = document.createElement('a');
      a.href = url; a.download = pagina.nombre || doc.nombre;
      document.body.appendChild(a); a.click(); a.remove();
    });
    if (!esImagen) {
      $('#visor-cuerpo').addEventListener('click', () => window.open(url, '_blank'));
    }
  } catch (e) {
    $('#visor-cuerpo').innerHTML = `<div class="estado-vacio"><p>No se pudo cargar el documento. Comprueba tu conexión.</p></div>`;
  }
}

// Documentos de varias páginas (p.ej. anverso/reverso de un carnet, o un
// libro de familia fotografiado hoja a hoja) no van directos a pantalla
// completa: primero se ven todas en miniatura aquí, y solo al tocar una
// concreta se abre esa en el visor de siempre.
// sinNavegacion: al volver aquí desde una página abierta de esta misma galería (ver abrirVisor,
// volverAGaleria), este paso ya ocupaba su propio lugar en el historial — se sustituye la capa
// actual en vez de abrir una nueva, para no dejar un "atrás" de más que no hace nada visible.
function abrirGaleriaDocumento(doc, sinNavegacion = false) {
  const visor = $('#visor-completo');
  visor.innerHTML = `
    <div class="visor-topbar">
      <button class="btn-icono-top" id="galeria-cerrar" aria-label="Cerrar">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
      </button>
      <span class="titulo">${escapeHtml(doc.nombre)}</span>
      <div class="espaciador"></div>
      <button class="btn-icono-top" id="galeria-anadir" aria-label="Añadir página">
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
      </button>
      <button class="btn-icono-top" id="galeria-ajustes" aria-label="Opciones del documento">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="5" cy="12" r="1.7" fill="currentColor"/><circle cx="12" cy="12" r="1.7" fill="currentColor"/><circle cx="19" cy="12" r="1.7" fill="currentColor"/></svg>
      </button>
    </div>
    <div class="galeria-paginas" id="galeria-cuerpo"></div>`;
  visor.classList.remove('hidden');
  if (sinNavegacion) reemplazarCapaActual(() => visor.classList.add('hidden'));
  else pushNavegacion(() => visor.classList.add('hidden'));

  $('#galeria-cerrar').addEventListener('click', volverAtras);
  $('#galeria-anadir').addEventListener('click', () => agregarPagina(doc));
  $('#galeria-ajustes').addEventListener('click', () => abrirMenuGaleria(doc));

  const cuerpo = $('#galeria-cuerpo');
  doc.paginas.forEach((pagina, indice) => {
    const esImagen = (pagina.mimeType || '').startsWith('image/');
    const btn = document.createElement('button');
    btn.className = 'galeria-pagina';
    btn.dataset.archivoId = String(pagina.archivoId);
    btn.style.setProperty('--color-categoria', (datos.categorias.find((cat) => cat.id === doc.categoria) || CATEGORIA_SIN_ASIGNAR).color);
    btn.innerHTML = `
      <div class="miniatura">${esImagen ? '<div class="skeleton"></div>' : `<svg class="icono-pdf" width="36" height="36" viewBox="0 0 24 24" fill="none"><path d="M6 3h9l5 5v13H6V3z" stroke="currentColor" stroke-width="1.3"/><path d="M15 3v5h5" stroke="currentColor" stroke-width="1.3"/></svg>`}</div>
      <p class="galeria-pagina-nombre">${escapeHtml(pagina.nombre || trad('Página {n}', { n: indice + 1 }))}</p>`;
    // Ojo: NO capturar "indice" aquí — tras reordenar arrastrando, este botón puede pasar a
    // representar otra posición; buscar el índice de verdad de "pagina" (el mismo objeto de
    // siempre, su posición en el array es lo único que cambia) en el momento del toque.
    btn.addEventListener('click', () => {
      if (Date.now() - momentoUltimoArrastrePersona < 300) return;
      abrirVisor(doc, doc.paginas.indexOf(pagina), false, 0, true);
    });
    cuerpo.appendChild(btn);

    if (esImagen) {
      obtenerBlobPagina(pagina).then((blob) => {
        const url = URL.createObjectURL(blob);
        const cont = btn.querySelector('.miniatura');
        const img = document.createElement('img');
        img.src = url; img.alt = pagina.nombre || ''; img.loading = 'lazy';
        img.onload = () => {
          cont.querySelector('.skeleton')?.remove();
          if (img.naturalHeight > img.naturalWidth) {
            cont.style.aspectRatio = `${img.naturalWidth} / ${img.naturalHeight}`;
          }
          URL.revokeObjectURL(url);
        };
        img.onerror = () => URL.revokeObjectURL(url);
        cont.appendChild(img);
      }).catch(() => { btn.querySelector('.skeleton')?.remove(); });
    }
  });

  // Mantener pulsada una página para arrastrarla y cambiar el orden (mismo mecanismo que las
  // fichas de persona/categoría en la portada). Las páginas no tienen "id" propio como esas, así
  // que se identifican por archivoId; y como su nombre por defecto es "Página N" (por posición,
  // no guardado), hay que repintarlo tras cada reordenación.
  habilitarArrastreTiles('.galeria-pagina', doc.paginas, 'archivoId', {
    contenedor: cuerpo,
    zonaScroll: cuerpo,
    campoId: 'archivoId',
    alGuardarOrden: () => {
      cuerpo.querySelectorAll('.galeria-pagina').forEach((btn, indice) => {
        const etiqueta = btn.querySelector('.galeria-pagina-nombre');
        const pag = doc.paginas[indice];
        if (etiqueta && pag) etiqueta.textContent = pag.nombre || trad('Página {n}', { n: indice + 1 });
      });
    },
  });
}

// Añade una página nueva a un documento ya existente (o lo convierte en
// uno de varias páginas si solo tenía una) — mismo recorte que al subir
// un documento normal, pero sin volver a pedir categoría ni caducidad,
// que ya son del documento entero.
function agregarPagina(doc) {
  const persona = datos.personas.find((p) => p.id === doc.personaId);
  if (!persona) return;
  abrirModal('<h3>Añadir página</h3><div id="zona-recorte-pagina"></div>');
  const zona = $('#zona-recorte-pagina');
  const inputArchivo = document.createElement('input');
  inputArchivo.type = 'file';
  inputArchivo.accept = 'image/*,application/pdf';
  inputArchivo.capture = 'environment';
  inputArchivo.className = 'visually-hidden';
  zona.appendChild(inputArchivo);

  function pedirNombreYSubir(archivo) {
    abrirModal(`
      <h3>Nombre de la página</h3>
      <div class="campo">
        <label for="input-nombre-pagina">Ej: Reverso, Página 2...</label>
        <input type="search" id="input-nombre-pagina" name="q" value="${escapeHtml(trad('Página {n}', { n: doc.paginas.length + 1 }))}" autocomplete="off" autocapitalize="sentences" spellcheck="false" enterkeyhint="enter" data-lpignore="true" data-1p-ignore data-form-type="other" readonly>
      </div>
      <div class="modal-acciones">
        <button class="btn-secundario" id="modal-cancelar">Cancelar</button>
        <button class="btn-primario" id="modal-guardar-pagina">Añadir</button>
      </div>
    `);
    const input = $('#input-nombre-pagina');
    evitarBarraAutorrelleno(input);
    input.focus();
    input.select();
    $('#modal-cancelar').addEventListener('click', volverAtras);
    $('#modal-guardar-pagina').addEventListener('click', async () => {
      const nombrePagina = input.value.trim() || trad('Página {n}', { n: doc.paginas.length + 1 });
      const btn = $('#modal-guardar-pagina');
      btn.disabled = true; btn.textContent = 'Subiendo…';
      try {
        const archivoId = await guardarArchivoLocal(archivo);
        doc.paginas.push({ archivoId, mimeType: archivo.type, nombre: nombrePagina, remotos: {} });
        await guardarMetadatos();
        cerrarTodasLasCapas();
        renderizarDocumentos();
        abrirGaleriaDocumento(doc);
        mostrarToast('Página añadida');
      } catch (e) {
        console.error(e);
        btn.disabled = false; btn.textContent = 'Añadir';
        mostrarToast('No se pudo subir la página.', true);
      }
    });
  }

  inputArchivo.addEventListener('change', () => {
    const f = inputArchivo.files[0];
    inputArchivo.value = '';
    if (!f) return;
    if (!f.type.startsWith('image/')) { pedirNombreYSubir(f); return; }
    montarRecorteDocumento(zona, f, {
      onConfirmar: (archivoRecortado) => pedirNombreYSubir(archivoRecortado),
      onCancelar: () => volverAtras(),
    });
  });
  inputArchivo.click();
}

// ---- Menús de opciones (documento, página, persona): mismo diseño que Ajustes ----
// Paneles agrupados con una cajita de color por acción, título y una línea que explica lo
// que hace o lo que hay ahora. Eliminar va aparte, en rojo, como Cerrar sesión.
const ICONOS_MENU = {
  compartir: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="18" cy="5" r="2.6" stroke="currentColor" stroke-width="1.8"/><circle cx="6" cy="12" r="2.6" stroke="currentColor" stroke-width="1.8"/><circle cx="18" cy="19" r="2.6" stroke="currentColor" stroke-width="1.8"/><path d="M8.3 10.7l7.4-4.4M8.3 13.3l7.4 4.4" stroke="currentColor" stroke-width="1.8"/></svg>',
  pdf: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M6 3h9l5 5v13H6V3z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M15 3v5h5" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',
  editar: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',
  carpeta: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M4 5h6.5l2 2.2H20v11.3H4V5z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',
  calendario: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="3.5" y="4.5" width="17" height="16" rx="2" stroke="currentColor" stroke-width="1.8"/><path d="M3.5 9.5h17M8 3v3M16 3v3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  mas: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  papelera: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  seleccionar: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  subir: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 4v12m0-12l-4 4m4-4l4 4M5 17v2a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  vista: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="4" y="4" width="16" height="6" rx="1.4" stroke="currentColor" stroke-width="1.8"/><rect x="4" y="14" width="16" height="6" rx="1.4" stroke="currentColor" stroke-width="1.8"/></svg>',
  exportar: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 15V3m-4 4l4-4 4 4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  check: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M4 12l6 6L20 6" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
};
function cabeceraMenu(titulo) {
  return `<div class="cabecera-hoja"><div class="asa" aria-hidden="true"></div><h3 class="ajustes-titulo titulo-menu">${escapeHtml(titulo)}</h3></div>`;
}
function filaMenu(id, tinte, icono, titulo, detalle, salir = false) {
  return `<button class="fila-accion${salir ? ' salir' : ''}" id="${id}">
    <span class="icono-accion ${tinte}">${icono}</span>
    <span><strong>${titulo}</strong>${detalle ? `<small>${detalle}</small>` : ''}</span>
  </button>`;
}
function textoCaducidadMenu(doc) {
  return doc.fechaCaducidad ? trad('Caduca el {fecha}', { fecha: doc.fechaCaducidad.split('-').reverse().join('/') }) : 'Sin fecha de caducidad';
}

function abrirMenuPagina(doc, indicePagina) {
  const pagina = doc.paginas[indicePagina];
  const variasPaginas = doc.paginas.length > 1;
  abrirModal(`
    <div class="ajustes">
      ${cabeceraMenu(pagina.nombre || doc.nombre)}
      <div class="grupo">
        ${filaMenu('op-compartir-doc', 'azul', ICONOS_MENU.compartir, variasPaginas ? 'Compartir esta página' : 'Compartir', 'Envía la imagen por correo, etc.')}
        ${filaMenu('op-compartir-pdf-doc', 'morado', ICONOS_MENU.pdf, 'Compartir como PDF', variasPaginas ? 'Un PDF solo con esta página' : 'Un PDF con este documento')}
      </div>
      <div class="grupo">
        ${filaMenu('op-actualizar-doc', 'ambar', ICONOS_MENU.subir, 'Actualizar documento', 'Fotos nuevas y nueva fecha de caducidad')}
        ${filaMenu('op-renombrar-doc', 'verde', ICONOS_MENU.editar, variasPaginas ? 'Cambiar nombre de esta página' : 'Cambiar nombre', '')}
        ${filaMenu('op-categoria-doc', 'azul', ICONOS_MENU.carpeta, datos.categorias.some((c) => c.id === doc.categoria) ? 'Cambiar categoría' : 'Añadir categoría', '')}
        ${filaMenu('op-caducidad-doc', 'ambar', ICONOS_MENU.calendario, doc.fechaCaducidad ? 'Cambiar fecha de caducidad' : 'Añadir fecha de caducidad', textoCaducidadMenu(doc))}
        ${filaMenu('op-anadir-pagina-doc', 'verde', ICONOS_MENU.mas, 'Añadir página', 'Otra foto o PDF para este documento')}
        ${variasPaginas ? filaMenu('op-ordenar-paginas-doc', 'morado', ICONOS_MENU.vista, 'Ordenar páginas', 'Ver todas y cambiarlas de orden') : ''}
      </div>
      <div class="grupo">
        ${filaMenu('op-eliminar-doc', 'rojo', ICONOS_MENU.papelera, variasPaginas ? 'Eliminar esta página' : 'Eliminar documento', variasPaginas ? 'Quita solo esta página' : 'Se elimina del móvil y de las nubes', true)}
      </div>
    </div>
  `);
  activarArrastreParaCerrar($('.cabecera-hoja'));
  $('#op-renombrar-doc').addEventListener('click', () => {
    abrirModalRenombrar(variasPaginas ? 'Nombre de la página' : 'Cambiar nombre', pagina.nombre || doc.nombre, (nuevo) => {
      pagina.nombre = nuevo;
      if (!variasPaginas) doc.nombre = nuevo;
      guardarMetadatos().then(() => {
        volverAtras();
        renderizarDocumentos();
        const titulo = $('.visor-topbar .titulo');
        if (titulo) titulo.textContent = pagina.nombre;
        mostrarToast('Nombre actualizado');
      });
    });
  });
  $('#op-actualizar-doc').addEventListener('click', () => abrirModalActualizar(doc));
  $('#op-categoria-doc').addEventListener('click', () => abrirModalCategoriaDoc(doc));
  $('#op-caducidad-doc').addEventListener('click', () => abrirModalCaducidad(doc));
  $('#op-anadir-pagina-doc').addEventListener('click', () => {
    cerrarCapas(1); // cierra este menú antes de abrir el selector de archivo
    agregarPagina(doc);
  });
  $('#op-eliminar-doc').addEventListener('click', () => confirmarBorrado(doc, indicePagina));
  if (variasPaginas) $('#op-ordenar-paginas-doc').addEventListener('click', () => { cerrarTodasLasCapas(); abrirGaleriaDocumento(doc); });
  $('#op-compartir-doc').addEventListener('click', () => {
    volverAtras();
    compartirPaginas([pagina]);
  });
  $('#op-compartir-pdf-doc')?.addEventListener('click', () => {
    volverAtras();
    compartirPaginaComoPdf(pagina);
  });
}

// Menú de opciones del documento entero, desde la galería de páginas
// (no ligado a ninguna página concreta).
function abrirMenuGaleria(doc) {
  abrirModal(`
    <div class="ajustes">
      ${cabeceraMenu(doc.nombre)}
      <div class="grupo">
        ${filaMenu('op-compartir-todas', 'azul', ICONOS_MENU.compartir, 'Compartir todas las páginas', 'Envía las imágenes por correo, etc.')}
        ${filaMenu('op-compartir-pdf-todas', 'morado', ICONOS_MENU.pdf, 'Compartir como PDF', doc.paginas.length > 1 ? 'Un solo PDF con todas las páginas' : 'Un PDF con este documento')}
      </div>
      <div class="grupo">
        ${filaMenu('op-renombrar-doc-galeria', 'verde', ICONOS_MENU.editar, 'Cambiar nombre', '')}
        ${filaMenu('op-categoria-doc-galeria', 'azul', ICONOS_MENU.carpeta, datos.categorias.some((c) => c.id === doc.categoria) ? 'Cambiar categoría' : 'Añadir categoría', '')}
        ${filaMenu('op-caducidad-doc-galeria', 'ambar', ICONOS_MENU.calendario, doc.fechaCaducidad ? 'Cambiar fecha de caducidad' : 'Añadir fecha de caducidad', textoCaducidadMenu(doc))}
      </div>
      <div class="grupo">
        ${filaMenu('op-eliminar-doc-galeria', 'rojo', ICONOS_MENU.papelera, 'Eliminar documento', 'Se elimina del móvil y de las nubes', true)}
      </div>
    </div>
  `);
  activarArrastreParaCerrar($('.cabecera-hoja'));
  $('#op-compartir-todas').addEventListener('click', () => { volverAtras(); compartirPaginas(doc.paginas, doc.nombre); });
  $('#op-compartir-pdf-todas').addEventListener('click', () => { volverAtras(); compartirDocumentoComoPdf(doc); });
  $('#op-renombrar-doc-galeria').addEventListener('click', () => {
    abrirModalRenombrar('Cambiar nombre', doc.nombre, (nuevo) => {
      // la primera página se llama como el documento (es el nombre que se ve en la nube):
      // si aún lo lleva, se renombra con él
      const primera = doc.paginas[0];
      if (primera && primera.nombre === doc.nombre) primera.nombre = nuevo;
      doc.nombre = nuevo;
      guardarMetadatos().then(() => {
        volverAtras();
        renderizarDocumentos();
        const titulo = $('.visor-topbar .titulo');
        if (titulo) titulo.textContent = doc.nombre;
        mostrarToast('Nombre actualizado');
      });
    });
  });
  $('#op-categoria-doc-galeria').addEventListener('click', () => abrirModalCategoriaDoc(doc));
  $('#op-caducidad-doc-galeria').addEventListener('click', () => abrirModalCaducidad(doc));
  $('#op-eliminar-doc-galeria').addEventListener('click', () => confirmarBorrado(doc, null));
}

function abrirModalCategoriaDoc(doc) {
  const hayCategoria = datos.categorias.some((c) => c.id === doc.categoria);
  // La última fila es siempre "Sin categoría": sirve para quitarle la categoría a un documento
  // y es la única opción posible mientras no haya ninguna categoría creada.
  const filas = datos.categorias.concat([{ id: '', nombre: trad(CATEGORIA_SIN_ASIGNAR.nombre), color: CATEGORIA_SIN_ASIGNAR.color }]).map((cat) => `
    <button class="fila-accion fila-cat" data-id="${cat.id}">
      <span class="icono-accion" style="background:${cat.color}">${ICONOS_MENU.carpeta}</span>
      <span><strong>${escapeHtml(cat.nombre)}</strong></span>
      ${cat.id === doc.categoria || (cat.id === '' && !hayCategoria) ? `<span class="marca-actual">${ICONOS_MENU.check}</span>` : ''}
    </button>`).join('');

  abrirModal(`
    <div class="ajustes">
      ${cabeceraMenu('Cambiar categoría')}
      <p class="texto-menu">${escapeHtml(doc.nombre)}</p>
      <div class="grupo">${filas}</div>
    </div>
  `);
  activarArrastreParaCerrar($('.cabecera-hoja'));
  $$('.fila-cat').forEach((btn) => {
    btn.addEventListener('click', async () => {
      doc.categoria = btn.dataset.id;
      await guardarMetadatos();
      volverAtras(); // cierra esta pantalla y el menú de opciones, vuelve al visor
      refrescarPantallaActual(); // refresca lo que toque según se esté viendo una persona o una categoría
      mostrarToast('Categoría actualizada');
    });
  });
}

// ---- Campo de fecha (escribir + calendario) ----
function htmlCampoFecha(id, iso) {
  return `<div class="campo-fecha" id="${id}-caja">
    <div class="fecha-marco"><input type="text" class="fecha-texto" inputmode="numeric" maxlength="10" autocomplete="off" spellcheck="false" enterkeyhint="done" data-lpignore="true" data-1p-ignore data-form-type="other" aria-label="Fecha de caducidad"><div class="fecha-fantasma" aria-hidden="true"></div></div>
    <button type="button" class="fecha-calendario" aria-label="Abrir calendario"><svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="3.5" y="5" width="17" height="15.5" rx="2.5" stroke="currentColor" stroke-width="1.7"/><path d="M3.5 10h17M8 3v4M16 3v4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg></button>
    <input type="date" id="${id}" class="fecha-oculta" tabindex="-1" aria-hidden="true" value="${iso || ''}">
  </div>`;
}
function isoATextoFecha(iso) { return iso ? iso.split('-').reverse().join('/') : ''; }
// Capa gris del formato: lo ya escrito queda invisible (el texto real va debajo) y detrás sigue el resto del formato
function pintarFantasmaFecha(caja) {
  const texto = caja.querySelector('.fecha-texto').value;
  const plantilla = trad('dd/mm/aaaa');
  // Las barras del formato se pintan más marcadas: son fijas, siempre en el mismo sitio
  const resto = escapeHtml(plantilla.slice(texto.length)).split('/').join('<span class="fantasma-barra">/</span>');
  caja.querySelector('.fecha-fantasma').innerHTML = `<span class="fantasma-escrito">${escapeHtml(texto)}</span>${resto}`;
}
// "dd/mm/aaaa" → "AAAA-MM-DD" si es una fecha real (año entre 1900 y 2199); si no, ''
function textoFechaAIso(texto) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(texto);
  if (!m) return '';
  const d = Number(m[1]), mes = Number(m[2]), a = Number(m[3]);
  const f = new Date(a, mes - 1, d);
  if (a < 1900 || a > 2199 || f.getFullYear() !== a || f.getMonth() !== mes - 1 || f.getDate() !== d) return '';
  return `${m[3]}-${m[2]}-${m[1]}`;
}
function activarCampoFecha(id) {
  const caja = $('#' + id + '-caja');
  const texto = caja.querySelector('.fecha-texto');
  const oculto = caja.querySelector('.fecha-oculta');
  texto.value = isoATextoFecha(oculto.value);
  pintarFantasmaFecha(caja);
  texto.addEventListener('input', () => {
    // Solo cifras, con las barras puestas solas: 01052027 → 01/05/2027
    const d = texto.value.replace(/\D/g, '').slice(0, 8);
    texto.value = d.length > 4 ? `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}` : d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
    oculto.value = textoFechaAIso(texto.value);
    pintarFantasmaFecha(caja);
    caja.classList.remove('fecha-error');
    if (typeof actualizarBotonGuardar === 'function' && $('#modal-guardar')) actualizarBotonGuardar();
  });
  texto.addEventListener('blur', () => caja.classList.toggle('fecha-error', !campoFechaValido(id)));
  oculto.addEventListener('change', () => { texto.value = isoATextoFecha(oculto.value); pintarFantasmaFecha(caja); caja.classList.remove('fecha-error'); if ($('#modal-guardar')) actualizarBotonGuardar(); });
  caja.querySelector('.fecha-calendario').addEventListener('click', () => {
    texto.blur();
    try { oculto.showPicker(); } catch (e) { oculto.focus(); oculto.click(); }
  });
}
// Vacío o una fecha real = válido
function campoFechaValido(id) {
  const caja = $('#' + id + '-caja');
  return !caja.querySelector('.fecha-texto').value.trim() || !!caja.querySelector('.fecha-oculta').value;
}
function ponerCampoFecha(id, iso) {
  const caja = $('#' + id + '-caja');
  caja.querySelector('.fecha-oculta').value = iso || '';
  caja.querySelector('.fecha-texto').value = isoATextoFecha(iso);
  pintarFantasmaFecha(caja);
}

function abrirModalCaducidad(doc) {
  abrirModal(`
    <h3>Fecha de caducidad</h3>
    <div class="campo">
      <label>${escapeHtml(doc.nombre)}</label>
      ${htmlCampoFecha('input-caducidad-doc', doc.fechaCaducidad)}
    </div>
    <div class="modal-acciones">
      <button class="btn-secundario" id="modal-cancelar">Cancelar</button>
      <button class="btn-primario" id="modal-guardar-caducidad">Guardar</button>
    </div>
    ${doc.fechaCaducidad ? '<button class="opcion-menu peligro" id="op-quitar-caducidad" style="justify-content:center;margin-top:14px;">Quitar fecha de caducidad</button>' : ''}
  `);
  $('#modal-cancelar').addEventListener('click', volverAtras);
  activarCampoFecha('input-caducidad-doc');
  $('#modal-guardar-caducidad').addEventListener('click', () => {
    if (!campoFechaValido('input-caducidad-doc')) { parpadearFalta($('#input-caducidad-doc-caja')); mostrarToast('La fecha no es válida (dd/mm/aaaa).', true); return; }
    doc.fechaCaducidad = $('#input-caducidad-doc').value || null;
    guardarMetadatos().then(() => {
      volverAtras();
      refrescarPantallaActual();
      mostrarToast('Caducidad actualizada');
    });
  });
  $('#op-quitar-caducidad')?.addEventListener('click', () => {
    doc.fechaCaducidad = null;
    guardarMetadatos().then(() => {
      volverAtras();
      refrescarPantallaActual();
      mostrarToast('Fecha de caducidad eliminada');
    });
  });
}

// Cuando dan un documento nuevo (renovado): fotos nuevas que sustituyen a todas las de antes y la fecha
// de caducidad nueva. Nombre, persona y categoría se quedan igual; las páginas nuevas heredan el nombre de
// las de antes por orden.
function abrirModalActualizar(doc) {
  const nuevas = [];
  const nombrePagina = (i) => doc.paginas[i]?.nombre || (i === 0 ? doc.nombre : trad('Página {n}', { n: i + 1 }));
  abrirModal(`
    <h3>${trad('Actualizar documento')}</h3>
    <div id="seccion-actualizar">
      <p style="color:var(--text-dim);font-size:.88rem;margin:0 0 14px;">${trad('Las fotos nuevas sustituyen a las de «{nombre}».', { nombre: escapeHtml(doc.nombre) })}</p>
      <div id="lista-paginas-actualizar"></div>
      <button class="btn-secundario" id="btn-anadir-actualizar" type="button">+ Añadir foto o PDF</button>
      <div class="campo">
        <label>${trad('Nueva fecha de caducidad')}</label>
        ${htmlCampoFecha('input-caducidad-actualizar', '')}
      </div>
      <div class="modal-acciones">
        <button class="btn-secundario" id="modal-cancelar">Cancelar</button>
        <button class="btn-primario inactivo" id="modal-guardar-actualizar" aria-disabled="true">Guardar</button>
      </div>
    </div>
    <div id="zona-recorte-actualizar" class="hidden"></div>
    <input type="file" id="input-archivo-actualizar" accept="image/*,application/pdf" capture="environment" class="visually-hidden">
  `);
  activarCampoFecha('input-caducidad-actualizar');
  const seccion = $('#seccion-actualizar');
  const zonaRecorte = $('#zona-recorte-actualizar');
  const inputArchivo = $('#input-archivo-actualizar');
  const lista = $('#lista-paginas-actualizar');
  const btnGuardar = $('#modal-guardar-actualizar');
  const comprobar = () => {
    const incompleto = !nuevas.length || !campoFechaValido('input-caducidad-actualizar');
    btnGuardar.classList.toggle('inactivo', incompleto);
    btnGuardar.setAttribute('aria-disabled', incompleto ? 'true' : 'false');
  };
  const pintar = () => {
    lista.innerHTML = nuevas.map((archivo, i) => `
      <div class="pagina-subida-fila">
        <div class="pagina-subida-miniatura">${archivo.type.startsWith('image/') ? `<img data-i="${i}" alt="">` : '<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M6 3h9l5 5v13H6V3z" stroke="currentColor" stroke-width="1.4"/></svg>'}</div>
        <span style="flex:1;min-width:0;font-size:.88rem;">${escapeHtml(nombrePagina(i))}</span>
        <button type="button" class="btn-quitar-pagina-subida" data-indice="${i}" aria-label="Quitar página">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
        </button>
      </div>`).join('');
    lista.querySelectorAll('img[data-i]').forEach((img) => ponerMiniaturaTemporal(img, nuevas[Number(img.dataset.i)]));
    lista.querySelectorAll('.btn-quitar-pagina-subida').forEach((b) => b.addEventListener('click', () => { nuevas.splice(Number(b.dataset.indice), 1); pintar(); comprobar(); }));
  };
  const cerrarRecorte = () => { zonaRecorte.classList.add('hidden'); zonaRecorte.innerHTML = ''; seccion.classList.remove('hidden'); };
  $('#btn-anadir-actualizar').addEventListener('click', () => inputArchivo.click());
  inputArchivo.addEventListener('change', () => {
    const f = inputArchivo.files[0];
    inputArchivo.value = '';
    if (!f) return;
    if (!f.type.startsWith('image/')) { nuevas.push(f); pintar(); comprobar(); return; }
    seccion.classList.add('hidden');
    zonaRecorte.classList.remove('hidden');
    montarRecorteDocumento(zonaRecorte, f, {
      onConfirmar: (recortado) => { nuevas.push(recortado); pintar(); comprobar(); cerrarRecorte(); },
      onCancelar: cerrarRecorte,
    });
  });
  $('#input-caducidad-actualizar').addEventListener('change', comprobar);
  $('#input-caducidad-actualizar').addEventListener('input', comprobar);
  $('#modal-cancelar').addEventListener('click', volverAtras);
  btnGuardar.addEventListener('click', async () => {
    if (!nuevas.length) { parpadearFalta($('#btn-anadir-actualizar')); return; }
    if (!campoFechaValido('input-caducidad-actualizar')) { parpadearFalta($('#input-caducidad-actualizar-caja')); return; }
    btnGuardar.disabled = true; btnGuardar.textContent = 'Subiendo…';
    try {
      const paginas = [];
      for (const [i, archivo] of nuevas.entries()) {
        const archivoId = await guardarArchivoLocal(archivo);
        paginas.push({ archivoId, mimeType: archivo.type, nombre: nombrePagina(i), remotos: {} });
      }
      const persona = datos.personas.find((p) => p.id === doc.personaId);
      const categoriaObj = datos.categorias.find((c) => c.id === doc.categoria) || CATEGORIA_SIN_ASIGNAR;
      for (const vieja of doc.paginas) {
        encolarBorrado(vieja, persona, categoriaObj);
        cacheBorrar(vieja.archivoId);
      }
      doc.paginas = paginas;
      doc.fechaCaducidad = $('#input-caducidad-actualizar').value || null;
      doc.fechaSubida = new Date().toISOString().slice(0, 10);
      await guardarMetadatos();
      // Síncrono (no volverAtras): si no, el visor de abajo, al repintarse, sustituiría la capa del modal
      cerrarCapas(1);
      refrescarPantallaActual();
      if (!$('#visor-completo').classList.contains('hidden')) abrirVisor(doc, 0, true);
      mostrarToast('Documento actualizado');
    } catch (e) {
      console.error(e);
      btnGuardar.disabled = false; btnGuardar.textContent = 'Guardar';
      mostrarToast('No se pudo actualizar el documento.', true);
    }
  });
}

function confirmarBorrado(doc, indicePagina = null) {
  const borrandoUnaPagina = indicePagina !== null && doc.paginas.length > 1;
  const nombreMostrado = borrandoUnaPagina ? (doc.paginas[indicePagina].nombre || trad('página {n}', { n: indicePagina + 1 })) : doc.nombre;
  abrirModal(`
    <h3>${trad('¿Eliminar «{nombre}»?', { nombre: escapeHtml(nombreMostrado) })}</h3>
    <p style="color:var(--text-dim);font-size:.88rem;margin:0 0 6px;">Se borrará también de todas las nubes conectadas. Esta acción no se puede deshacer.</p>
    <label class="check-aviso">
      <input type="checkbox" id="check-borrado-permanente">
      <span>Entiendo que se borrará para siempre</span>
    </label>
    <div class="modal-acciones">
      <button class="btn-secundario" id="modal-cancelar">Cancelar</button>
      <button class="btn-primario btn-peligro" id="modal-confirmar" disabled>Eliminar</button>
    </div>
  `);
  $('#modal-cancelar').addEventListener('click', volverAtras);

  const btnConfirmar = $('#modal-confirmar');
  const checkAviso = $('#check-borrado-permanente');
  let confirmando = false;
  let temporizadorAviso = null;

  checkAviso.addEventListener('change', () => {
    btnConfirmar.disabled = !checkAviso.checked;
    if (!checkAviso.checked) {
      confirmando = false;
      clearTimeout(temporizadorAviso);
      btnConfirmar.textContent = 'Eliminar';
    }
  });

  btnConfirmar.addEventListener('click', async () => {
    if (!checkAviso.checked) return;
    if (!confirmando) {
      confirmando = true;
      btnConfirmar.textContent = '¿Seguro? Toca otra vez';
      temporizadorAviso = setTimeout(() => {
        confirmando = false;
        btnConfirmar.textContent = 'Eliminar';
      }, 3000);
      return;
    }

    clearTimeout(temporizadorAviso);
    mostrarToast('Eliminando…');
    try {
      if (borrandoUnaPagina) {
        const pagina = doc.paginas[indicePagina];
        const personaDoc = datos.personas.find((p) => p.id === doc.personaId);
        const categoriaDoc = datos.categorias.find((c) => c.id === doc.categoria) || CATEGORIA_SIN_ASIGNAR;
        encolarBorrado(pagina, personaDoc, categoriaDoc);
        cacheBorrar(pagina.archivoId);
        doc.paginas.splice(indicePagina, 1);
        await guardarMetadatos();
        cerrarTodasLasCapas();
        renderizarDocumentos();
        abrirGaleriaDocumento(doc);
        mostrarToast('Página eliminada');
      } else {
        const persona = datos.personas.find((p) => p.id === doc.personaId);
        const categoriaObj = datos.categorias.find((c) => c.id === doc.categoria) || CATEGORIA_SIN_ASIGNAR;
        for (const pagina of doc.paginas) {
          encolarBorrado(pagina, persona, categoriaObj);
          cacheBorrar(pagina.archivoId);
        }
        datos.documentos = datos.documentos.filter((d) => d.id !== doc.id);
        await guardarMetadatos();
        cerrarTodasLasCapas();
        refrescarPantallaActual();
        mostrarToast('Documento eliminado');
      }
    } catch (e) {
      mostrarToast('No se pudo eliminar.', true);
    }
  });
}


// Selectores de fila para "Subir documento" (persona y categoría). Cada opción lleva su valor en data-valor.
// Si hay más opciones de las que caben, salen flechas a los lados y un degradado en el borde por donde hay más.
function htmlSelectorFila(id, tipo, opcionesHtml) {
  return `<div class="selector-personas selector-${tipo}" id="${id}">
    <button type="button" class="flecha-personas izq hidden" aria-label="Anteriores">‹</button>
    <div class="fila-personas" role="radiogroup">${opcionesHtml}</div>
    <button type="button" class="flecha-personas der hidden" aria-label="Siguientes">›</button>
  </div>`;
}
function htmlSelectorPersonas(personas) {
  return htmlSelectorFila('input-persona', 'personas', personas.map((p) => `
      <button type="button" class="opcion-persona" role="radio" aria-checked="false" data-valor="${p.id}">
        <span class="avatar-persona" style="${estiloAvatar(p)}">${contenidoAvatar(p)}</span>
        <span class="op-nombre">${escapeHtml(p.nombre)}</span>
      </button>`).join('') + `
      <button type="button" class="opcion-persona opcion-nueva" data-nueva="persona" aria-label="Añadir persona">
        <span class="avatar-persona avatar-nueva-persona"><svg width="45%" height="45%" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></span>
        <span class="op-nombre">Nueva</span>
      </button>`);
}
// Al subir un documento hay que elegir una categoría (o crear una con "Nueva"): "Sin categoría" queda solo para los
// documentos que se quedan huérfanos al borrar su categoría.
function htmlSelectorCategorias(categorias) {
  const pastilla = (valor, color, nombre) => `
      <button type="button" class="opcion-categoria" role="radio" aria-checked="false" data-valor="${valor}" style="--color-categoria:${color}">${escapeHtml(nombre)}</button>`;
  return htmlSelectorFila('input-categoria', 'categorias',
    categorias.map((cat) => pastilla(cat.id, cat.color, cat.nombre)).join('')
      + '<button type="button" class="opcion-categoria opcion-nueva" data-nueva="categoria" aria-label="Añadir categoría">+ Nueva</button>');
}
function valorSelectorFila(selector) {
  const activa = selector && selector.querySelector('[data-valor].activa');
  return activa ? activa.dataset.valor : null;
}
function activarSelectorFila(selector, valorInicial) {
  const fila = selector.querySelector('.fila-personas');
  const flechaIzq = selector.querySelector('.flecha-personas.izq');
  const flechaDer = selector.querySelector('.flecha-personas.der');
  const opciones = [...selector.querySelectorAll('[data-valor]')];
  const elegir = (valor) => opciones.forEach((b) => {
    const activa = b.dataset.valor === valor;
    b.classList.toggle('activa', activa);
    b.setAttribute('aria-checked', activa ? 'true' : 'false');
  });
  const actualizarFlechas = () => {
    const max = fila.scrollWidth - fila.clientWidth;
    flechaIzq.classList.toggle('hidden', fila.scrollLeft < 4);
    flechaDer.classList.toggle('hidden', max < 4 || fila.scrollLeft > max - 4);
    selector.classList.toggle('mas-izq', fila.scrollLeft >= 4);
    selector.classList.toggle('mas-der', max >= 4 && fila.scrollLeft <= max - 4);
  };
  fila.addEventListener('click', (e) => { const b = e.target.closest('[data-valor]'); if (b) { elegir(b.dataset.valor); actualizarBotonGuardar(); } });
  fila.addEventListener('scroll', actualizarFlechas, { passive: true });
  flechaIzq.addEventListener('click', () => fila.scrollBy({ left: -fila.clientWidth * 0.7, behavior: 'smooth' }));
  flechaDer.addEventListener('click', () => fila.scrollBy({ left: fila.clientWidth * 0.7, behavior: 'smooth' }));
  window.addEventListener('resize', actualizarFlechas);
  // valorInicial null = sin nada marcado (hay que elegir)
  elegir(valorInicial == null ? null : (opciones.some((b) => b.dataset.valor === valorInicial) ? valorInicial : null));
  const activa = selector.querySelector('[data-valor].activa');
  if (activa) fila.scrollLeft = Math.max(0, activa.offsetLeft - fila.clientWidth / 2 + activa.offsetWidth / 2);
  setTimeout(actualizarFlechas, 0);
}

// Lo escrito en "Subir documento" (las páginas ya están en paginasSubidaPendientes), para poder ir a crear una persona
// o una categoría y volver sin perderlo.
function capturarEstadoSubida() {
  return {
    esEstadoSubida: true,
    nombre: $('#input-nombre').value,
    caducidad: $('#input-caducidad').value,
    personaId: valorSelectorFila($('#input-persona')),
    categoriaId: valorSelectorFila($('#input-categoria')),
  };
}

function ponerMiniaturaTemporal(img, archivo) {
  const url = URL.createObjectURL(archivo);
  img.onload = img.onerror = () => URL.revokeObjectURL(url);
  img.src = url;
}

function abrirModalSubida(previo) {
  // (Como escuchador de un botón recibe el evento del clic: solo cuenta si es un estado guardado.)
  previo = previo && previo.esEstadoSubida ? previo : null;
  retrocesoModal = null;
  if (!previo) paginasSubidaPendientes = [];
  // Desde una persona, la categoría se elige (la persona ya está fija). Desde la vista de
  // una categoría (todas las personas a la vez), es al revés: la categoría ya está fija y
  // lo que hace falta elegir es de quién es el documento.
  const enCategoria = categoriaGlobalActivaId !== null;
  // Hace falta una persona a quien asignar el documento (desde una categoría o desde la portada): si todavía no hay ninguna,
  // se pasa directamente a crearla y, al guardarla, se vuelve aquí a subir el documento.
  if (datos.personas.length === 0) {
    mostrarToast('Primero añade a la persona de este documento');
    abrirModalNuevaPersona(abrirModalSubida);
    return;
  }
  // Preselección: solo lo que ya viene fijado por la pantalla de la que se viene. Desde una persona, esa persona
  // (y ninguna categoría marcada); desde una categoría, esa categoría (y ninguna persona marcada). Lo otro hay
  // que elegirlo. Al volver de crear una persona/categoría, se recupera lo que había y la nueva queda elegida.
  const personaPreseleccionada = previo ? previo.personaId : (enCategoria ? null : personaActivaId);
  const catPreseleccionada = previo ? previo.categoriaId : (enCategoria ? categoriaGlobalActivaId : null);

  abrirModal(`
    <h3>Subir documento</h3>
    <div id="seccion-normal-subida">
      <div id="lista-paginas-subida"></div>
      <button class="btn-secundario" id="btn-anadir-pagina-subida" type="button">+ Añadir foto o PDF</button>
      <div class="campo">
        <label for="input-nombre">Nombre del documento</label>
        <input type="search" id="input-nombre" name="q" placeholder="Ej: DNI" autocomplete="off" autocapitalize="sentences" spellcheck="false" enterkeyhint="enter" data-lpignore="true" data-1p-ignore data-form-type="other" readonly>
      </div>
      <div class="campo">
        <label>Persona</label>
        ${datos.personas.length ? htmlSelectorPersonas(datos.personas) : `<p style="color:var(--text-dim);font-size:.85rem;margin:0;">Todavía no tienes a nadie añadido.</p>`}
      </div>
      <div class="campo">
        <label>Categoría</label>
        ${htmlSelectorCategorias(datos.categorias)}
        ${datos.categorias.length ? '' : '<p style="color:var(--text-dim);font-size:.8rem;margin:4px 0 0;">Crea una categoría con «Nueva» para poder guardar el documento.</p>'}
      </div>
      <div class="campo">
        <label>Fecha de caducidad (opcional)</label>
        ${htmlCampoFecha('input-caducidad', '')}
      </div>
      <div class="modal-acciones">
        <button class="btn-secundario" id="modal-cancelar">Cancelar</button>
        <button class="btn-primario inactivo" id="modal-guardar" aria-disabled="true">Guardar</button>
      </div>
    </div>
    <div id="zona-recorte-subida" class="hidden"></div>
    <input type="file" id="input-archivo" accept="image/*,application/pdf" capture="environment" class="visually-hidden">
  `);

  activarCampoFecha('input-caducidad');
  if ($('#input-persona')) activarSelectorFila($('#input-persona'), personaPreseleccionada);
  activarSelectorFila($('#input-categoria'), catPreseleccionada);
  const seccionNormal = $('#seccion-normal-subida');
  const zonaRecorte = $('#zona-recorte-subida');
  const inputArchivo = $('#input-archivo');
  const listaPaginas = $('#lista-paginas-subida');

  function renderizarListaPaginasSubida() {
    listaPaginas.innerHTML = paginasSubidaPendientes.map((pagina, i) => {
      const esImagen = pagina.archivo.type.startsWith('image/');
      return `
        <div class="pagina-subida-fila">
          <div class="pagina-subida-miniatura">${esImagen ? `<img data-i="${i}" alt="">` : `<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M6 3h9l5 5v13H6V3z" stroke="currentColor" stroke-width="1.3"/><path d="M15 3v5h5" stroke="currentColor" stroke-width="1.3"/></svg>`}</div>
          <input type="search" class="input-nombre-pagina-subida" name="q" enterkeyhint="enter" value="${escapeHtml(pagina.nombre)}" data-indice="${i}" placeholder="Nombre de esta página" autocomplete="off" autocapitalize="sentences" spellcheck="false" data-lpignore="true" data-1p-ignore data-form-type="other">
          <button type="button" class="btn-quitar-pagina-subida" data-indice="${i}" aria-label="Quitar página">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
          </button>
        </div>`;
    }).join('');
    listaPaginas.querySelectorAll('img[data-i]').forEach((img) => ponerMiniaturaTemporal(img, paginasSubidaPendientes[Number(img.dataset.i)].archivo));
    $$('.input-nombre-pagina-subida').forEach((input) => {
      input.addEventListener('input', () => {
        const pendiente = paginasSubidaPendientes[Number(input.dataset.indice)];
        pendiente.nombre = input.value;
        pendiente.manual = true; // ya no sigue al nombre del documento
      });
    });
    $$('.btn-quitar-pagina-subida').forEach((btn) => {
      btn.addEventListener('click', () => {
        paginasSubidaPendientes.splice(Number(btn.dataset.indice), 1);
        renderizarListaPaginasSubida();
        actualizarBotonGuardar();
      });
    });
  }

  function agregarPaginaPendienteSubida(archivo) {
    // El nombre de archivo que pone la cámara (una foto recién hecha) es casi siempre un número
    // largo sin sentido — no se usa nunca como nombre por defecto, ni del documento ni de la
    // página: se deja vacío para que se escriba a mano, con el campo y su marcador de posición
    // tal cual, en vez de rellenarlo solo con algo que luego hay que borrar.
    const numero = paginasSubidaPendientes.length + 1;
    const nombreDoc = $('#input-nombre').value.trim();
    const nombrePagina = numero === 1 ? nombreDoc : trad('Página {n}', { n: numero });
    paginasSubidaPendientes.push({ archivo, nombre: nombrePagina });
    renderizarListaPaginasSubida();
    actualizarBotonGuardar();
  }

  $('#btn-anadir-pagina-subida').addEventListener('click', () => inputArchivo.click());

  inputArchivo.addEventListener('change', () => {
    const f = inputArchivo.files[0];
    inputArchivo.value = '';
    if (!f) return;
    if (!f.type.startsWith('image/')) {
      agregarPaginaPendienteSubida(f);
      return;
    }
    seccionNormal.classList.add('hidden');
    zonaRecorte.classList.remove('hidden');
    montarRecorteDocumento(zonaRecorte, f, {
      onConfirmar: (archivoRecortado) => {
        agregarPaginaPendienteSubida(archivoRecortado);
        zonaRecorte.classList.add('hidden');
        zonaRecorte.innerHTML = '';
        seccionNormal.classList.remove('hidden');
      },
      onCancelar: () => {
        zonaRecorte.classList.add('hidden');
        zonaRecorte.innerHTML = '';
        seccionNormal.classList.remove('hidden');
      },
    });
  });

  // La primera página se guarda (también en la nube) con el nombre del documento, mientras
  // no se le haya puesto otro a mano: así lo que se escribe aquí es lo que se ve en Drive.
  $('#input-nombre').addEventListener('input', () => {
    const primera = paginasSubidaPendientes[0];
    const nombreDoc = $('#input-nombre').value.trim();
    if (primera && !primera.manual && nombreDoc) {
      primera.nombre = nombreDoc;
      const campo = listaPaginas.querySelector('.input-nombre-pagina-subida[data-indice="0"]');
      if (campo) campo.value = nombreDoc;
    }
    actualizarBotonGuardar();
  });
  evitarBarraAutorrelleno($('#input-nombre'));
  $('#modal-cancelar').addEventListener('click', volverAtras);
  $('#modal-guardar').addEventListener('click', intentarGuardarDocumento);

  if (previo) {
    $('#input-nombre').value = previo.nombre;
    ponerCampoFecha('input-caducidad', previo.caducidad);
    renderizarListaPaginasSubida();
    actualizarBotonGuardar();
  }
  // "Nueva" persona / categoría: se abre su formulario y, al guardar (o cancelar), se vuelve aquí con todo lo escrito
  const conservar = () => capturarEstadoSubida();
  const botonNuevaPersona = $('#input-persona') && $('#input-persona').querySelector('[data-nueva="persona"]');
  if (botonNuevaPersona) botonNuevaPersona.addEventListener('click', () => {
    const estado = conservar();
    abrirModalNuevaPersona((nueva) => abrirModalSubida({ ...estado, personaId: nueva.id }), () => abrirModalSubida(estado));
    retrocesoModal = () => abrirModalSubida(estado);
  });
  $('#input-categoria').querySelector('[data-nueva="categoria"]').addEventListener('click', () => {
    const estado = conservar();
    abrirNuevaCategoria((idNueva) => abrirModalSubida({ ...estado, categoriaId: idNueva }), () => abrirModalSubida(estado));
    retrocesoModal = () => abrirModalSubida(estado);
  });
}

function actualizarBotonGuardar() {
  const btn = $('#modal-guardar');
  if (!btn) return;
  const faltaPersona = !valorSelectorFila($('#input-persona')); // sin ninguna persona creada / elegida
  const faltaCategoria = !valorSelectorFila($('#input-categoria')); // hay que elegir (o crear) una categoría
  const incompleto = faltaPersona || faltaCategoria || !campoFechaValido('input-caducidad') || !(paginasSubidaPendientes.length > 0 && $('#input-nombre').value.trim());
  // No se usa "disabled" para que el botón siga recibiendo el toque y pueda avisar de lo que falta
  btn.classList.toggle('inactivo', incompleto);
  btn.setAttribute('aria-disabled', incompleto ? 'true' : 'false');
}

// Campos de "Subir documento" que aún faltan, en el orden en que salen.
function camposQueFaltanSubida() {
  const faltan = [];
  if (!paginasSubidaPendientes.length) faltan.push($('#btn-anadir-pagina-subida'));
  if (!$('#input-nombre').value.trim()) faltan.push($('#input-nombre'));
  if (!valorSelectorFila($('#input-persona'))) faltan.push($('#input-persona') || $('#seccion-normal-subida'));
  if (!valorSelectorFila($('#input-categoria'))) faltan.push($('#input-categoria'));
  if (!campoFechaValido('input-caducidad')) faltan.push($('#input-caducidad-caja'));
  return faltan;
}
function parpadearFalta(el) {
  el.classList.remove('parpadeo-falta');
  void el.offsetWidth; // reinicia la animación si ya estaba parpadeando
  el.classList.add('parpadeo-falta');
  setTimeout(() => el.classList.remove('parpadeo-falta'), 1500);
}
function intentarGuardarDocumento() {
  const faltan = camposQueFaltanSubida();
  if (!faltan.length) { guardarDocumentoNuevo(); return; }
  faltan.forEach(parpadearFalta);
  faltan[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
}

async function guardarDocumentoNuevo() {
  const btn = $('#modal-guardar');
  btn.disabled = true; btn.textContent = 'Subiendo…';

  const enCategoria = categoriaGlobalActivaId !== null;
  const nombre = $('#input-nombre').value.trim();
  const categoriaId = valorSelectorFila($('#input-categoria')) || '';
  const personaId = valorSelectorFila($('#input-persona'));
  const caducidad = $('#input-caducidad').value || null;
  const persona = datos.personas.find((p) => p.id === personaId);
  const categoriaObj = datos.categorias.find((c) => c.id === categoriaId);

  try {
    const paginas = [];
    for (const [indice, pendiente] of paginasSubidaPendientes.entries()) {
      const nombrePagina = indice === 0 && !pendiente.manual ? nombre : (pendiente.nombre.trim() || nombre);
      const archivoId = await guardarArchivoLocal(pendiente.archivo);
      paginas.push({ archivoId, mimeType: pendiente.archivo.type, nombre: nombrePagina, remotos: {} });
    }
    datos.documentos.push({
      id: 'doc-' + Date.now(),
      personaId,
      nombre, categoria: categoriaId,
      fechaCaducidad: caducidad, fechaSubida: new Date().toISOString().slice(0, 10),
      paginas,
    });
    await guardarMetadatos();
    volverAtras();
    refrescarPantallaActual(); // ya distingue solo entre estar viendo una persona o una categoría
    mostrarToast('Documento guardado');
    setTimeout(avisarSiSinNube, 900);
  } catch (e) {
    console.error(e);
    btn.disabled = false; btn.textContent = 'Guardar';
    mostrarToast('No se pudo subir el documento.', true);
  }
}

function abrirModal(htmlInterior) {
  const raiz = $('#raiz-modal');
  const yaHabiaModalAbierto = !!raiz.querySelector('.modal-fondo');
  raiz.innerHTML = `<div class="modal-fondo" id="modal-fondo"><div class="modal">${htmlInterior}</div></div>`;
  $('#modal-fondo').addEventListener('click', (e) => { if (e.target.id === 'modal-fondo') volverAtras(); });
  // Si ya había un modal abierto (p.ej. un menú que abre otra pantalla
  // encima), su contenido ya se ha machacado y no hay nada que restaurar
  // al volver — así que no se añade otra capa de navegación: con una ya
  // basta para cerrarlo todo de un toque, en vez de dejar una capa
  // fantasma que no cierra nada y hace falta un segundo toque atrás.
  if (!yaHabiaModalAbierto) pushNavegacion(cerrarModal);
}
function cerrarModal() { $('#raiz-modal').innerHTML = ''; }
function cerrarCapas(n) {
  const total = Math.min(n, pilaNavegacion.length);
  for (let i = 0; i < total; i++) {
    const cerrar = pilaNavegacion.pop();
    try { cerrar(); } catch (e) { /* ignorar */ }
  }
  if (total > 0) {
    ignorarProximoPopstate = true;
    history.go(-total);
  }
}
function cerrarTodasLasCapas() { cerrarCapas(pilaNavegacion.length); }

// Tecla Enter del teclado en los campos de texto. Regla: en los formularios con varios campos o pasos (Subir documento,
// Nueva persona, nombre de página al subir, confirmaciones de borrar…) Enter solo cierra el teclado, para poder
// seguir rellenando o elegir lo demás; hay que pulsar el botón de guardar a propósito. Solo guarda directamente
// en los cuadros de un único campo (nombre de la página que se añade a un documento y fecha de caducidad de un
// documento). El de renombrar / nueva categoría lo gestiona por su cuenta.
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' || e.isComposing) return;
  const campo = e.target;
  if (!campo || campo.tagName !== 'INPUT' || campo.id === 'input-renombrar') return;
  const enModal = !!campo.closest('#raiz-modal');
  if (!enModal && campo.id !== 'input-busqueda') return;
  e.preventDefault();
  const guardaConEnter = campo.id === 'input-nombre-pagina' || !!campo.closest('#input-caducidad-doc-caja');
  const guardar = enModal && guardaConEnter
    ? $('#raiz-modal .modal-acciones .btn-primario:not(.btn-peligro):not(:disabled)') : null;
  if (guardar) guardar.click(); else campo.blur();
});

function evitarBarraAutorrelleno(input) {
  const activar = () => { input.readOnly = false; };
  input.addEventListener('focus', activar, { once: true });
  input.addEventListener('touchstart', activar, { once: true });
}

function abrirModalRenombrar(titulo, valorActual, alGuardar, maxLength = 60, alCancelar = null, colorInicial = null) {
  abrirModal(`
    <h3>${escapeHtml(titulo)}</h3>
    <div class="campo">
      <label for="input-renombrar">Nombre</label>
      <input type="search" id="input-renombrar" name="q" maxlength="${maxLength}" value="${escapeHtml(valorActual)}" autocomplete="off" autocapitalize="sentences" spellcheck="false" enterkeyhint="enter" data-lpignore="true" data-1p-ignore data-form-type="other" readonly>
    </div>
    ${colorInicial ? `<div class="campo" id="renombrar-color"><label>Color</label>${htmlRuedaColor(colorInicial)}</div>` : ''}
    <div class="modal-acciones">
      <button class="btn-secundario" id="modal-cancelar">Cancelar</button>
      <button class="btn-primario" id="modal-guardar-renombrar">Guardar</button>
    </div>
  `);
  $('#modal-cancelar').addEventListener('click', alCancelar || volverAtras);
  const input = $('#input-renombrar');
  evitarBarraAutorrelleno(input);
  input.focus();
  input.select();
  const btnGuardar = $('#modal-guardar-renombrar');
  let colorElegido = colorInicial;
  if (colorInicial) montarRuedaColor($('#renombrar-color'), colorInicial, (color) => { colorElegido = color; }, null);
  const intentarGuardar = () => {
    const nuevo = input.value.trim();
    if (!nuevo) { parpadearFalta(input); return; } // falta el nombre: parpadea el campo
    alGuardar(nuevo, colorElegido);
  };
  btnGuardar.addEventListener('click', intentarGuardar);
  // Con la rueda de color (nueva categoría), Enter solo cierra el teclado para poder elegir el color: hay que pulsar Guardar.
  input.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    if (colorInicial) { e.preventDefault(); input.blur(); } else intentarGuardar();
  });
}

// Cerrar la hoja arrastrándola hacia abajo desde CUALQUIER punto de la pantalla
// (la hoja, la cabecera o el fondo oscuro de encima). Como en las hojas de
// cualquier móvil, solo arrastra la hoja si el contenido está arriba del todo:
// si está desplazado, el gesto desplaza el contenido como siempre.
// Al soltar: si se ha bajado bastante (o rápido), se desliza fuera y se cierra;
// si no, vuelve a su sitio.
function activarArrastreParaCerrar(zona) {
  const hoja = zona.closest('.modal');
  const fondo = zona.closest('.modal-fondo');
  if (!hoja || !fondo) return;
  let y0 = 0; let desplazado = 0; let t0 = 0; let desdeFuera = false;
  let estado = 'reposo'; // reposo | espera | arrastrando | desplazando
  const aplicar = (d) => {
    hoja.style.transform = 'translateY(' + d + 'px)';
    fondo.style.background = 'rgba(10,15,20,' + (0.62 * (1 - Math.min(d / 420, 1))).toFixed(3) + ')';
  };
  fondo.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1) { estado = 'desplazando'; return; }
    y0 = e.touches[0].clientY; desplazado = 0; t0 = Date.now();
    desdeFuera = !hoja.contains(e.target);
    estado = 'espera';
  }, { passive: true });
  fondo.addEventListener('touchmove', (e) => {
    if (estado === 'desplazando' || estado === 'reposo') return;
    const d = e.touches[0].clientY - y0;
    if (estado === 'espera') {
      if (Math.abs(d) < 6) return;
      // Solo se arrastra hacia abajo y con el contenido arriba del todo (o desde el fondo oscuro)
      if (d > 0 && (desdeFuera || hoja.scrollTop <= 0)) { estado = 'arrastrando'; hoja.style.transition = 'none'; }
      else { estado = 'desplazando'; return; }
    }
    if (e.cancelable) e.preventDefault();
    desplazado = Math.max(0, d);
    aplicar(desplazado);
  }, { passive: false });
  const soltar = () => {
    const estabaArrastrando = estado === 'arrastrando';
    estado = 'reposo';
    if (!estabaArrastrando) return;
    const veloz = desplazado / Math.max(Date.now() - t0, 1) > 0.6;
    hoja.style.transition = 'transform .24s ease';
    if (desplazado > 110 || (veloz && desplazado > 40)) {
      hoja.style.transform = 'translateY(105%)';
      fondo.style.transition = 'opacity .24s ease';
      fondo.style.opacity = '0';
      setTimeout(() => { volverAtras(); }, 220);
    } else {
      hoja.style.transform = '';
      fondo.style.background = '';
    }
  };
  fondo.addEventListener('touchend', soltar);
  fondo.addEventListener('touchcancel', soltar);
}

const NOMBRES_TEMA = { auto: 'Automático, sigue a tu móvil', claro: 'Claro', oscuro: 'Oscuro' };

// Colores de verdad del estilo actual en un modo concreto (claro u oscuro), aunque la app esté en el otro: se
// calculan en un iframe invisible con la misma hoja de estilos (app.css), sin tocar la página (cambiar el modo aquí un
// instante dispararía transiciones). Se guardan para no repetirlo.
const VARS_MAQUETA = ['--ink', '--ink-2', '--ink-3', '--paper', '--text-light', '--text-dim', '--stamp', '--seal', '--azul', '--amber', '--morado',
  '--borde', '--borde-sutil', '--borde-fuerte', '--topbar-fondo', '--sans', '--serif', '--fuente-marca', '--r-avatar', '--r-boton', '--sobre-acento'];
const cacheVarsMaqueta = {};
function variablesDeModo(modo) {
  const skin = obtenerSkinGuardado();
  const clave = skin + '|' + modo;
  if (cacheVarsMaqueta[clave]) return Promise.resolve(cacheVarsMaqueta[clave]);
  return new Promise((ok) => {
    const marco = document.createElement('iframe');
    marco.setAttribute('aria-hidden', 'true');
    marco.style.cssText = 'position:fixed;left:-9999px;top:0;width:10px;height:10px;border:0;visibility:hidden;';
    const atrSkin = skin === 'clasico' ? '' : ` data-skin="${skin}"`;
    marco.srcdoc = `<!doctype html><html${modo === 'claro' ? ' data-tema="claro"' : ''}${atrSkin}><head><base href="${location.href.split('#')[0]}"><link rel="stylesheet" href="app.css"></head><body><span id="sonda"></span></body></html>`;
    marco.onload = () => {
      const cs = marco.contentWindow.getComputedStyle(marco.contentDocument.getElementById('sonda'));
      const vars = VARS_MAQUETA.map((v) => [v, cs.getPropertyValue(v).trim()]).filter(([, val]) => val);
      cacheVarsMaqueta[clave] = vars;
      marco.remove();
      ok(vars);
    };
    document.body.appendChild(marco);
  });
}
const ICONO_LISTA_MAQUETA = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M5 7h14M5 12h14M5 17h14"/></svg>';
function capaMaquetaApariencia(clase) {
  const muestras = datos.personas.length ? datos.personas.slice(0, 4)
    : [{ id: 'm1', nombre: 'Ana', icono: 'A' }, { id: 'm2', nombre: 'Luis', icono: 'L' }, { id: 'm3', nombre: 'Eva', icono: 'E' }, { id: 'm4', nombre: 'Marta', icono: 'M' }];
  return `<span class="mqa-capa ${clase}">
    <span class="mqa-barra">Documentación</span>
    <span class="mqa-cuerpo">${muestras.map((p) => `<span class="mqa-ficha"><span class="avatar-persona" style="${estiloAvatar(p)}">${contenidoAvatar(p)}</span><b>${escapeHtml(p.nombre)}</b></span>`).join('')}</span>
    <span class="mqa-pie">${[[ICONO_BUSCAR, 'Buscar'], [ICONOS_MENU.subir, 'Subir'], [ICONO_LISTA_MAQUETA, 'Categorías'], [ICONO_AJUSTES, 'Ajustes']].map(([ic, t]) => `<span>${ic}${trad(t)}</span>`).join('')}</span>
  </span>`;
}
function htmlMaquetaApariencia(valor) {
  if (valor === 'auto') return `<span class="mq-ap">${capaMaquetaApariencia('modo-oscuro mitad-1')}${capaMaquetaApariencia('modo-claro mitad-2')}</span>`;
  return `<span class="mq-ap">${capaMaquetaApariencia('modo-' + valor)}</span>`;
}
async function pintarColoresMaquetas(cont) {
  cont.querySelectorAll('.mq-ap').forEach((mq) => mq.style.setProperty('--k', mq.clientWidth / 412));
  for (const modo of ['oscuro', 'claro']) {
    const vars = await variablesDeModo(modo);
    cont.querySelectorAll('.mqa-capa.modo-' + modo).forEach((capa) => vars.forEach(([v, val]) => capa.style.setProperty(v, val)));
  }
}

// Subpantalla de Estilo: cada estilo con una maqueta hecha con sus propios colores, formas y
// letra (en el modo claro u oscuro que tengas ahora). Al tocar uno se aplica al momento.
// El marco mide 560 (más alto que ancho) para que cuente como vertical y no se activen las reglas de móvil apaisado; la app dentro ocupa solo ALTO_MAQUETA_ESTILO y el resto se recorta.
const ALTO_MAQUETA_ESTILO = 470;
let urlMaquetaEstilos = null;
// Documento de la maqueta: el mismo CSS de la app (app.css) y el mismo HTML de la pantalla de inicio (copiado de la
// de verdad, con la primera persona), así cada estilo se ve exactamente como es. El estilo y el modo
// se ponen dentro del marco con el hash de la dirección (#estilo|modo), por eso vale un único documento.
function crearUrlMaquetaEstilos() {
  if (urlMaquetaEstilos) URL.revokeObjectURL(urlMaquetaEstilos);
  const app = $('#vista-app').cloneNode(true);
  const q = (sel) => app.querySelector(sel);
  app.removeAttribute('style');
  app.classList.remove('hidden');
  q('#pantalla-personas').classList.remove('hidden');
  q('#pantalla-persona').classList.add('hidden');
  ['#tutorial-modo', '#banner-instalar', '#btn-volver', '#btn-buscar-top', '#btn-ver-categorias-top', '#btn-ajustes', '#avatar-topbar'].forEach((sel) => q(sel).classList.add('hidden'));
  q('#titulo-topbar').textContent = 'DOCUMENTACIÓN';
  q('#bar-buscar').innerHTML = ICONO_BUSCAR + '<span>' + trad('Buscar') + '</span>';
  q('#bar-vista').innerHTML = ICONO_VER_LISTA + '<span>' + trad('Categorías') + '</span>';
  q('#bar-ajustes').innerHTML = ICONO_AJUSTES + '<span>' + trad('Ajustes') + '</span>';
  app.querySelectorAll('.aviso-nube').forEach((e) => e.classList.remove('aviso-nube'));
  const muestras = datos.personas.length ? datos.personas.slice(0, 1) : [{ id: 'muestra-1', nombre: 'Ana', icono: 'A' }];
  const grid = q('#grid-personas');
  grid.innerHTML = '';
  grid.className = 'grid-personas pocas';
  muestras.forEach((p) => grid.appendChild(crearTilePersonaHome(p, false).cloneNode(true)));
  const filtros = [...document.body.children].filter((e) => e.tagName.toLowerCase() === 'svg').map((e) => e.outerHTML).join('');
  const guion = '<' + 'script>(function(){var h=location.hash.slice(1).split("|"),r=document.documentElement;'
    + 'if(h[0]&&h[0]!=="clasico")r.setAttribute("data-skin",h[0]);if(h[1]==="claro")r.setAttribute("data-tema","claro");'
    + 'if(h[0]&&h[0]!=="clasico"){var l=document.createElement("link");l.rel="stylesheet";l.href="fuentes/"+h[0]+".css";document.head.appendChild(l);}})();<' + '/script>';
  const html = '<!doctype html><html lang="es" style="--alto-app:' + ALTO_MAQUETA_ESTILO + 'px"><head><meta charset="utf-8">'
    + '<meta name="viewport" content="width=device-width,initial-scale=1"><base href="' + location.href.split('#')[0] + '">'
    + '<link href="fuentes/base.css" rel="stylesheet">'
    + '<link rel="stylesheet" href="app.css"></head><body>' + filtros + app.outerHTML + guion + '</body></html>';
  urlMaquetaEstilos = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
  return urlMaquetaEstilos;
}
function htmlMaquetaSkin(id, url, modo) {
  return '<span class="mq-estilo"><iframe src="' + url + '#' + id + '|' + modo + '" tabindex="-1" aria-hidden="true" scrolling="no"></iframe></span>';
}
function abrirEstilos() {
  const actual = obtenerSkinGuardado();
  const urlMaqueta = crearUrlMaquetaEstilos();
  const modoMaqueta = document.documentElement.getAttribute('data-tema') === 'claro' ? 'claro' : 'oscuro';
  const opcion = (id) => `
    <button type="button" class="opcion-tema opcion-estilo${actual === id ? ' activa' : ''}" data-valor="${id}">
      ${htmlMaquetaSkin(id, urlMaqueta, modoMaqueta)}
      <span class="texto-tema"><strong>${trad(SKINS[id].nombre)}</strong><small>${trad(SKINS[id].descripcion)}</small></span>
      <span class="marca-tema" aria-hidden="true"></span>
    </button>`;
  abrirModal(`
    <div class="ajustes">
      <div class="cabecera-hoja">
        <div class="asa" aria-hidden="true"></div>
        <div class="fila-titulo">
          <button type="button" class="btn-atras-ajustes" id="ajustes-volver" aria-label="Volver a Ajustes">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M15 5l-7 7 7 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
          <h3 class="ajustes-titulo">Estilo</h3>
        </div>
      </div>
      <div class="lista-estilos">${Object.keys(SKINS).map(opcion).join('')}</div>
    </div>
  `);
  activarArrastreParaCerrar($('.cabecera-hoja'));
  $('#ajustes-volver').addEventListener('click', () => abrirAjustes(false));
  $$('.mq-estilo').forEach((mq) => mq.style.setProperty('--k', mq.clientWidth / 412));
  $$('.opcion-estilo').forEach((btn) => {
    btn.addEventListener('click', () => {
      guardarSkin(btn.dataset.valor);
      $$('.opcion-estilo').forEach((b) => b.classList.toggle('activa', b === btn));
    });
  });
}

// Subpantalla de Idioma: el idioma solo cambia lo que se ve en la app. Las copias de seguridad y los
// archivos de exportación no dependen de él (cada app puede tener el suyo).
function abrirIdiomas() {
  const filas = Object.keys(IDIOMAS).map((id) => `
    <button class="fila-accion fila-cat" data-idioma="${id}">
      <span class="icono-accion sigla"><span class="bandera-idioma" data-no-t>${bandera(id)}</span></span>
      <span><strong data-no-t>${IDIOMAS[id].nombre}</strong></span>
      ${idiomaActual === id ? `<span class="marca-actual">${ICONOS_MENU.check}</span>` : ''}
    </button>`).join('');
  abrirModal(`
    <div class="ajustes">
      <div class="cabecera-hoja">
        <div class="asa" aria-hidden="true"></div>
        <div class="fila-titulo">
          <button type="button" class="btn-atras-ajustes" id="ajustes-volver" aria-label="Volver a Ajustes">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M15 5l-7 7 7 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
          <h3 class="ajustes-titulo">Idioma</h3>
        </div>
      </div>
      <div class="grupo">${filas}</div>
    </div>
  `);
  activarArrastreParaCerrar($('.cabecera-hoja'));
  $('#ajustes-volver').addEventListener('click', () => abrirAjustes(false));
  $$('[data-idioma]').forEach((btn) => {
    btn.addEventListener('click', () => {
      guardarIdioma(btn.dataset.idioma);
      // lo que ya estaba pintado con frases compuestas (nombres, plurales…) se vuelve a pintar en el idioma nuevo
      try { refrescarPantallaActual(); } catch (e) { /* ignorar */ }
      abrirIdiomas();
    });
  });
}

function abrirTamanoTexto() {
  const actual = obtenerTamanoTexto().pct;
  const filas = TAMANOS_TEXTO.map((t) => `
    <button class="fila-accion fila-cat" data-pct="${t.pct}">
      <span class="icono-accion letra" aria-hidden="true" style="font-size:${(t.pct / 100 * 1.05).toFixed(2)}rem">Aa</span>
      <span><strong>${t.nombre}</strong></span>
      ${actual === t.pct ? `<span class="marca-actual">${ICONOS_MENU.check}</span>` : ''}
    </button>`).join('');
  abrirModal(`
    <div class="ajustes">
      <div class="cabecera-hoja">
        <div class="asa" aria-hidden="true"></div>
        <div class="fila-titulo">
          <button type="button" class="btn-atras-ajustes" id="ajustes-volver" aria-label="Volver a Ajustes">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M15 5l-7 7 7 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
          <h3 class="ajustes-titulo">Tamaño del texto</h3>
        </div>
      </div>
      <div class="grupo">${filas}</div>
    </div>
  `);
  activarArrastreParaCerrar($('.cabecera-hoja'));
  $('#ajustes-volver').addEventListener('click', () => abrirAjustes(false));
  $$('[data-pct]').forEach((btn) => {
    btn.addEventListener('click', () => {
      aplicarTamanoTexto(Number(btn.dataset.pct));
      abrirTamanoTexto();
    });
  });
}

// Subpantalla de Apariencia: se sustituye el contenido de la misma hoja (no se
// apila otra ventana). Al tocar un modo se aplica al momento.
function abrirApariencia() {
  const actual = obtenerTemaGuardado();
  const opcion = (valor, nombre) => `
    <button type="button" class="opcion-apariencia${actual === valor ? ' activa' : ''}" data-valor="${valor}" aria-pressed="${actual === valor}">
      ${htmlMaquetaApariencia(valor)}
      <span>${trad(nombre)}</span>
    </button>`;
  abrirModal(`
    <div class="ajustes">
      <div class="cabecera-hoja">
        <div class="asa" aria-hidden="true"></div>
        <div class="fila-titulo">
          <button type="button" class="btn-atras-ajustes" id="ajustes-volver" aria-label="Volver a Ajustes">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M15 5l-7 7 7 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
          <h3 class="ajustes-titulo">Apariencia</h3>
        </div>
      </div>
      <div class="fila-apariencia">
        ${opcion('auto', 'Automático')}
        ${opcion('claro', 'Claro')}
        ${opcion('oscuro', 'Oscuro')}
      </div>
    </div>
  `);
  activarArrastreParaCerrar($('.cabecera-hoja'));
  $('#ajustes-volver').addEventListener('click', () => abrirAjustes(false));
  pintarColoresMaquetas($('.fila-apariencia'));
  $$('.opcion-apariencia').forEach((btn) => {
    btn.addEventListener('click', () => {
      guardarTema(btn.dataset.valor);
      $$('.opcion-apariencia').forEach((b) => { b.classList.toggle('activa', b === btn); b.setAttribute('aria-pressed', String(b === btn)); });
    });
  });
}

function abrirAjustes(animar = true) {
  const temaActual = obtenerTemaGuardado();
  abrirModal(`
    <div class="ajustes">
      <div class="cabecera-hoja">
        <div class="asa" aria-hidden="true"></div>
        <h3 class="ajustes-titulo">Ajustes</h3>
      </div>

      <div class="bloque-copias">
        <div class="sello-copias" id="sello-copias"></div>
        <div class="grupo" id="lista-proveedores">${htmlFilasProveedores()}</div>
      </div>

      <div class="grupo">
        <button class="fila-accion" id="op-administrar-personas">
          <span class="icono-accion verde"><svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" stroke="currentColor" stroke-width="1.8"/><path d="M4.5 20.5c0-4.6 3.4-7.3 7.5-7.3s7.5 2.7 7.5 7.3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></span>
          <span><strong>Personas</strong><small>Añadir, renombrar, ordenar y eliminar</small></span>
        </button>
        <button class="fila-accion" id="op-categorias">
          <span class="icono-accion azul"><svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M4 5h6.5l2 2.2H20v11.3H4V5z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg></span>
          <span><strong>Categorías</strong><small>Los tipos de documento que usas</small></span>
        </button>
        <button class="fila-accion" id="op-apariencia">
          <span class="icono-accion tema"><svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="5" fill="#C1502E"/></svg></span>
          <span><strong>Apariencia</strong><small>${NOMBRES_TEMA[temaActual] || 'Oscuro'}</small></span>
        </button>
        <button class="fila-accion" id="op-estilo">
          <span class="icono-accion estilo"><svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 3a9 9 0 1 0 0 18c1.2 0 1.9-.9 1.6-1.9-.3-1 .3-2.1 1.4-2.1H17a4 4 0 0 0 4-4c0-5.2-4-10-9-10z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><circle cx="7.5" cy="11" r="1.2" fill="currentColor"/><circle cx="10.5" cy="7.2" r="1.2" fill="currentColor"/><circle cx="15" cy="7.6" r="1.2" fill="currentColor"/></svg></span>
          <span><strong>Estilo</strong><small>${trad(SKINS[obtenerSkinGuardado()].nombre)}</small></span>
        </button>
        <button class="fila-accion" id="op-texto">
          <span class="icono-accion letra" aria-hidden="true">Aa</span>
          <span><strong>Tamaño del texto</strong><small>${trad(obtenerTamanoTexto().nombre)}</small></span>
        </button>
        <button class="fila-accion" id="op-idioma">
          <span class="icono-accion idioma"><svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.8"/><path d="M3 12h18M12 3c2.6 2.7 3.9 5.7 3.9 9s-1.3 6.3-3.9 9c-2.6-2.7-3.9-5.7-3.9-9S9.4 5.7 12 3z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg></span>
          <span><strong>Idioma</strong><small data-no-t>${IDIOMAS[idiomaActual].nombre}</small></span>
        </button>
        <button class="fila-accion" id="op-exportar">
          <span class="icono-accion ambar"><svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 15V3m-4 4l4-4 4 4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
          <span><strong>Exportar copia</strong><small>Guarda todo en un archivo</small></span>
        </button>
        <button class="fila-accion" id="op-importar">
          <span class="icono-accion morado"><svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
          <span><strong>Importar copia</strong><small>Suma un archivo de copia a lo que ya tienes</small></span>
        </button>
      </div>

      <div class="grupo">
        <button class="fila-accion salir" id="op-cerrar-sesion">
          <span class="icono-accion rojo"><svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M9 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
          <span><strong>Cerrar sesión</strong></span>
          <span class="version-fila">${trad('Versión {v}', { v: VERSION_APP })}</span>
        </button>
      </div>
    </div>
  `);
  refrescarSelloCopias();
  activarArrastreParaCerrar($('.cabecera-hoja'));
  if (animar) {
    // La hoja sube desde abajo al abrir Ajustes.
    $('.modal').classList.add('sube');
    $('.modal-fondo').classList.add('entra');
    // Si el sello detecta cosas por sincronizar, se lanza la sincronización ya.
    if (hayProveedores() && totalPendientes() > 0 && !respaldoEnCurso) programarRespaldo(400);
  }
  $('#op-administrar-personas').addEventListener('click', () => {
    // Cierra este menú de Ajustes a mano (sin history.go real) porque
    // justo después se empuja una capa nueva — ver la nota en
    // abrirModalCategoriasGlobal (ya retirada) sobre por qué no conviene
    // encadenar cerrarCapas con un pushNavegacion inmediato.
    cerrarModal();
    pilaNavegacion.pop();
    modoInicio = 'personas';
    guardarModoInicio(modoInicio);
    modoEdicionPersonas = true;
    actualizarBotonAlternarVista();
    renderizarPantallaInicio();
    // Así el botón atrás sale primero del modo administrar y se queda en
    // la vista normal, en vez de salir directamente de la app.
    pushNavegacion(salirModoAdministrarInicio);
  });
  $('#op-categorias').addEventListener('click', () => {
    cerrarModal();
    pilaNavegacion.pop();
    modoInicio = 'categorias';
    guardarModoInicio(modoInicio);
    modoEdicionCategorias = true;
    actualizarBotonAlternarVista();
    renderizarPantallaInicio();
    pushNavegacion(salirModoAdministrarInicio);
  });
  $('#op-apariencia').addEventListener('click', abrirApariencia);
  $('#op-estilo').addEventListener('click', abrirEstilos);
  $('#op-texto').addEventListener('click', abrirTamanoTexto);
  $('#op-idioma').addEventListener('click', abrirIdiomas);
  $('#lista-proveedores').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-accion]');
    if (!btn) return;
    const id = btn.dataset.prov;
    if (btn.dataset.accion === 'ver') {
      const direccion = PROVEEDORES[id].urlCarpeta();
      if (direccion) window.open(direccion, '_blank');
      else mostrarToast('Todavía no hay carpeta: haz antes una copia.', true);
    }
    else if (btn.dataset.accion === 'conectar' || btn.dataset.accion === 'reconectar') PROVEEDORES[id].conectar();
    else if (btn.dataset.accion === 'desconectar') desconectarProveedor(id);
  });
  $('#op-exportar').addEventListener('click', () => abrirModalExportar());
  $('#op-importar').addEventListener('click', abrirModalImportar);
  $('#op-cerrar-sesion').addEventListener('click', () => {
    const pendientes = totalPendientes();
    const sinNube = !hayProveedores() && !datosVacios();
    if (sinNube || pendientes) { abrirCierreSesionTriple(sinNube, pendientes); return; }
    abrirModal(`
      <h3>¿Cerrar sesión?</h3>
      <p style="color:var(--text-dim);font-size:.88rem;line-height:1.5;margin:0 0 12px;">Se desconectan todas las nubes y se borran los documentos y datos guardados en este móvil. En tus nubes se queda la última copia hecha.</p>
      <div class="modal-acciones">
        <button class="btn-secundario" id="modal-cancelar">Cancelar</button>
        <button class="btn-primario" id="modal-salir">Cerrar sesión</button>
      </div>
    `);
    $('#modal-cancelar').addEventListener('click', volverAtras);
    $('#modal-salir').addEventListener('click', cerrarSesionCompleta);
  });
}
$('#btn-ajustes').addEventListener('click', () => abrirAjustes(true));

let contadorIdsImport = 0;
function idUnico(prefijo) {
  contadorIdsImport++;
  return `${prefijo}-${Date.now()}-${contadorIdsImport}`;
}

function nombreArchivoExportacion(nombrePersona = null) {
  const ahora = new Date();
  const dos = (n) => String(n).padStart(2, '0');
  const fecha = `${dos(ahora.getHours())}h${dos(ahora.getMinutes())}m_${dos(ahora.getDate())}-${dos(ahora.getMonth() + 1)}-${ahora.getFullYear()}`;
  const prefijo = nombrePersona ? nombrePersona.replace(/[\\/:*?"<>|]/g, ' ').trim().replace(/\s+/g, '_') : 'copia';
  return `${prefijo}_${fecha}.txt`;
}

// Formato del paquete: [4 bytes = longitud de la cabecera][cabecera en JSON]
// [archivo 1][archivo 2]... — cada documento de la cabecera guarda su
// tamaño en bytes para poder trocear los archivos al leerlos, en el mismo
// orden en que aparecen. Es un formato propio, solo esta app lo entiende.
async function generarArchivoExportacion(personaId = null) {
  const documentosAExportar = personaId ? datos.documentos.filter((d) => d.personaId === personaId) : datos.documentos;
  const personasAExportar = personaId ? datos.personas.filter((p) => p.id === personaId) : datos.personas;
  const categoriasAExportar = personaId
    ? datos.categorias.filter((c) => documentosAExportar.some((d) => d.categoria === c.id))
    : datos.categorias;

  // Se aplanan todas las páginas de todos los documentos a exportar, en
  // paralelo (si se piden uno a uno y hay muchas, puede tardar tanto que
  // el navegador ya no deje compartir después — el permiso de compartir
  // caduca a los pocos segundos del toque).
  const todasLasPaginas = documentosAExportar.flatMap((doc) => doc.paginas);
  const partesArchivos = await Promise.all(todasLasPaginas.map(async (pagina) => {
    const blob = await obtenerBlobPagina(pagina);
    return new Uint8Array(await blob.arrayBuffer());
  }));

  let indiceParte = 0;
  // Los ids van dentro del archivo para que, al importarlo, lo que ya esté no se duplique.
  const documentosCabecera = documentosAExportar.map((doc) => ({
    id: doc.id, personaId: doc.personaId, nombre: doc.nombre, categoria: doc.categoria,
    fechaCaducidad: doc.fechaCaducidad, fechaSubida: doc.fechaSubida, mod: doc.mod,
    paginas: doc.paginas.map((pagina) => ({
      archivoId: pagina.archivoId, nombre: pagina.nombre, mimeType: pagina.mimeType, mod: pagina.mod, tamano: partesArchivos[indiceParte++].length,
    })),
  }));

  const cabecera = { version: 4, personas: personasAExportar, categorias: categoriasAExportar, documentos: documentosCabecera };
  const jsonBytes = new TextEncoder().encode(JSON.stringify(cabecera));
  const totalArchivos = partesArchivos.reduce((s, p) => s + p.length, 0);

  const resultado = new Uint8Array(4 + jsonBytes.length + totalArchivos);
  new DataView(resultado.buffer).setUint32(0, jsonBytes.length, false);
  resultado.set(jsonBytes, 4);
  let pos = 4 + jsonBytes.length;
  for (const bytes of partesArchivos) { resultado.set(bytes, pos); pos += bytes.length; }
  return resultado;
}

function leerPaqueteExportacion(buffer) {
  const vista = new DataView(buffer);
  const longitudCabecera = vista.getUint32(0, false);
  const bytesCabecera = new Uint8Array(buffer, 4, longitudCabecera);
  const cabecera = sanearDatos(JSON.parse(new TextDecoder().decode(bytesCabecera)));

  let pos = 4 + longitudCabecera;
  const documentos = cabecera.documentos || [];
  // Los archivos van en el mismo orden en que aparecen las páginas
  // dentro de cada documento de la cabecera — archivos[i] es un array
  // con los bytes de cada página del documento i.
  const archivos = documentos.map((meta) => (meta.paginas || []).map((pagina) => {
    const bytes = new Uint8Array(buffer, pos, pagina.tamano);
    pos += pagina.tamano;
    return bytes;
  }));

  return {
    personas: cabecera.personas || [],
    categorias: cabecera.categorias || [],
    documentos,
    archivos,
  };
}

function abrirModalExportar(persona = null) {
  const titulo = persona ? trad('Exportar copia de {nombre}', { nombre: escapeHtml(persona.nombre) }) : 'Exportar copia';
  const introQuien = persona
    ? trad('con los documentos de {nombre} (no con el resto de personas que tengas guardadas)', { nombre: `<strong style="color:var(--text-light)">${escapeHtml(persona.nombre)}</strong>` })
    : trad('con todas las personas, categorías y documentos que tienes guardados');
  const patronNombre = persona ? `${escapeHtml(persona.nombre)}_00h00m_día-mes-año.txt` : 'copia_00h00m_día-mes-año.txt';

  abrirModal(`
    <h3>${titulo}</h3>
    <p style="color:var(--text-dim);font-size:.85rem;line-height:1.5;margin:0 0 14px;">${trad('Esto genera un único archivo, que se llamará {archivo}, {alcance}, listo para pasarlo a otro dispositivo.', { archivo: `<strong style="color:var(--text-light)">${patronNombre}</strong>`, alcance: introQuien })}</p>
    <p style="color:var(--text-dim);font-size:.85rem;line-height:1.5;margin:0 0 14px;"><strong style="color:var(--text-light)">Antes de generarlo, la app se sincroniza</strong> con las nubes que tengas conectadas: suma lo que haya en cada una y en este móvil, para que el archivo lo lleve todo.</p>
    <p style="color:var(--text-dim);font-size:.85rem;line-height:1.5;margin:0 0 14px;">El otro dispositivo solo necesita tener esta misma app instalada. Al abrir el archivo allí, todo lo que trae se sumará a lo que ya hubiera guardado, sin duplicar lo que ya esté y sin borrar nada.</p>
    <p style="color:var(--text-dim);font-size:.85rem;line-height:1.5;margin:0 0 18px;">Una vez se genere, lo envías al otro dispositivo por el medio que prefieras. Desde allí, solo hay que ir a Ajustes → <strong style="color:var(--text-light)">"Importar copia"</strong> (o pulsar "Importar archivo" en la pantalla inicial) y seleccionar ese archivo.</p>
    <div class="modal-acciones">
      <button class="btn-secundario" id="modal-cancelar">Cancelar</button>
      <button class="btn-primario" id="btn-generar-exportacion" type="button">Generar archivo</button>
    </div>
  `);
  $('#modal-cancelar').addEventListener('click', volverAtras);

  // navigator.share() exige llamarse justo tras un toque, sin esperas de
  // por medio, o el navegador lo rechaza con "permission denied" — por
  // eso va en pantallas separadas: primero se prepara el archivo (aquí sí
  // puede tardar, trayendo los documentos de Drive, con su propio
  // indicador de carga para que no parezca que la app se ha quedado
  // colgada) y solo cuando ya está listo se ofrece un botón de compartir
  // en una pantalla nueva, que dispara el share() con el toque recién
  // hecho, sin esperas de por medio.
  $('#btn-generar-exportacion').addEventListener('click', async () => {
    const hayAlgoQueExportar = persona
      ? datos.documentos.some((d) => d.personaId === persona.id)
      : datos.personas.length;
    if (!hayAlgoQueExportar) {
      mostrarToast(persona ? trad('{nombre} todavía no tiene documentos guardados.', { nombre: persona.nombre }) : 'No hay nada que exportar todavía.', true);
      return;
    }
    try {
      if (hayProveedores()) {
        $('.modal').innerHTML = `
          <h3>${titulo}</h3>
          <div class="estado-carga"><div class="spinner"></div><span>Sincronizando con tus nubes…</span></div>
        `;
        const sincronizacion = await sincronizarTodo();
        if (sincronizacion.fallos.length && !(await preguntarExportarSinSincronizar(titulo, sincronizacion.fallos))) { volverAtras(); return; }
      }
      $('.modal').innerHTML = `
        <h3>${titulo}</h3>
        <div class="estado-carga"><div class="spinner"></div><span>Generando el archivo, un momento…</span></div>
      `;
      const bytes = await generarArchivoExportacion(persona ? persona.id : null);
      const nombre = nombreArchivoExportacion(persona ? persona.nombre : null);
      // Chrome solo permite compartir archivos de ciertos tipos por
      // navigator.share() (imagen, PDF, audio, vídeo, texto...); un tipo
      // inventado se rechaza siempre. Se declara como texto para que
      // pase ese filtro, aunque por dentro sea nuestro formato propio.
      const archivo = new File([bytes], nombre, { type: 'text/plain' });
      // Compartir es opcional (algunos móviles no lo soportan, o el
      // selector del sistema no ofrece "Guardar" para este tipo de
      // archivo); guardarlo directamente en el dispositivo con un enlace
      // de descarga siempre funciona, así que esa opción va aparte.
      const sePuedeCompartir = !!navigator.share && (!navigator.canShare || navigator.canShare({ files: [archivo] }));
      mostrarPantallaArchivoListo(archivo, sePuedeCompartir);
    } catch (e) {
      console.error(e);
      mostrarToast('No se pudo generar el archivo: ' + (e.message || e.name || e), true);
      volverAtras();
    }
  });
}

// Si alguna nube no se pudo sincronizar (sin conexión, sesión caducada...), se
// avisa antes de exportar: el archivo saldría sin lo que solo esa nube tenga.
function preguntarExportarSinSincronizar(titulo, fallos) {
  return new Promise((resolver) => {
    $('.modal').innerHTML = `
      <h3>${titulo}</h3>
      <p style="color:var(--text-dim);font-size:.88rem;line-height:1.5;margin:0 0 16px;">No se ha podido sincronizar con <strong style="color:var(--text-light)">${escapeHtml(fallos.join(' y '))}</strong>. Si sigues, el archivo llevará lo que hay en este móvil y en las demás nubes, pero puede faltarle algo que solo esté en esa.</p>
      <div class="modal-acciones">
        <button class="btn-secundario" id="exp-cancelar">Cancelar</button>
        <button class="btn-primario" id="exp-seguir">Exportar igualmente</button>
      </div>
    `;
    $('#exp-cancelar').addEventListener('click', () => resolver(false));
    $('#exp-seguir').addEventListener('click', () => resolver(true));
  });
}

function mostrarPantallaArchivoListo(archivo, sePuedeCompartir = true) {
  const textoAyuda = sePuedeCompartir
    ? 'Toca "Guardar" para descargarlo en este móvil, o "Compartir" para enviarlo directamente al otro dispositivo.'
    : 'Toca "Guardar" para descargarlo en este móvil y pasarlo después al otro dispositivo por donde prefieras.';
  $('.modal').innerHTML = `
    <h3>Archivo generado</h3>
    <p style="color:var(--text-dim);font-size:.88rem;line-height:1.5;margin:0 0 18px;">Ya está listo: <strong style="color:var(--text-light)">${escapeHtml(archivo.name)}</strong>. ${textoAyuda}</p>
    <div class="modal-acciones" style="margin-bottom:10px;">
      <button class="btn-secundario" id="btn-guardar-archivo-listo" type="button">Guardar en el dispositivo</button>
    </div>
    <div class="modal-acciones">
      <button class="btn-secundario" id="btn-cancelar-archivo-listo" type="button">Cancelar</button>
      ${sePuedeCompartir ? '<button class="btn-primario" id="btn-compartir-archivo-listo" type="button">Compartir</button>' : ''}
    </div>
  `;
  $('#btn-cancelar-archivo-listo').addEventListener('click', volverAtras);
  $('#btn-guardar-archivo-listo').addEventListener('click', () => {
    const url = URL.createObjectURL(archivo);
    const a = document.createElement('a');
    a.href = url;
    a.download = archivo.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    mostrarToast('Archivo guardado en Descargas.');
    cerrarCapas(2); // cierra este modal y el de Ajustes
  });
  if (sePuedeCompartir) {
    $('#btn-compartir-archivo-listo').addEventListener('click', async () => {
      try {
        await navigator.share({ files: [archivo], title: archivo.name });
        cerrarCapas(2); // cierra este modal y el de Ajustes
      } catch (e) {
        if (e.name !== 'AbortError') { console.error(e); mostrarToast('No se pudo compartir: ' + (e.message || e.name || e), true); }
      }
    });
  }
}

function abrirModalImportar() {
  abrirModal(`
    <h3>Importar copia</h3>
    <p style="color:var(--text-dim);font-size:.88rem;line-height:1.5;margin:0 0 18px;">Elige el archivo <strong style="color:var(--text-light)">copia_...txt</strong> que te hayan pasado. Todo lo que traiga se sumará a lo que ya tienes guardado, sin duplicar lo que ya esté y sin borrar nada.</p>
    <input type="file" id="input-importar" accept=".txt" class="visually-hidden">
    <div class="modal-acciones">
      <button class="btn-secundario" id="modal-cancelar">Cancelar</button>
      <button class="btn-primario" id="btn-elegir-importar" type="button">Elegir archivo</button>
    </div>
  `);
  $('#modal-cancelar').addEventListener('click', volverAtras);
  const inputImportar = $('#input-importar');
  $('#btn-elegir-importar').addEventListener('click', () => inputImportar.click());
  inputImportar.addEventListener('change', () => {
    const f = inputImportar.files[0];
    inputImportar.value = '';
    if (!f) return;
    procesarImportacion(f);
  });
}


// Importar SUMA: lo que ya esté (mismo id) se da por bueno y solo se añade lo
// que falta, como al sincronizar con las nubes. En copias antiguas, que no
// llevan ids de documento, un documento con la misma persona, categoría y
// nombre se da por ya presente.
async function procesarImportacion(file, desdeBienvenida = false) {
  $('.modal').innerHTML = `
    <h3>Importando…</h3>
    <div class="estado-carga"><div class="spinner"></div><span id="texto-progreso-importar">Leyendo archivo…</span></div>
  `;
  const sumado = { personas: 0, documentos: 0, paginas: 0, cambios: 0 };
  try {
    const buffer = await file.arrayBuffer();
    const paquete = leerPaqueteExportacion(buffer);
    if (!paquete.personas.length && !paquete.documentos.length) throw new Error('paquete vacío');

    // De lo que ya está (mismo id) se queda la versión más reciente (mod), como al
    // sincronizar con las nubes; lo que no está se añade.
    paquete.personas.forEach((p) => {
      const mia = datos.personas.find((x) => x.id === p.id);
      if (!mia) { datos.personas.push(Object.assign({}, p)); sumado.personas++; }
      else if ((p.mod || 0) > (mia.mod || 0)) { adoptarCampos(mia, p, []); sumado.cambios++; }
    });
    // Una categoría de fábrica que se hubiera borrado se recupera tal cual venía en la copia.
    paquete.categorias.forEach((c) => {
      const mia = datos.categorias.find((x) => x.id === c.id);
      if (!mia) datos.categorias.push(Object.assign({}, c));
      else if ((c.mod || 0) > (mia.mod || 0)) { adoptarCampos(mia, c, []); sumado.cambios++; }
    });

    for (let i = 0; i < paquete.documentos.length; i++) {
      const meta = paquete.documentos[i];
      const bytesPorPagina = paquete.archivos[i];
      const spanProgreso = $('#texto-progreso-importar');
      if (spanProgreso) spanProgreso.textContent = trad('Revisando documento {i} de {total}…', { i: i + 1, total: paquete.documentos.length });

      if (!datos.personas.some((p) => p.id === meta.personaId)) continue;
      const categoriaId = datos.categorias.some((c) => c.id === meta.categoria) ? meta.categoria : CATEGORIA_SIN_ASIGNAR.id;
      const nombreDoc = (meta.nombre || '').trim().toLowerCase();
      const existente = meta.id
        ? datos.documentos.find((d) => d.id === meta.id)
        : datos.documentos.find((d) => d.personaId === meta.personaId && d.categoria === categoriaId && d.nombre.trim().toLowerCase() === nombreDoc);
      if (existente && !meta.id) continue; // copia antigua: se da por ya presente
      if (existente && (meta.mod || 0) > (existente.mod || 0)) {
        existente.nombre = meta.nombre; existente.categoria = categoriaId;
        existente.fechaCaducidad = meta.fechaCaducidad || null;
        existente.fechaSubida = meta.fechaSubida || existente.fechaSubida;
        existente.mod = meta.mod;
        sumado.cambios++;
      }

      const destino = existente || {
        id: meta.id || idUnico('doc'), personaId: meta.personaId, mod: meta.mod,
        nombre: meta.nombre, categoria: categoriaId,
        fechaCaducidad: meta.fechaCaducidad || null, fechaSubida: meta.fechaSubida || new Date().toISOString().slice(0, 10),
        paginas: [],
      };
      for (let j = 0; j < meta.paginas.length; j++) {
        const metaPagina = meta.paginas[j];
        const yaEsta = metaPagina.archivoId && destino.paginas.find((p) => p.archivoId === metaPagina.archivoId);
        if (yaEsta) {
          if ((metaPagina.mod || 0) > (yaEsta.mod || 0)) { yaEsta.nombre = metaPagina.nombre; yaEsta.mod = metaPagina.mod; sumado.cambios++; }
          continue;
        }
        const blobArchivo = new Blob([bytesPorPagina[j]], { type: metaPagina.mimeType || 'application/octet-stream' });
        const archivoId = await guardarArchivoLocal(blobArchivo, metaPagina.archivoId || null);
        destino.paginas.push({ archivoId, mimeType: metaPagina.mimeType, nombre: metaPagina.nombre, mod: metaPagina.mod, remotos: {}, rutas: {} });
        sumado.paginas++;
      }
      if (!existente) { datos.documentos.push(destino); sumado.documentos++; }
    }

    registrarFirmas(); // lo importado conserva su hora: no cuenta como un cambio hecho ahora
    await guardarMetadatos();
    cerrarCapas(2); // cierra este modal y el de Ajustes
    renderizarPantallaInicio();
    mostrarToast(sumado.personas + sumado.documentos + sumado.paginas + sumado.cambios === 0
      ? 'No había nada nuevo: ya lo tenías todo'
      : trad('Sumado: {a}, {b} y {c}', { a: contar(sumado.personas, 'persona', 'personas'), b: contar(sumado.documentos, 'documento', 'documentos'), c: contar(sumado.paginas, 'página', 'páginas') }) + (sumado.cambios ? trad('; además, {cambios}', { cambios: contar(sumado.cambios, 'cambio más reciente', 'cambios más recientes') }) : ''));
    setTimeout(avisarSiSinNube, 900);
  } catch (e) {
    console.error(e);
    if (desdeBienvenida && datosVacios()) {
      cerrarTodasLasCapas();
      mostrandoDatosLocales = false;
      volverALogin('inicio');
      mostrarToast('No se pudo importar el archivo. ¿Seguro que es una copia válida?', true);
      return;
    }
    try { await guardarMetadatos(); } catch (e2) { /* ignorar */ }
    cerrarCapas(2);
    renderizarPantallaInicio();
    mostrarToast('No se pudo importar el archivo (o se importó solo en parte). ¿Seguro que es una copia válida?', true);
  }
}


aplicarIdioma(idiomaActual);
{ const ocultar = document.getElementById('ocultar-idioma'); if (ocultar) ocultar.remove(); }

function mostrarToast(msg, esError = false) {
  const t = $('#toast');
  t.textContent = msg;
  t.className = 'toast visible' + (esError ? ' error' : '');
  clearTimeout(mostrarToast._t);
  mostrarToast._t = setTimeout(() => t.classList.remove('visible'), 2600);
}
function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
