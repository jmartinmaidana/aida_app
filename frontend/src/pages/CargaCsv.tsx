import { useState, useRef } from 'react';
import { FileCsv, Info, FolderOpen, UploadSimple, Spinner, DownloadSimple } from '@phosphor-icons/react';
import { api } from '../utils/api';
import { useToast } from '../context/ToastContext';
import { csvDragAndDrop } from '../hooks/CsvDragAndDrop';

export function CargaCsv() {
    const [cargando, setCargando] = useState(false);
    const [erroresSecundarios, setErroresSecundarios] = useState<{ ignorados: number, alumnosIgnorados: any[] } | null>(null);
    
    const inputRef = useRef<HTMLInputElement>(null);
    const { mostrarToast } = useToast();
    
    // Usamos nuestro Custom Hook. Le pasamos un callback para limpiar el estado de errores si suben otro archivo.
    const { archivo, setArchivo, dragActivo, handleDragOver, handleDragLeave, handleDrop, handleFileChange, leerArchivoComoTexto } = csvDragAndDrop(() => setErroresSecundarios(null));

    const procesarYEnviarArchivo = async () => {
        if (!archivo) return mostrarToast('Por favor, seleccione o arrastre un archivo CSV.', 'error');
        
        setCargando(true);
        mostrarToast('Procesando y subiendo archivo...', '');
        setErroresSecundarios(null);

        try {
            const contenidoCsv = await leerArchivoComoTexto(archivo);
            const lineas = contenidoCsv.split('\n').map(l => l.trim()).filter(l => l.length > 0);

            if (lineas.length === 0) throw new Error('El archivo CSV está vacío.');
            const encabezados = lineas[0].split(',');
            if (encabezados.length < 4) throw new Error('El archivo CSV debe tener al menos 4 columnas obligatorias (lu, nombres, apellido, carrera_id).');

            const headersLimpios = encabezados.map(h => h.trim().toLowerCase());
            if (headersLimpios[0] !== 'lu' || headersLimpios[1] !== 'nombres' || headersLimpios[2] !== 'apellido' || headersLimpios[3] !== 'carrera_id') {
                throw new Error('Los encabezados deben ser exactamente: lu, nombres, apellido, carrera_id (en ese orden).');
            }

            const alumnosJson = [];
            for (let i = 1; i < lineas.length; i++) {
                const datos = lineas[i].split(',');
                if (datos.length >= 4) {
                    alumnosJson.push({
                        lu: datos[0].trim(), nombres: datos[1].trim(), apellido: datos[2].trim(),
                        carrera_id: datos[3] && datos[3].trim() ? parseInt(datos[3].trim()) : null,
                    });
                }
            }

            const datosRespuesta = await api.patch('/api/v0/archivo', alumnosJson);
            
            if (datosRespuesta.estado !== 'exito') throw new Error(datosRespuesta.mensaje + (datosRespuesta.detalle ? ': ' + datosRespuesta.detalle : ''));
            
            mostrarToast(`Carga finalizada: ${datosRespuesta.insertados} alumnos nuevos insertados exitosamente.`, 'exito');
            
            if (datosRespuesta.ignorados > 0) {
                setErroresSecundarios({ ignorados: datosRespuesta.ignorados, alumnosIgnorados: datosRespuesta.alumnosIgnorados || [] });
            }
            
            setArchivo(null);
            if (inputRef.current) inputRef.current.value = '';

        } catch (error: any) {
            if (error.ignorados && error.ignorados > 0) {
                setErroresSecundarios({ ignorados: error.ignorados, alumnosIgnorados: error.alumnosIgnorados || [] });
            }
            mostrarToast(error.message || 'Ocurrió un error inesperado durante el proceso.', 'error');
        } finally {
            setCargando(false);
        }
    };

    const descargarCsvErrores = () => {
        if (!erroresSecundarios || erroresSecundarios.alumnosIgnorados.length === 0) return;
        
        // 1. Extraer las cabeceras dinámicamente basadas en el primer registro con error
        const primerRegistro = erroresSecundarios.alumnosIgnorados[0];
        const cabecerasOriginales = Object.keys(primerRegistro).filter(k => k !== 'motivo_error');
        const cabeceras = [...cabecerasOriginales, "motivo_error"];
        
        const lineasCsv = [cabeceras.join(",")];
        
        erroresSecundarios.alumnosIgnorados.forEach(alumno => {
            const linea = cabeceras.map(cabecera => {
                const valor = alumno[cabecera];
                if (valor === null || valor === undefined) return "";
                // Escapar texto para que las comas internas no rompan el CSV
                return `"${String(valor).replace(/"/g, '""')}"`;
            });
            lineasCsv.push(linea.join(","));
        });
        
        const blob = new Blob([lineasCsv.join("\n")], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url); link.setAttribute("download", "reporte_errores.csv");
        document.body.appendChild(link); link.click(); document.body.removeChild(link);
    };

    const descargarPlantilla = () => {
        const contenido = "lu,nombres,apellido,carrera_id\n123/24,Juan,Perez,1\n124/24,Maria,Gomez,1";
        const blob = new Blob([contenido], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url); link.setAttribute("download", "plantilla_alumnos.csv");
        document.body.appendChild(link); link.click(); document.body.removeChild(link);
    };

    return (
            <div className="contenedor">
                <div className="tarjeta-form">
                    <h1><FileCsv size="1em" /> Carga Múltiple de Alumnos (CSV)</h1>
                    <p>Seleccione un archivo en formato delimitado por comas (.csv) para importar un lote de inscriptos y registrarlos directamente en la base de datos.</p>
                    
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', marginBottom: '25px', flexWrap: 'wrap' }}>
                        <div className="tooltip-csv" style={{ marginBottom: 0 }}>
                            <div className="tooltip-csv-trigger"><Info size="1.2em" /> Formato requerido para el archivo CSV</div>
                            <div className="tooltip-csv-content">
                                <p style={{ marginTop: 0, marginBottom: '8px', fontSize: '0.9rem' }}>El archivo debe contener <strong>al menos 4 columnas</strong> separadas por comas, respetando estrictamente el siguiente orden y formato de nombres:</p>
                                <ol style={{ margin: 0, paddingLeft: '20px', marginBottom: '8px', fontSize: '0.9rem' }}>
                                    <li><strong>lu</strong> (ej: 123/24)</li> <li><strong>nombres</strong></li> <li><strong>apellido</strong></li> <li><strong>carrera_id</strong> (numérico)</li>
                                </ol>
                                <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8' }}><em>Nota: La primera fila será ignorada. Las columnas adicionales no se tomarán en cuenta.</em></p>
                            </div>
                        </div>
                        <button type="button" onClick={descargarPlantilla} className="btn-seleccionar" style={{ padding: '8px 12px', fontSize: '0.9rem', backgroundColor: 'transparent' }}>
                            <DownloadSimple size="1.2em" /> Descargar Plantilla CSV
                        </button>
                    </div>

                    <div className={`area-carga ${dragActivo ? 'drag-over' : ''}`} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
                        <FileCsv size={48} color="#94a3b8" style={{ marginBottom: '15px' }} />
                        <p style={{ margin: '0 0 15px 0', color: '#475569', fontSize: '0.95rem' }}>Arrastre y suelte su archivo aquí o</p>
                        <input type="file" id="inputCsv" accept=".csv" style={{ display: 'none' }} onChange={handleFileChange} ref={inputRef} />
                        <label htmlFor="inputCsv" className="btn-seleccionar"><FolderOpen size="1.2em" /> Seleccionar Archivo</label>
                        {archivo && <p style={{ margin: '15px 0 0 0', fontWeight: 600, color: '#0284c7', wordBreak: 'break-all', fontSize: '0.95rem' }}>{archivo.name}</p>}
                    </div>
                    
                    <button onClick={procesarYEnviarArchivo} className="btn-generar" disabled={cargando}>{cargando ? <><Spinner className="icono-cargando" size="1.2em" /> Procesando y subiendo...</> : <><UploadSimple size="1.2em" /> Procesar y Cargar Datos</>}</button>
                    {erroresSecundarios && (
                        <div className="mensaje error" style={{ display: 'block', marginTop: '15px' }}>
                            Atención: No se pudieron cargar {erroresSecundarios.ignorados} alumnos (registros duplicados, incompletos o con formato incorrecto).<br /><br />
                            <button type="button" onClick={descargarCsvErrores} className="btn-seleccionar" style={{ backgroundColor: 'white', borderColor: '#fca5a5', color: '#b91c1c', padding: '6px 12px', fontSize: '0.9rem' }}><DownloadSimple size="1.2em" /> Descargar reporte de errores (CSV)</button>
                        </div>
                    )}
                </div>
            </div>
    );
}
