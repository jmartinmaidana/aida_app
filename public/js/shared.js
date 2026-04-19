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

// --- COMPONENTES WEB REUTILIZABLES ---
class NavbarAida extends HTMLElement {
    connectedCallback() {
        this.innerHTML = `
            <nav class="navbar">
                <a href="/menu" class="navbar-brand" title="Volver al Inicio" style="text-decoration: none; color: white;">
                    <i class="ph ph-graduation-cap"></i> Sistema AIDA
                </a>
                <div class="navbar-links">
                    <a href="/menu"><i class="ph ph-squares-four"></i> Inicio</a>
                    <div class="dropdown" onclick="this.classList.toggle('activo')">
                        <button class="dropbtn"><i class="ph ph-list"></i> Módulos <i class="ph ph-caret-down"></i></button>
                        <div class="dropdown-content">
                            <a href="/app/alumnos"><i class="ph ph-users"></i> Alumnos</a>
                            <a href="/app/planes"><i class="ph ph-books"></i> Planes de Estudio</a>
                            <a href="/app/cursada"><i class="ph ph-pencil-line"></i> Carga de Notas</a>
                            <a href="/app/certificados_lu"><i class="ph ph-certificate"></i> Emisión Individual</a>
                            <a href="/app/certificados_fecha"><i class="ph ph-files"></i> Emisión por Fecha</a>
                            <a href="/app/archivo"><i class="ph ph-upload-simple"></i> Carga Múltiple (CSV)</a>
                        </div>
                    </div>
                    <button onclick="cerrarSesion()" class="btn-logout"><i class="ph ph-sign-out"></i> Salir</button>
                </div>
            </nav>
        `;
    }
}
customElements.define('navbar-aida', NavbarAida);

class FooterAida extends HTMLElement {
    connectedCallback() {
        this.innerHTML = `
            <footer class="footer-site">
                <p>AIDA - Sistema de Gestión Académica &copy; 2026</p>
            </footer>
        `;
    }
}
customElements.define('footer-aida', FooterAida);

// --- INTERCEPTOR DE NAVEGACIÓN DINÁMICO ---
document.addEventListener('click', function(e) {
    const enlace = e.target.closest('a');
    if (enlace) {
        if (enlace.target === '_blank' || e.ctrlKey || e.metaKey || !enlace.href || enlace.href.startsWith('javascript:')) return;
        const urlDestino = new URL(enlace.href, window.location.origin);
        if (urlDestino.origin === window.location.origin && urlDestino.pathname === window.location.pathname && urlDestino.hash) return;
        e.preventDefault();
        navegarConTransicion(enlace.href);
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