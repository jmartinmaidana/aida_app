let alumnosLocales = []; 
let luEnEdicion = null; 
let columnaOrdenActual = '';
let ordenAscendente = true;
let paginaActual = 1;
const limitePorPagina = 10;
let terminoBusqueda = '';
let temporizadorBusqueda;

function formatoTabla(fechaIso) {
    if (!fechaIso) return ''; 
    const soloFecha = fechaIso.split('T')[0]; 
    const partes = soloFecha.split('-'); 
    return `${partes[2]}-${partes[1]}-${partes[0]}`; 
}

function formatoInput(fechaIso) {
    if (!fechaIso) return '';
    return fechaIso.split('T')[0]; 
}

document.addEventListener('DOMContentLoaded', () => {
    cargarAlumnos();
    cargarOpcionesCarreras();
});

async function cargarOpcionesCarreras() {
    try {
        const respuesta = await fetch('/api/v0/carreras');
        if (respuesta.ok) {
            const carreras = await respuesta.json();
            const select = document.getElementById('inputCarrera');
            
            carreras.forEach(carrera => {
                const opcion = document.createElement('option');
                opcion.value = carrera.id;
                opcion.textContent = carrera.nombre;
                select.appendChild(opcion);
            });
        }
    } catch (error) {
        console.error("Error al cargar carreras:", error);
    }
}

function renderizarTabla() {
    const cuerpoTabla = document.getElementById('cuerpoTabla');
    cuerpoTabla.innerHTML = ''; 

    if (alumnosLocales.length === 0) {
        cuerpoTabla.innerHTML = '<tr><td colspan="7" style="padding: 30px;"><div class="contenedor-mensaje-tabla" style="color: #64748b;">No hay alumnos registrados en el sistema.</div></td></tr>';
        return;
    }

    alumnosLocales.forEach(alumno => {
        let htmlBotonTramite = '';
        if (alumno.egreso && !alumno.titulo_en_tramite) {
            htmlBotonTramite = `
                <button class="btn-mini tramite" onclick="iniciarTramite('${alumno.lu}')" title="Iniciar Trámite de Título">
                    <i class="ph ph-graduation-cap"></i>
                </button>`;
        }

        const tituloMostrar = alumno.titulo ? alumno.titulo : '<span style="color: #94a3b8; font-style: italic;">Sin asignar</span>';
        const tramiteMostrar = alumno.titulo_en_tramite ? formatoTabla(alumno.titulo_en_tramite) : '<span style="color: #cbd5e1;">-</span>';
        const egresoMostrar = alumno.egreso ? formatoTabla(alumno.egreso) : '<span style="color: #cbd5e1;">-</span>';

        const fila = document.createElement('tr');
        fila.innerHTML = `
            <td style="font-weight: 500; color: #0284c7;">${alumno.lu}</td>
            <td style="font-weight: 500;">${alumno.apellido}</td>
            <td>${alumno.nombres}</td>
            <td>${tituloMostrar}</td>
            <td style="text-align: center;">${tramiteMostrar}</td>
            <td style="text-align: center;">${egresoMostrar}</td>
            <td>
                <div class="acciones-tabla">
                    <button class="btn-mini" style="color: #8b5cf6;" 
                            onclick="window.location.href='/app/historial?lu=${encodeURIComponent(alumno.lu)}'" 
                            title="Ver Historial Académico">
                        <i class="ph ph-chart-line-up"></i>
                    </button>
                    
                    ${htmlBotonTramite}
                    <button class="btn-mini editar" onclick="prepararEdicion('${alumno.lu}')" title="Editar Alumno">
                        <i class="ph ph-pencil-simple"></i>
                    </button>
                    <button class="btn-mini borrar" onclick="borrarAlumno('${alumno.lu}')" title="Borrar Alumno">
                        <i class="ph ph-trash"></i>
                    </button>
                </div>
            </td>
        `;
        cuerpoTabla.appendChild(fila);
    });
}

