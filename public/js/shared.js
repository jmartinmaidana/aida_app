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
        navegarConTransicion('/app/login');
    } catch (error) {
        alert("Error al intentar cerrar sesión.");
    }
}

// --- TRANSICIÓN SUAVE DE PÁGINAS ---
function navegarConTransicion(url) {
    document.body.classList.add('saliendo');
    // Esperamos 200ms (igual que la animación CSS) antes de cambiar la URL
    setTimeout(() => {
        window.location.href = url;
    }, 200); 
}

document.addEventListener('DOMContentLoaded', () => {
    // Interceptar todos los enlaces (<a>)
    document.querySelectorAll('a').forEach(enlace => {
        enlace.addEventListener('click', function(e) {
            // Ignorar "abrir en nueva pestaña", clics con Ctrl, o scripts inline
            if (this.target === '_blank' || e.ctrlKey || e.metaKey || !this.href || this.href.startsWith('javascript:')) return;
            
            // Si es un ancla a la misma página (ej. #seccion), ignorar
            const urlDestino = new URL(this.href, window.location.origin);
            if (urlDestino.origin === window.location.origin && urlDestino.pathname === window.location.pathname && urlDestino.hash) return;

            e.preventDefault();
            navegarConTransicion(this.href);
        });
    });

    // Reemplazar los eventos inline 'onclick' del logo de la barra de navegación
    const navbarBrand = document.querySelector('.navbar-brand');
    if (navbarBrand) {
        navbarBrand.removeAttribute('onclick');
        navbarBrand.addEventListener('click', () => navegarConTransicion('/menu'));
    }
});

// Limpiar la clase si el usuario navega "hacia atrás" usando la caché del navegador (BFCache)
window.addEventListener('pageshow', (event) => {
    if (event.persisted) document.body.classList.remove('saliendo');
});

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