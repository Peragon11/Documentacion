// Busca restos: funciones y constantes que nadie usa, clases CSS que no aparecen ni en el HTML ni en el JS,
// variables CSS usadas sin definir o definidas sin usar, y textos de la interfaz sin traducir en idiomas.js.
// Uso: node tests/herramientas/codigo-muerto.js
const fs = require('fs');
const path = require('path');
const RAIZ = path.resolve(__dirname, '..', '..');
const leer = (f) => fs.readFileSync(path.join(RAIZ, f), 'utf8');
const js = leer('app.js'); const css = leer('app.css'); const html = leer('index.html'); const idiomas = leer('idiomas.js'); const sw = leer('sw.js');
const todoJs = js + '\n' + html + '\n' + idiomas + '\n' + sw;

const nombres = new Set();
for (const m of js.matchAll(/^\s*(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/gm)) nombres.add(m[1]);
for (const m of js.matchAll(/^(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=/gm)) nombres.add(m[1]);
const sinUso = [...nombres].filter((n) => (todoJs.match(new RegExp('(?<![\\w$.])' + n.replace(/\$/g, '\\$') + '(?![\\w$])', 'g')) || []).length <= 1);
console.log('Funciones/constantes sin uso:', sinUso.join(', ') || '(ninguna)');

const clases = new Set([...css.replace(/url\([^)]*\)/g, '').matchAll(/\.([a-zA-Z][\w-]*)/g)].map((m) => m[1]));
const clasesSinUso = [...clases].filter((c) => !new RegExp('(?<![\\w-])' + c + '(?![\\w-])').test(js + html));
console.log('Clases CSS sin uso (algunas pueden montarse por partes en el JS):', clasesSinUso.join(', ') || '(ninguna)');

const definidas = new Set([...(css + js + html).matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1]));
for (const m of js.matchAll(/setProperty\('(--[\w-]+)'/g)) definidas.add(m[1]);
const usadas = new Set([...(css + js + html).matchAll(/var\((--[\w-]+)/g)].map((m) => m[1]));
console.log('Variables CSS usadas sin definir:', [...usadas].filter((v) => !definidas.has(v)).join(', ') || '(ninguna)');
console.log('Variables CSS definidas sin usar:', [...definidas].filter((v) => !usadas.has(v)).join(', ') || '(ninguna)');

// Textos de interfaz: lo que se pasa a trad('…') y no está como primera columna de idiomas.js
const claves = new Set([...idiomas.matchAll(/^\s*\[`([^`]*)`/gm)].map((m) => m[1]));
const pedidos = new Set([...js.matchAll(/trad\('([^'\\]*(?:\\.[^'\\]*)*)'/g)].map((m) => m[1].replace(/\\'/g, "'")));
console.log('trad() sin traducción:', [...pedidos].filter((t) => !claves.has(t)).join(' | ') || '(ninguno)');
console.log('console.log olvidados:', (js.match(/console\.log\(/g) || []).length, '| debugger:', (js.match(/\bdebugger\b/g) || []).length);
