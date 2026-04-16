// Variables globales para el ordenamiento
let historialLocal = [];
let columnaOrdenActual = '';
let ordenAscendente = true;

document.addEventListener("DOMContentLoaded", async () => {
    const pantallaCarga = document.getElementById('pantallaCarga');
    const contenidoHistorial = document.getElementById('contenidoHistorial');

    const params = new URLSearchParams(window.location.search);
    const luCompleta = params.get('lu');

    if (!luCompleta) {
        mostrarError("No se especificó ninguna Libreta Universitaria en la URL.");
        return;
    }

    const partesLu = luCompleta.split('/');
    if (partesLu.length !== 2) {
        mostrarError("El formato de la Libreta Universitaria es incorrecto.");
        return;
    }
    
    try {
        const response = await fetch(`/api/v0/historial/${partesLu[0]}/${partesLu[1]}`);
        const data = await response.json();

        if (!response.ok || data.estado !== "exito") {
            mostrarError(data.mensaje || "Ocurrió un error al consultar los datos del alumno.");
            return;
        }

        // Cargar estadísticas
        document.getElementById('nombreAlumno').textContent = data.alumno;
        document.getElementById('luAlumno').textContent = data.lu;
        document.getElementById('promedioValor').textContent = data.estadisticas.promedioActual;
        document.getElementById('progresoTexto').textContent = data.estadisticas.porcentajeCompletado + '%';
        
        setTimeout(() => {
            document.getElementById('progresoBarra').style.width = data.estadisticas.porcentajeCompletado + '%';
        }, 100);

        document.getElementById('materiasAprobadas').textContent = data.estadisticas.materiasAprobadas;
        document.getElementById('totalMaterias').textContent = data.estadisticas.totalMaterias;

        // Guardar datos de cursadas para poder ordenarlos
        historialLocal = data.historial;
        
        // Mostrar la tabla por primera vez
        renderizarTablaHistorial();

        // Cambiar visibilidad
        pantallaCarga.classList.add('hidden');
        contenidoHistorial.classList.remove('hidden');

    } catch (error) {
        mostrarError("No se pudo conectar con el servidor. Verifique su conexión.");
    }
});

// Función para renderizar el HTML de la tabla
function renderizarTablaHistorial() {
    const tbody = document.getElementById('tablaHistorial');
    tbody.innerHTML = ''; 
    
    if (historialLocal.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 30px; color: #64748b;">El alumno no tiene cursadas registradas.</td></tr>`;
        return;
    }

    historialLocal.forEach(cursada => {
        const tr = document.createElement('tr');
        const estadoClase = cursada.aprobada ? 'badge-aprobada' : 'badge-desaprobada';
        const estadoTexto = cursada.aprobada ? 'Aprobada' : 'Desaprobada';

        tr.innerHTML = `
            <td>${cursada.anio}</td>
            <td>${cursada.cuatrimestre}º</td>
            <td><strong>${cursada.materia}</strong></td>
            <td class="nota-destacada">${cursada.nota}</td>
            <td><span class="badge ${estadoClase}">${estadoTexto}</span></td>
        `;
        tbody.appendChild(tr);
    });
}

// Función de ordenamiento al hacer clic en los encabezados (<thead>)
function ordenarHistorial(columna) {
    if (columnaOrdenActual === columna) {
        ordenAscendente = !ordenAscendente; 
    } else {
        columnaOrdenActual = columna;
        ordenAscendente = true; 
    }

    historialLocal.sort((a, b) => {
        let valorA = a[columna];
        let valorB = b[columna];

        // Convertir a minúsculas si es texto (ej. Materia)
        if (typeof valorA === 'string') valorA = valorA.toLowerCase();
        if (typeof valorB === 'string') valorB = valorB.toLowerCase();

        if (valorA < valorB) return ordenAscendente ? -1 : 1;
        if (valorA > valorB) return ordenAscendente ? 1 : -1;
        return 0; 
    });

    renderizarTablaHistorial();
}

function mostrarError(texto) {
    document.getElementById('pantallaCarga').classList.add('hidden');
    const msj = document.getElementById('mensajeError');
    msj.textContent = texto;
    msj.classList.remove('hidden');
    msj.style.display = 'block';
}