async function iniciarTramite(lu) {
    try {
        const respuesta = await fetch('/api/v0/tramite-titulo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lu: lu })
        });
        const resultado = await respuesta.json();
        if (respuesta.ok) {
            mostrarMensajePrincipal("Trámite iniciado con éxito. La página se recargará.", 'exito');
            location.reload(); 
        } else {
            mostrarMensajePrincipal("Error: " + resultado.mensaje, 'error');
        }
    } catch (error) {
        mostrarMensajePrincipal("Error de conexión al iniciar el trámite.", 'error');
    }
}

function ordenarTabla(columna) {
    if (columnaOrdenActual === columna) {
        ordenAscendente = !ordenAscendente; 
    } else {
        columnaOrdenActual = columna;
        ordenAscendente = true; 
    }
    alumnosLocales.sort((a, b) => {
        let valorA = a[columna] ? a[columna].toString().toLowerCase() : '';
        let valorB = b[columna] ? b[columna].toString().toLowerCase() : '';
        if (valorA < valorB) return ordenAscendente ? -1 : 1;
        if (valorA > valorB) return ordenAscendente ? 1 : -1;
        return 0; 
    });
    renderizarTabla();
}

// --- MAGIA DE SCROLL SUAVE AÑADIDA AQUÍ ---
function mostrarFormularioCreacion() {
    const form = document.getElementById('seccionFormulario');
    form.style.display = 'block';
    
    // Pausa milimétrica para que el navegador dibuje el formulario antes de desplazarse hacia él
    setTimeout(() => {
        form.scrollIntoView({ behavior: 'smooth', block: 'start' });
        document.getElementById('inputLu').focus();
    }, 50);
}

function ocultarFormulario() {
    document.getElementById('seccionFormulario').style.display = 'none';
    luEnEdicion = null;
    document.getElementById('tituloFormulario').textContent = "Alta de Nuevo Alumno";
    document.getElementById('inputLu').disabled = false; 

    document.getElementById('inputLu').value = '';
    document.getElementById('inputNombres').value = '';
    document.getElementById('inputApellido').value = '';
    document.getElementById('inputCarrera').value = ''; 
    
    // Si el usuario cancela, volvemos a subir a la tabla de forma suave
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function prepararEdicion(lu) {
    const alumno = alumnosLocales.find(a => a.lu === lu);
    if (!alumno) return;

    document.getElementById('inputLu').value = alumno.lu;
    document.getElementById('inputNombres').value = alumno.nombres;
    document.getElementById('inputApellido').value = alumno.apellido;
    document.getElementById('inputCarrera').value = alumno.carrera_id || '';

    luEnEdicion = lu;
    document.getElementById('tituloFormulario').textContent = `Editar Alumno: ${lu}`;
    document.getElementById('inputLu').disabled = true; 
    
    mostrarFormularioCreacion();
}

async function guardarNuevoAlumno() {
    const selectCarrera = document.getElementById('inputCarrera');
    const idCarrera = selectCarrera.value ? parseInt(selectCarrera.value) : null;
    
    const datosAlumno = {
        lu: luEnEdicion ? luEnEdicion : document.getElementById('inputLu').value,
        nombres: document.getElementById('inputNombres').value,
        apellido: document.getElementById('inputApellido').value,
        carrera_id: idCarrera
    };

    // La barrera de seguridad del frontend
    if (!datosAlumno.lu || !datosAlumno.apellido || !datosAlumno.nombres || !datosAlumno.carrera_id) {
        mostrarMensaje("Por favor, complete LU, Nombres, Apellido y seleccione una Carrera.", 'error');
        return;
    }

    try {
        let urlFinal = luEnEdicion ? `/api/alumnos/${luEnEdicion.split('/')[0]}/${luEnEdicion.split('/')[1]}` : '/api/alumno';
        const metodo = luEnEdicion ? 'PUT' : 'POST';

        const respuesta = await fetch(urlFinal, {
            method: metodo,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datosAlumno)
        });

        const json = await respuesta.json();

        // ... dentro de guardarNuevoAlumno ...
        if (respuesta.ok) {
            mostrarMensaje(json.mensaje, 'exito');
            ocultarFormulario();
            cargarAlumnos(); 
        } else {
            // Si hay detalles (errores de Zod o superRefine), los concatenamos
            if (json.detalles && Array.isArray(json.detalles)) {
                const mensajesError = json.detalles.map(error => `- ${error.message}`).join('\n');
                mostrarMensaje(`${json.mensaje}: ${mensajesError}`, 'error');
            } else {
                // Si es un error común (como 404 o 500)
                mostrarMensaje('Error: ' + json.mensaje, 'error');
            }
        }
    } catch (error) {
        mostrarMensaje('Error de conexión al intentar guardar.', 'error');
    }
}

