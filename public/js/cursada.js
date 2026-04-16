document.getElementById('formCursada').addEventListener('submit', async (evento) => {
    evento.preventDefault(); 
    
    const lu = document.getElementById('lu').value;
    const idMateria = document.getElementById('idMateria').value;
    const anio = document.getElementById('anio').value;
    const cuatrimestre = document.getElementById('cuatrimestre').value;
    const nota = document.getElementById('nota').value;
    const btnGenerar = document.querySelector('.btn-generar');

    mostrarMensaje('Procesando carga, por favor espere...', '');

    // Efecto de carga
    const contenidoOriginal = btnGenerar.innerHTML;
    btnGenerar.innerHTML = '<i class="ph ph-spinner icono-cargando"></i> Guardando...';
    btnGenerar.disabled = true;

    const paqueteDatos = {
        lu: lu,
        idMateria: idMateria,
        año: anio, 
        cuatrimestre: cuatrimestre,
        nota: parseInt(nota) 
    };
    
    try {
        const respuesta = await fetch('/api/v0/cursada', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(paqueteDatos)
        });

        const json = await respuesta.json();

        if (respuesta.ok) {
            mostrarMensaje(json.mensaje, 'exito');
            document.getElementById('formCursada').reset(); 
        } else {
            mostrarMensaje(json.mensaje || 'Error al guardar la cursada.', 'error');
        }
    } catch (error) {
        mostrarMensaje('Error de conexión con el servidor.', 'error');
    } finally {
        // Restauramos el botón
        btnGenerar.innerHTML = contenidoOriginal;
        btnGenerar.disabled = false;
    }
});