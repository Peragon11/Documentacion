// "Subir documento": todo en una sola ventana. Antes de añadir la primera página hace falta el nombre del documento
// (si falta, parpadea); ese nombre va fijo y en gris delante del de cada página y cambia a la vez que el del documento.
module.exports = {
  nombre: 'Subir documento: nombre fijo delante de las páginas',
  async prueba({ base, nav, c }) {
    await nav.abrirApp(base, {
      personas: [{ id: 'p1', nombre: 'Marta', icono: 'M' }], categorias: [{ id: 'c1', nombre: 'Coche', color: '#B5651D' }],
      documentos: [],
    });
    const espera = (ms) => new Promise((r) => setTimeout(r, ms));
    const ejecutar = (js) => nav.ejecutar(js);
    await ejecutar(`abrirPersona('p1'); abrirModalSubida(); 0`); await espera(400);
    c(await ejecutar(`!!document.querySelector('#input-persona') && !!document.querySelector('#input-categoria') && !!document.querySelector('#btn-anadir-pagina-subida')`), 'Todo debe verse ya en la primera ventana');
    await ejecutar(`document.querySelector('#btn-anadir-pagina-subida').click(); 0`); await espera(100);
    c(await ejecutar(`document.querySelector('#input-nombre').classList.contains('parpadeo-falta')`), 'Sin nombre, "Añadir primera página" hace parpadear el nombre del documento');
    await ejecutar(`(() => { const i = document.querySelector('#input-nombre'); i.readOnly = false; i.value = 'DNI Raul'; i.dispatchEvent(new Event('input')); return 0; })()`);
    // Se mide el contorno del botón cada 40 ms durante el parpadeo: tiene que llegar a ponerse rojo (y volver a quitarse).
    const muestras = JSON.parse(await ejecutar(`new Promise((res) => {
      document.querySelector('#input-categoria [data-valor="c1"]').click(); document.querySelector('#input-persona [data-valor="p1"]').click();
      const b = document.querySelector('#btn-anadir-pagina-subida'); const m = [];
      document.querySelector('#modal-guardar').click();
      const t = setInterval(() => m.push(getComputedStyle(b).outlineColor), 40);
      setTimeout(() => { clearInterval(t); res(JSON.stringify(m)); }, 1500);
    })`));
    const alfas = muestras.map((x) => { const m = /rgba\(229, 52, 42, ([\d.]+)\)/.exec(x); return m ? Number(m[1]) : (x === 'rgb(229, 52, 42)' ? 1 : 0); });
    c(alfas.some((a) => a > 0.9), 'Guardar sin ninguna página hace parpadear en rojo el cuadro de añadir página');
    let subidas = 0; alfas.forEach((a, i) => { if (a > 0.9 && (i === 0 || alfas[i - 1] <= 0.9)) subidas++; });
    c(subidas >= 3, 'Parpadea tres veces (se enciende y se apaga), no se queda fijo');
    const subir = (nombre) => ejecutar(`(() => { const inp = document.querySelector('#input-archivo'); const dt = new DataTransfer(); dt.items.add(new File(['%PDF-1.4'], '${nombre}', { type: 'application/pdf' })); inp.files = dt.files; inp.dispatchEvent(new Event('change')); return 0; })()`);
    await subir('a.pdf'); await espera(200);
    await subir('b.pdf'); await espera(200);
    const campos = JSON.parse(await ejecutar(`JSON.stringify([...document.querySelectorAll('.pagina-subida-fila')].map((f) => [f.querySelector('.prefijo-fijo').textContent, f.querySelector('input').value]))`));
    c.igual(campos[0][0], 'DNI Raul', 'El nombre del documento va fijo delante de la primera página');
    c.igual(campos[0][1], '', 'La primera página puede quedar sin nada más');
    c.igual(campos[1][1], '2', 'La segunda lleva su número');
    await ejecutar(`(() => { const i = document.querySelector('#input-nombre'); i.value = 'Carnet'; i.dispatchEvent(new Event('input')); return 0; })()`);
    const prefijos = JSON.parse(await ejecutar(`JSON.stringify([...document.querySelectorAll('.prefijo-fijo')].map((p) => p.textContent))`));
    c.igual(prefijos.join('|'), 'Carnet|Carnet', 'Al cambiar el nombre del documento cambia también el texto gris de las páginas');
    await ejecutar(`(() => { const i = document.querySelectorAll('.input-nombre-pagina-subida')[1]; i.value = 'Reverso'; i.dispatchEvent(new Event('input')); return 0; })()`);
    await ejecutar(`document.querySelector('#input-persona [data-valor="p1"]').click(); document.querySelector('#input-categoria [data-valor="c1"]').click(); 0`);
    await ejecutar(`document.querySelector('#modal-guardar').click(); 0`); await espera(1200);
    const doc = JSON.parse(await ejecutar(`JSON.stringify(datos.documentos[0])`));
    c(doc && doc.nombre === 'Carnet' && doc.paginas.length === 2 && doc.paginas[0].nombre === 'Carnet' && doc.paginas[1].nombre === 'Carnet Reverso', 'Se guarda "Carnet" con las páginas "Carnet" y "Carnet Reverso"');
  },
};
