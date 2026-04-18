// --- LÓGICA DE DRAG & DROP Y SELECCIÓN DE ARCHIVO ---
const zonaCarga = document.getElementById('zonaCarga');
const inputCsv = document.getElementById('inputCsv');
const nombreArchivo = document.getElementById('nombreArchivo');
let ultimosAlumnosIgnorados = [];

// Cuando el usuario hace clic en el botón y selecciona un archivo tradicionalmente
inputCsv.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        nombreArchivo.textContent = e.target.files[0].name;
        nombreArchivo.style.display = 'block';
    }
});

// Eventos para arrastrar y soltar
zonaCarga.addEventListener('dragover', (e) => {
    e.preventDefault(); // Necesario para permitir el "drop"
    zonaCarga.classList.add('drag-over'); // Pinta la zona de azul claro
});

zonaCarga.addEventListener('dragleave', () => {
    zonaCarga.classList.remove('drag-over'); // Vuelve al color normal
});

zonaCarga.addEventListener('drop', (e) => {
    e.preventDefault();
    zonaCarga.classList.remove('drag-over');
    
    if (e.dataTransfer.files.length > 0) {
        const archivoDroppeado = e.dataTransfer.files[0];
        
        if (archivoDroppeado.name.endsWith('.csv')) {
            inputCsv.files = e.dataTransfer.files; // Enganchamos el archivo al input oculto
            nombreArchivo.textContent = archivoDroppeado.name;
            nombreArchivo.style.display = 'block';
        } else {
            mostrarMensaje('Por favor, arrastre únicamente un archivo con extensión .csv', 'error');
        }
    }
});

// --- LÓGICA DE ENVÍO AL SERVIDOR ---
function leerArchivoComoTexto(archivo) {
    return new Promise((resolve, reject) => {
        const lector = new FileReader();
        lector.onload = (evento) => resolve(evento.target.result);
        lector.onerror = () => reject(new Error("Error al leer el archivo físico."));
        lector.readAsText(archivo);
    });
}

function validarEncabezadosCsv(lineas) {

    if (lineas.length === 0) throw new Error('El archivo CSV está vacío.');

    const encabezados = lineas[0].split(',');

    if (encabezados.length < 4) {
        throw new Error('El archivo CSV debe tener al menos 4 columnas obligatorias (lu, nombres, apellido, carrera_id).');
    }

    // Validar el nombre exacto de las columnas para evitar errores por desorden
    const headersLimpios = encabezados.map(h => h.trim().toLowerCase());
    if (headersLimpios[0] !== 'lu' || headersLimpios[1] !== 'nombres' || 
        headersLimpios[2] !== 'apellido' || headersLimpios[3] !== 'carrera_id') {
        throw new Error('Los encabezados deben ser exactamente: lu, nombres, apellido, carrera_id (en ese orden).');
    }
}

function parsearDatosCsv(lineas) {
    const alumnosJson = [];
    for (let i = 1; i < lineas.length; i++) {
        const datos = lineas[i].split(',');
        if (datos.length >= 4) {
            alumnosJson.push({
                lu: datos[0].trim(),
                nombres: datos[1].trim(),
                apellido: datos[2].trim(),
                carrera_id: datos[3] && datos[3].trim() ? parseInt(datos[3].trim()) : null,
                titulo: null,
                titulo_en_tramite: null,
                egreso: null
            });
        }
    }
    return alumnosJson;
}

async function enviarAlumnosAlBackend(alumnosJson) {
    const respuesta = await fetch('/api/v0/archivo', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(alumnosJson)
    });

    const datosRespuesta = await respuesta.json();
    
    if (!respuesta.ok || datosRespuesta.estado !== 'exito') {
        throw new Error(datosRespuesta.mensaje + (datosRespuesta.detalle ? ': ' + datosRespuesta.detalle : ''));
    }
    
    return datosRespuesta;
}

function descargarCsvErrores() {
    if (!ultimosAlumnosIgnorados || ultimosAlumnosIgnorados.length === 0) return;
    
    // Creamos las cabeceras incluyendo la nueva columna de motivo
    const cabeceras = ["lu", "nombres", "apellido", "carrera_id", "motivo_error"];
    const lineasCsv = [cabeceras.join(",")];
    
    ultimosAlumnosIgnorados.forEach(alumno => {
        const linea = [
            alumno.lu || "",
            alumno.nombres || "",
            alumno.apellido || "",
            alumno.carrera_id || "",
            // Envolvemos el motivo en comillas dobles por si tiene comas internas
            `"${(alumno.motivo_error || "").replace(/"/g, '""')}"` 
        ];
        lineasCsv.push(linea.join(","));
    });
    
    // Magia del navegador: Creamos un archivo en memoria y forzamos su descarga
    const blob = new Blob([lineasCsv.join("\n")], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "alumnos_con_errores.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

async function procesarYEnviarArchivo() {
    if (inputCsv.files.length === 0) {
        mostrarMensaje('Por favor, seleccione o arrastre un archivo CSV.', 'error');
        return;
    }

    const divSecundario = document.getElementById('resultadoSecundario');
    if (divSecundario) divSecundario.style.display = 'none';

    const btnGenerar = document.querySelector('.btn-generar');
    mostrarMensaje('Procesando y subiendo archivo...', '');
    
    const contenidoOriginal = btnGenerar.innerHTML;
    btnGenerar.innerHTML = '<i class="ph ph-spinner icono-cargando"></i> Subiendo alumnos...';
    btnGenerar.disabled = true;

    try {
        const contenidoCsv = await leerArchivoComoTexto(inputCsv.files[0]);
        
        const lineas = contenidoCsv.split('\n').map(l => l.trim()).filter(l => l.length > 0);

        validarEncabezadosCsv(lineas);
        
        const alumnosJson = parsearDatosCsv(lineas);
        
        const respuesta = await enviarAlumnosAlBackend(alumnosJson);
        
        mostrarMensaje(`Carga finalizada: ${respuesta.insertados} alumnos nuevos insertados exitosamente.`, 'exito');
        
        if (respuesta.ignorados > 0 && divSecundario) {
            ultimosAlumnosIgnorados = respuesta.alumnosIgnorados || [];
            // Usamos innerHTML para poder insertar el botón de descarga
            divSecundario.innerHTML = `Atención: No se pudieron cargar ${respuesta.ignorados} alumnos (registros duplicados, incompletos o con formato incorrecto).<br><br>
            <button type="button" onclick="descargarCsvErrores()" class="btn-seleccionar" style="background-color: white; border-color: #fca5a5; color: #b91c1c; padding: 6px 12px; font-size: 0.9rem;">
                <i class="ph ph-download-simple"></i> Descargar reporte de errores (CSV)
            </button>`;
            divSecundario.style.display = 'block';
        }
        
        inputCsv.value = ''; 
        nombreArchivo.style.display = 'none';
    } catch (error) {
        mostrarMensaje(error.message || 'Ocurrió un error inesperado durante el proceso.', 'error');
    } finally {
        btnGenerar.innerHTML = contenidoOriginal;
        btnGenerar.disabled = false;
    }
}