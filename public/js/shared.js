/**
 * Muestra un mensaje de feedback en un elemento con id "resultado" o "cajaMensaje".
 * @param {string} texto El mensaje a mostrar.
 * @param {'exito' | 'error' | ''} tipo El tipo de mensaje para aplicar el estilo correcto.
 */
function mostrarMensaje(texto, tipo) {
    // Intenta encontrar el contenedor de mensajes, que tiene distintos IDs en el proyecto.
    const divResultado = document.getElementById('resultado') || document.getElementById('cajaMensaje');
    if (!divResultado) return;

    if (tipo === '') {
        // Estilo para el estado "Cargando..." o neutro
        divResultado.className = 'mensaje';
        divResultado.style.backgroundColor = '#f1f5f9';
        divResultado.style.borderColor = '#e2e8f0';
        divResultado.style.color = '#475569';
    } else {
        // Limpia estilos en línea para que las clases CSS tomen el control
        divResultado.style.backgroundColor = '';
        divResultado.style.borderColor = '';
        divResultado.style.color = '';
        divResultado.className = `mensaje ${tipo}`;
    }

    divResultado.style.display = 'block';
    divResultado.textContent = texto;
}

async function cerrarSesion() {
    try {
        await fetch('/api/v0/auth/logout', { method: 'POST' });
        window.location.href = '/app/login';
    } catch (error) {
        alert("Error al intentar cerrar sesión.");
    }
}