async function borrarAlumno(lu) {
    const seguro = confirm(`¿Está absolutamente seguro que desea eliminar al alumno con LU: ${lu}? Esta acción no se puede deshacer.`);
    if (!seguro) return; 

    try {
        const partesLu = lu.split('/');
        const urlDelete = `/api/alumnos/${partesLu[0]}/${partesLu[1]}`;

        const respuesta = await fetch(urlDelete, {
            method: 'DELETE'
        });
        const json = await respuesta.json();

        if (json.estado === 'exito') {
            mostrarMensajePrincipal(json.mensaje, 'exito');
            cargarAlumnos(); 
        } else {
            mostrarMensajePrincipal('Error al borrar: ' + json.mensaje, 'error');
        }
    } catch (error) {
        mostrarMensajePrincipal('Error de conexión al intentar borrar.', 'error');
    }
}

function mostrarMensajePrincipal(texto, tipo) {
    const divResultado = document.getElementById('cajaMensajePrincipal');
    if (!divResultado) return;

    if (tipo === '') {
        divResultado.className = 'mensaje';
        divResultado.style.backgroundColor = '#f1f5f9';
        divResultado.style.borderColor = '#e2e8f0';
        divResultado.style.color = '#475569';
    } else {
        divResultado.style.backgroundColor = '';
        divResultado.style.borderColor = '';
        divResultado.style.color = '';
        divResultado.className = `mensaje ${tipo}`;
    }
    divResultado.style.display = 'block';
    divResultado.textContent = texto;
}

async function cargarAlumnos() {
    const tbody = document.getElementById('cuerpoTabla');
    tbody.innerHTML = '<tr><td colspan="7" style="padding: 30px;"><div class="contenedor-mensaje-tabla" style="color: #64748b;"><i class="ph ph-spinner icono-cargando"></i> Cargando padrón...</div></td></tr>';
    
    try {
        // Armamos la URL incluyendo los filtros y la paginación
        const url = `/api/alumnos?pagina=${paginaActual}&limite=${limitePorPagina}&busqueda=${encodeURIComponent(terminoBusqueda)}`;
        
        const respuesta = await fetch(url);
        if (!respuesta.ok) throw new Error('Error de conexión al obtener alumnos');
        
        const json = await respuesta.json();
        
        if (json.estado === "exito") {
            alumnosLocales = json.datos;
            const pag = json.paginacion;

            // Actualizar la interfaz de la barra inferior
            document.getElementById('indicadorPagina').textContent = `Página ${pag.paginaActual} de ${pag.totalPaginas} (${pag.total} registros)`;
            document.getElementById('btnPaginaAnterior').disabled = pag.paginaActual <= 1;
            document.getElementById('btnPaginaSiguiente').disabled = pag.paginaActual >= pag.totalPaginas;

            // Renderizar la tabla (usando la función que ya tienes)
            renderizarTabla();
        } else {
            throw new Error(json.mensaje);
        }
    } catch (error) {
        tbody.innerHTML = `<tr><td colspan="7" style="padding: 30px;"><div class="contenedor-mensaje-tabla" style="color: #ef4444;">${error.message}</div></td></tr>`;
    }
}

// Nuevas funciones de control (Puedes agregarlas al final de alumnos.js)
function cambiarPagina(delta) {
    paginaActual += delta;
    cargarAlumnos();
}

function debounceBusqueda() {
    clearTimeout(temporizadorBusqueda);
    temporizadorBusqueda = setTimeout(() => {
        terminoBusqueda = document.getElementById('inputBusqueda').value;
        paginaActual = 1; // Si buscamos algo nuevo, siempre volvemos a la página 1
        cargarAlumnos();
    }, 400); // Espera 400ms después de que el usuario deja de escribir
}
