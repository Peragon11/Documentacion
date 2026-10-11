// "Subir documento" en dos pasos: primero solo el nombre ("Crear documento"); después aparecen las páginas
// (la primera ya lleva el nombre del documento), persona, categoría y caducidad.
module.exports = {
  nombre: 'Subir documento en dos pasos',
  async prueba({ base, nav, c }) {
    await nav.abrirApp(base, {
      personas: [{ id: 'p1', nombre: 'Marta', icono: 'M' }], categorias: [{ id: 'c1', nombre: 'Coche', color: '#B5651D' }],
      documentos: [],
    });
    const espera = (ms) => new Promise((r) => setTimeout(r, ms));
    await nav.ejecutar(`abrirPersona('p1'); abrirModalSubida(); 0`); await espera(400);
    c(await nav.ejecutar(`document.querySelector('#resto-subida').classList.contains('hidden')`), 'Al abrir solo debe verse el nombre');
    c(await nav.ejecutar(`document.querySelector('#modal-guardar').textContent.trim() === 'Crear documento'`), 'El botón del paso 1 debe ser "Crear documento"');
    c(await nav.ejecutar(`document.querySelector('#modal-guardar').classList.contains('inactivo')`), 'Sin nombre, "Crear documento" está inactivo');
    await nav.ejecutar(`document.querySelector('#modal-guardar').click(); 0`);
    c(await nav.ejecutar(`document.querySelector('#resto-subida').classList.contains('hidden')`), 'Sin nombre no debe pasar al paso 2');
    await nav.ejecutar(`(() => { const i = document.querySelector('#input-nombre'); i.readOnly = false; i.value = 'DNI Raul'; i.dispatchEvent(new Event('input')); return 0; })()`);
    c(await nav.ejecutar(`!document.querySelector('#modal-guardar').classList.contains('inactivo')`), 'Con nombre, "Crear documento" se activa');
    await nav.ejecutar(`document.querySelector('#modal-guardar').click(); 0`); await espera(200);
    c(await nav.ejecutar(`!document.querySelector('#resto-subida').classList.contains('hidden')`), 'Tras crear deben aparecer las páginas y el resto');
    c(await nav.ejecutar(`document.querySelector('#modal-guardar').textContent.trim() === 'Guardar'`), 'El botón del paso 2 debe ser "Guardar"');
    c(await nav.ejecutar(`document.querySelector('#btn-anadir-pagina-subida').textContent.includes('primera')`), 'El botón dice "Añadir primera página"');
    const subir = (nombre) => nav.ejecutar(`(() => { const inp = document.querySelector('#input-archivo'); const dt = new DataTransfer(); dt.items.add(new File(['%PDF-1.4'], '${nombre}', { type: 'application/pdf' })); inp.files = dt.files; inp.dispatchEvent(new Event('change')); return 0; })()`);
    await subir('a.pdf'); await espera(200);
    await subir('b.pdf'); await espera(200);
    const campos = JSON.parse(await nav.ejecutar(`JSON.stringify([...document.querySelectorAll('.pagina-subida-fila')].map((f) => [f.querySelector('.prefijo-fijo').textContent, f.querySelector('input').value]))`));
    c.igual(campos[0][0], 'DNI Raul', 'El nombre del documento va fijo delante de la primera página');
    c.igual(campos[0][1], '', 'La primera página puede quedar sin nada más (solo el nombre del documento)');
    c.igual(campos[1][1], '2', 'La segunda lleva su número para no repetir nombre');
    c(await nav.ejecutar(`document.querySelector('.prefijo-fijo').tagName === 'SPAN'`), 'El prefijo no es un campo editable');
    await nav.ejecutar(`(() => { const i = document.querySelectorAll('.input-nombre-pagina-subida')[1]; i.value = 'Reverso'; i.dispatchEvent(new Event('input')); return 0; })()`);
    c(await nav.ejecutar(`document.querySelector('#btn-anadir-pagina-subida').textContent.includes('otra')`), 'Con una página puesta dice "Añadir otra página"');
    await nav.ejecutar(`document.querySelector('#input-persona [data-valor="p1"]').click(); document.querySelector('#input-categoria [data-valor="c1"]').click(); 0`);
    await nav.ejecutar(`document.querySelector('#modal-guardar').click(); 0`); await espera(1200);
    const doc = JSON.parse(await nav.ejecutar(`JSON.stringify(datos.documentos[0])`));
    c(doc && doc.nombre === 'DNI Raul' && doc.paginas.length === 2 && doc.paginas[0].nombre === 'DNI Raul' && doc.paginas[1].nombre === 'DNI Raul Reverso', 'El documento se guarda con sus dos páginas: "DNI Raul" y "DNI Raul Reverso"');
  },
};
