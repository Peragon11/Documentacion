// Ejecuta todas las pruebas (tests/*.prueba.js) con un Edge/Chrome sin ventana contra un servidor local.
// Uso:  node tests/ejecutar_todo.js            → todas
//       node tests/ejecutar_todo.js plegar     → solo las que contengan "plegar" en el nombre del archivo
const fs = require('fs');
const path = require('path');
const { iniciarServidor, abrirNavegador, crearComprobador } = require('./comun');

(async () => {
  const filtro = process.argv[2] || '';
  const archivos = fs.readdirSync(__dirname).filter((f) => f.endsWith('.prueba.js') && f.includes(filtro)).sort();
  const servidor = await iniciarServidor();
  let malas = 0;
  for (const archivo of archivos) {
    const { nombre, prueba } = require(path.join(__dirname, archivo));
    const c = crearComprobador();
    const nav = await abrirNavegador();
    const t0 = Date.now();
    try {
      await prueba({ base: servidor.base, nav, c });
    } catch (e) {
      c.fallos.push('ERROR: ' + (e.stack || e.message).split('\n').slice(0, 3).join(' | '));
    }
    nav.errores.forEach((e) => c.fallos.push('Excepción en la app: ' + String(e).split('\n')[0]));
    nav.cerrar();
    const seg = ((Date.now() - t0) / 1000).toFixed(1);
    if (c.fallos.length) {
      malas++;
      console.log(`✗ ${nombre} (${seg} s)`);
      c.fallos.forEach((f) => console.log('    · ' + f));
    } else console.log(`✓ ${nombre} (${seg} s)`);
  }
  servidor.cerrar();
  console.log(`\n${archivos.length - malas} de ${archivos.length} pruebas bien.`);
  process.exit(malas ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
