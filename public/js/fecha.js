async function buscarPorFecha() {
    const fechaInput = document.getElementById('inputFecha').value;
    const btnGenerar = document.querySelector('.btn-generar');
    
    if (!fechaInput) {
        mostrarMensaje('Por favor, ingrese una fecha.', 'error');
        return;
    }

    mostrarMensaje('Generando certificados masivos, por favor espere...', '');
    
    // Efecto de carga
    const contenidoOriginal = btnGenerar.innerHTML;
    btnGenerar.innerHTML = '<i class="ph ph-spinner icono-cargando"></i> Procesando lote...';
    btnGenerar.disabled = true;

    try {
        const respuesta = await fetch('/api/v0/fecha', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fecha: fechaInput }) 
        });

        if (respuesta.ok) {
            const blob = await respuesta.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `certificados_${fechaInput}.zip`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            
            mostrarMensaje('¡Descarga iniciada con éxito!', 'exito');
        } else {
            const datos = await respuesta.json();
            mostrarMensaje(datos.mensaje || 'Error al generar el lote.', 'error');
        }
    } catch (error) {
        mostrarMensaje('Error de conexión con el servidor.', 'error');
    } finally {
        // "finally" se ejecuta SIEMPRE, haya éxito o error. ¡Es perfecto para restaurar el botón!
        btnGenerar.innerHTML = contenidoOriginal;
        btnGenerar.disabled = false;
    }
}