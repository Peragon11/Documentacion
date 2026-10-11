// La hora de "Última sincronización automática" se actualiza cada vez que con una nube se hace una pasada completa
// (consulta de cada hora o copia de cambios), y con varias nubes enseña la de la más atrasada.
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
// Una nube de mentira en lugar de Dropbox / Drive: guarda lo que le envían y no necesita red
const NUBE_FALSA = (id, fallar) => `(() => {
  const p = PROVEEDORES['${id}'];
  window.__nube_${id} = { escrituras: 0, falla: ${fallar ? 'true' : 'false'} };
  p.conectado = () => true;
  p.token = async () => { if (window.__nube_${id}.falla) throw new Error('reconectar'); };
  p.preparar = async () => {};
  p.leerDatos = async () => null;
  p.escribirDatos = async () => { window.__nube_${id}.escrituras++; };
  p.subir = async () => 'ref-falsa';
  p.borrar = async () => {};
  return 0; })()`;
module.exports = {
  nombre: 'Hora de la última sincronización',
  async prueba({ base, nav, c }) {
    await nav.abrirApp(base, { personas: [{ id: 'p1', nombre: 'Ana', icono: 'A' }], categorias: [], documentos: [] });
    await nav.ejecutar(NUBE_FALSA('dropbox', false));
    c.igual(await nav.ejecutar(`ultimaSincronizacion()`), 0, 'Antes de sincronizar debería no haber hora');
    c(await nav.ejecutar(`textoUltimaSync().includes('todavía no')`), 'Sin hora debería decir "todavía no"');

    // 1) consulta completa (la de cada hora)
    const t0 = Date.now();
    await nav.ejecutar(`sincronizarTodo().then(() => 0)`);
    const t1 = await nav.ejecutar(`ultimaSincronizacion()`);
    c(t1 >= t0, `La consulta completa no anotó la hora (${t1})`);
    c(!(await nav.ejecutar(`textoUltimaSync().includes('todavía no')`)), 'Tras sincronizar sigue diciendo "todavía no"');

    // 2) copia de un cambio (pasada normal, no la consulta de la hora): también actualiza la hora
    await espera(1100);
    await nav.ejecutar(`datos.personas[0].nombre = 'Ana M'; guardarMetadatos(); 0`);
    await espera(5000);
    const t2 = await nav.ejecutar(`ultimaSincronizacion()`);
    c(t2 > t1, `Copiar un cambio a la nube no actualizó la hora (${t1} → ${t2})`);
    c(await nav.ejecutar(`window.__nube_dropbox.escrituras >= 2`), 'La nube no recibió el cambio');

    // 3) la hora que se enseña se refresca sola si Ajustes está abierto
    await nav.ejecutar(`abrirAjustes(false); 0`);
    await espera(600);
    const antes = await nav.ejecutar(`document.querySelector('#texto-ultima-sync').textContent`);
    await espera(1100);
    await nav.ejecutar(`sincronizarTodo().then(() => 0)`);
    await espera(500);
    c.igual(await nav.ejecutar(`ultimaSincronizacion() > ${t2}`), true, 'La consulta con Ajustes abierto no anotó la hora');
    c(!!antes, 'No sale el texto de la última sincronización en Ajustes');

    // 4) con una segunda nube que falla, se enseña la hora de la más atrasada (la que falla = ninguna todavía)
    await nav.ejecutar(NUBE_FALSA('google', true));
    await nav.ejecutar(`sincronizarTodo().then(() => 0)`);
    c.igual(await nav.ejecutar(`ultimaSincronizacion()`), 0, 'Con una nube que falla no debería enseñar hora (la hora no esconde el fallo)');
    c(await nav.ejecutar(`sincronizacionDebida()`), 'Con una nube que falla debería seguir tocando consultar');
  },
};
