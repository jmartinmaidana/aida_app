import { useState, useRef } from 'react';
import { FileCsv, Info, FolderOpen, UploadSimple, Spinner, Exam, BookOpen, DownloadSimple } from '@phosphor-icons/react';
import { api } from '../utils/api';
import { useToast } from '../context/ToastContext';
import { csvDragAndDrop } from '../hooks/CsvDragAndDrop';

export function CargaNotasCsv() {
    const [tipoCarga, setTipoCarga] = useState<'CURSADAS' | 'FINALES'>('FINALES');
    const [cargando, setCargando] = useState(false);
    const [erroresSecundarios, setErroresSecundarios] = useState<{ ignorados: number, alumnosIgnorados: any[], datosOriginales?: any[] } | null>(null);
    
    const inputRef = useRef<HTMLInputElement>(null);
    const { mostrarToast } = useToast();
    
    // Instanciamos el Custom Hook
    const { archivo, setArchivo, dragActivo, handleDragOver, handleDragLeave, handleDrop, handleFileChange, leerArchivoComoTexto } = csvDragAndDrop(() => setErroresSecundarios(null));

    const procesarYEnviarArchivo = async () => {
        if (!archivo) return mostrarToast('Por favor, seleccione un archivo CSV.', 'error');
        
        setCargando(true);
        setErroresSecundarios(null);
        mostrarToast(`Procesando planillas de ${tipoCarga.toLowerCase()}...`, '');
        
        let datosJson: any[] = [];

        try {
            const contenidoCsv = await leerArchivoComoTexto(archivo);
            const lineas = contenidoCsv.split('\n').map(l => l.trim()).filter(l => l.length > 0);

            if (lineas.length === 0) throw new Error('El archivo CSV está vacío.');
            const encabezados = lineas[0].split(',').map(h => h.trim().toLowerCase());

            if (tipoCarga === 'FINALES') {
                if (!encabezados.includes('lu') || !encabezados.includes('idmateria') || !encabezados.includes('nota')) {
                    throw new Error('El CSV de Finales debe tener al menos: lu, idmateria, nota.');
                }
                for (let i = 1; i < lineas.length; i++) {
                    const columnas = lineas[i].split(',').map(c => c.trim());
                    datosJson.push({
                        lu: columnas[encabezados.indexOf('lu')],
                        idMateria: parseInt(columnas[encabezados.indexOf('idmateria')]),
                        nota: parseInt(columnas[encabezados.indexOf('nota')]),
                        fecha: encabezados.includes('fecha') && columnas[encabezados.indexOf('fecha')] ? columnas[encabezados.indexOf('fecha')] : undefined
                    });
                }
            } else {
                const indexAnio = encabezados.indexOf('anio') !== -1 ? encabezados.indexOf('anio') : encabezados.indexOf('año');
                if (!encabezados.includes('lu') || !encabezados.includes('idmateria') || indexAnio === -1 || !encabezados.includes('cuatrimestre') || !encabezados.includes('nota')) {
                    throw new Error('El CSV de Cursadas debe tener al menos: lu, idmateria, anio, cuatrimestre, nota.');
                }
                for (let i = 1; i < lineas.length; i++) {
                    const columnas = lineas[i].split(',').map(c => c.trim());
                    datosJson.push({
                        lu: columnas[encabezados.indexOf('lu')],
                        idMateria: parseInt(columnas[encabezados.indexOf('idmateria')]),
                        anio: parseInt(columnas[indexAnio]),
                        cuatrimestre: parseInt(columnas[encabezados.indexOf('cuatrimestre')]),
                        nota: parseInt(columnas[encabezados.indexOf('nota')])
                    });
                }
            }

            const endpoint = tipoCarga === 'FINALES' ? '/api/v0/finales' : '/api/v0/cursada';
            const respuesta = await api.post(endpoint, datosJson);
            
            if (respuesta.estado !== 'exito') {
                if (respuesta.ignorados > 0) {
                    setErroresSecundarios({ ignorados: respuesta.ignorados, alumnosIgnorados: respuesta.alumnosIgnorados || [], datosOriginales: datosJson });
                }
                throw new Error(respuesta.mensaje);
            }
            
            mostrarToast(respuesta.mensaje || `Carga finalizada. Se procesaron ${respuesta.procesados} registros exitosamente.`, 'exito');
            
            if (respuesta.ignorados > 0) {
                setErroresSecundarios({ ignorados: respuesta.ignorados, alumnosIgnorados: respuesta.alumnosIgnorados || [], datosOriginales: datosJson });
            }

            setArchivo(null);
            if (inputRef.current) inputRef.current.value = '';
        } catch (error: any) {
            if (error.ignorados && error.ignorados > 0) {
                setErroresSecundarios({ ignorados: error.ignorados, alumnosIgnorados: error.alumnosIgnorados || [], datosOriginales: datosJson });
            }
            mostrarToast(error.message || 'Ocurrió un error inesperado durante el proceso.', 'error');
        } finally {
            setCargando(false);
        }
    };

    const descargarPlantilla = () => {
        let contenido = "";
        let nombreArchivo = "";
        if (tipoCarga === 'FINALES') {
            contenido = "lu,idmateria,nota,fecha\n123/24,1,9,2026-12-15\n124/24,1,2,2026-12-15";
            nombreArchivo = "plantilla_finales.csv";
        } else {
            contenido = "lu,idmateria,anio,cuatrimestre,nota\n123/24,1,2026,1,8\n124/24,1,2026,1,4";
            nombreArchivo = "plantilla_cursadas.csv";
        }
        const blob = new Blob([contenido], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url); link.setAttribute("download", nombreArchivo);
        document.body.appendChild(link); link.click(); document.body.removeChild(link);
    };

    const descargarCsvErrores = () => {
        if (!erroresSecundarios || erroresSecundarios.alumnosIgnorados.length === 0) return;
        
        // Enriquecemos los errores cruzándolos con los datos originales que envió el frontend
        // Esto garantiza que siempre se vean todas las columnas (año, materia, nota) sin importar qué devuelva el backend
        let originalesDisponibles = erroresSecundarios.datosOriginales ? [...erroresSecundarios.datosOriginales] : [];
        
        const erroresEnriquecidos = erroresSecundarios.alumnosIgnorados.map(err => {
            if (originalesDisponibles.length > 0) {
                const index = originalesDisponibles.findIndex(d => d.lu === err.lu);
                if (index !== -1) {
                    const original = originalesDisponibles[index];
                    originalesDisponibles.splice(index, 1); // Lo removemos para asignar errores a filas únicas
                    return { ...original, ...err };
                }
            }
            return err;
        });

        // Extraer las cabeceras dinámicamente basadas en el primer registro con error
        const primerRegistro = erroresEnriquecidos[0];
        const cabecerasOriginales = Object.keys(primerRegistro).filter(k => k !== 'motivo_error');
        const cabeceras = [...cabecerasOriginales, "motivo_error"];
        
        const lineasCsv = [cabeceras.join(",")];
        
        erroresEnriquecidos.forEach(alumno => {
            const linea = cabeceras.map(cabecera => {
                const valor = alumno[cabecera];
                if (valor === null || valor === undefined) return "";
                return `"${String(valor).replace(/"/g, '""')}"`;
            });
            lineasCsv.push(linea.join(","));
        });
        
        const blob = new Blob([lineasCsv.join("\n")], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url); link.setAttribute("download", "notas_con_errores.csv");
        document.body.appendChild(link); link.click(); document.body.removeChild(link);
    };

    return (
        <div className="contenedor">
            <div className="tarjeta-form">
                <h1><FileCsv size="1em" /> Carga Masiva de Calificaciones</h1>
                <p>Seleccione el tipo de acta a procesar y suba su archivo CSV delimitado por comas.</p>
                
                <div className="filtros-historial" style={{ justifyContent: 'center' }}>
                    <button onClick={() => setTipoCarga('FINALES')} className={tipoCarga === 'FINALES' ? 'activo' : ''}>
                        <Exam size={18}/> Exámenes Finales
                    </button>
                    <button onClick={() => setTipoCarga('CURSADAS')} className={tipoCarga === 'CURSADAS' ? 'activo' : ''}>
                        <BookOpen size={18}/> Cursadas (Regularidad)
                    </button>
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', marginBottom: '25px', flexWrap: 'wrap' }}>
                    <div className="tooltip-csv" style={{ marginBottom: 0 }}>
                        <div className="tooltip-csv-trigger"><Info size="1.2em" /> Ver columnas requeridas</div>
                        <div className="tooltip-csv-content">
                            <p style={{ marginTop: 0, marginBottom: '8px', fontSize: '0.9rem' }}>El archivo CSV debe incluir obligatoriamente estos nombres en el encabezado (fila 1):</p>
                            {tipoCarga === 'FINALES' ? <ol style={{ margin: 0, paddingLeft: '20px', fontSize: '0.9rem' }}><li><strong>lu</strong></li><li><strong>idmateria</strong></li><li><strong>nota</strong></li><li><strong>fecha</strong> (opcional: AAAA-MM-DD)</li></ol> : <ol style={{ margin: 0, paddingLeft: '20px', fontSize: '0.9rem' }}><li><strong>lu</strong></li><li><strong>idmateria</strong></li><li><strong>anio</strong></li><li><strong>cuatrimestre</strong></li><li><strong>nota</strong></li></ol>}
                        </div>
                    </div>
                    <button type="button" onClick={descargarPlantilla} className="btn-seleccionar" style={{ padding: '8px 12px', fontSize: '0.9rem', backgroundColor: 'transparent' }}>
                        <DownloadSimple size="1.2em" /> Descargar Plantilla CSV
                    </button>
                </div>

                <div className={`area-carga ${dragActivo ? 'drag-over' : ''}`} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
                    <FileCsv size={48} color="#94a3b8" style={{ marginBottom: '15px' }} />
                    <p style={{ margin: '0 0 15px 0', color: '#475569', fontSize: '0.95rem' }}>Arrastre y suelte su archivo aquí o</p>
                    <input type="file" id="inputCsvNotas" accept=".csv" style={{ display: 'none' }} onChange={handleFileChange} ref={inputRef} />
                    <label htmlFor="inputCsvNotas" className="btn-seleccionar"><FolderOpen size="1.2em" /> Seleccionar CSV</label>
                    {archivo && <p style={{ margin: '15px 0 0 0', fontWeight: 600, color: '#0284c7', fontSize: '0.95rem' }}>{archivo.name}</p>}
                </div>
                
                <button onClick={procesarYEnviarArchivo} className="btn-generar" disabled={cargando}>{cargando ? <><Spinner className="icono-cargando" size="1.2em" /> Procesando notas...</> : <><UploadSimple size="1.2em" /> Procesar y Cargar Notas</>}</button>
                
                {erroresSecundarios && (
                    <div className="mensaje error" style={{ display: 'block', marginTop: '15px' }}>
                        Atención: No se pudieron procesar {erroresSecundarios.ignorados} registros (datos inválidos, alumnos no inscriptos, o notas fuera de rango).<br /><br />
                        <button type="button" onClick={descargarCsvErrores} className="btn-seleccionar" style={{ backgroundColor: 'white', borderColor: '#fca5a5', color: '#b91c1c', padding: '6px 12px', fontSize: '0.9rem' }}><DownloadSimple size="1.2em" /> Descargar reporte de errores (CSV)</button>
                    </div>
                )}
            </div>
        </div>
    );
}