document.getElementById('formCertificado').addEventListener('submit', async (evento) => {
    evento.preventDefault(); 
    
    const cajaMensaje = document.getElementById('cajaMensaje');
    const btnGenerar = document.querySelector('.btn-generar');
    const lu = document.getElementById('lu').value;

    // 1. Ocultar mensajes previos y mostrar estado de carga
    cajaMensaje.style.display = 'none'; 

    // 2. Guardar estado original y activar animación de carga
    const contenidoOriginal = btnGenerar.innerHTML;
    btnGenerar.innerHTML = '<i class="ph ph-spinner icono-cargando"></i> Generando constancia...';
    btnGenerar.disabled = true;

    try {
        const respuesta = await fetch('/api/v0/certificados', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lu: lu })
        });

        if (respuesta.ok) {
            // Procesar la descarga del archivo
            const blob = await respuesta.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Certificado_${lu.replace('/', '-')}.html`;
            
            document.body.appendChild(a);
            a.click();
            a.remove();
            
            // Mostrar éxito y limpiar input
            mostrarMensaje("Certificado descargado exitosamente.", 'exito');
            document.getElementById('lu').value = '';
        } else {
            const json = await respuesta.json();
            mostrarMensaje(json.mensaje || "Error al generar certificado.", 'error');
        }
    } catch (error) {
        mostrarMensaje("Error de conexión con el servidor.", 'error');
    } finally {
        // 3. Restaurar el botón SIEMPRE, al final de la operación.
        btnGenerar.innerHTML = contenidoOriginal;
        btnGenerar.disabled = false;
    }
});