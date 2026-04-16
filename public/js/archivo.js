// --- LÓGICA DE DRAG & DROP Y SELECCIÓN DE ARCHIVO ---
const zonaCarga = document.getElementById('zonaCarga');
const inputCsv = document.getElementById('inputCsv');
const nombreArchivo = document.getElementById('nombreArchivo');

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
async function procesarYEnviarArchivo() {
    if (inputCsv.files.length === 0) {
        mostrarMensaje('Por favor, seleccione o arrastre un archivo CSV.', 'error');
        return;
    }

    const archivo = inputCsv.files[0];
    const lector = new FileReader();
    const btnGenerar = document.querySelector('.btn-generar');

    mostrarMensaje('Leyendo y convirtiendo archivo...', '');

    // Efecto de carga
    const contenidoOriginal = btnGenerar.innerHTML;
    btnGenerar.innerHTML = '<i class="ph ph-spinner icono-cargando"></i> Subiendo alumnos...';
    btnGenerar.disabled = true;

    lector.onload = async function(evento) {
        const contenido = evento.target.result;
        const lineas = contenido.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        const encabezados = lineas[0].split(',');
        
        if (encabezados.length < 7) {
            mostrarMensaje('El archivo CSV no tiene las 7 columnas requeridas.', 'error');
            // Restauramos si falla la validación del CSV
            btnGenerar.innerHTML = contenidoOriginal;
            btnGenerar.disabled = false;
            return;
        }

        const alumnosJson = [];
        for (let i = 1; i < lineas.length; i++) {
            const datos = lineas[i].split(',');
            if (datos.length >= 7) {
                alumnosJson.push({
                    lu: datos[0].trim(),
                    nombres: datos[1].trim(),
                    apellido: datos[2].trim(),
                    carrera_id: datos[3].trim() ? parseInt(datos[3].trim()) : null, 
                    titulo: datos[4].trim() || null,
                    titulo_en_tramite: datos[5].trim() || null,
                    egreso: datos[6].trim() || null
                });
            }
        }

        try {
            const respuesta = await fetch('/api/v0/archivo', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(alumnosJson)
            });

            const datosRespuesta = await respuesta.json();

            if (datosRespuesta.estado === 'exito') {
                mostrarMensaje(datosRespuesta.mensaje, 'exito');
                inputCsv.value = ''; 
                nombreArchivo.style.display = 'none';
            } else {
                mostrarMensaje(datosRespuesta.mensaje + (datosRespuesta.detalle ? ': ' + datosRespuesta.detalle : ''), 'error');
            }
        } catch (error) {
            mostrarMensaje('Error de conexión al enviar los datos al servidor.', 'error');
        } finally {
            // Restauramos el botón al terminar
            btnGenerar.innerHTML = contenidoOriginal;
            btnGenerar.disabled = false;
        }
    };

    lector.readAsText(archivo);
}