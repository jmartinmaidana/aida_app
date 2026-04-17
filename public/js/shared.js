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

// Cierra el menú desplegable en móviles si se toca fuera de él
document.addEventListener('click', function(event) {
    // Comprobamos si el elemento tocado NO es parte del menú desplegable
    const clicDentroDelMenu = event.target.closest('.dropdown');
    
    if (!clicDentroDelMenu) {
        // Buscamos todos los menús que estén abiertos (con la clase 'activo') y los cerramos
        const menusAbiertos = document.querySelectorAll('.dropdown.activo');
        menusAbiertos.forEach(function(menu) {
            menu.classList.remove('activo');
        });
    }
});