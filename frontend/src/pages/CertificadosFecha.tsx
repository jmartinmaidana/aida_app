import { useState } from 'react';
import type { FormEvent } from 'react';
import { Files, PaperPlaneRight, Spinner } from '@phosphor-icons/react';
import { useToast } from '../context/ToastContext';

export function CertificadosFecha() {
    const [fecha, setFecha] = useState('');
    const [cargando, setCargando] = useState(false);
    
    const { mostrarToast } = useToast();

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        
        if (!fecha) {
            mostrarToast('Por favor, ingrese una fecha.', 'error');
            return;
        }

        setCargando(true);
        // Tipo vacío '' hará que el cartel se vea gris/neutro, tal como lo tenías programado
        mostrarToast('Generando certificados masivos, por favor espere...', ''); 

        try {
            const respuesta = await fetch('/api/v0/certificados_fecha', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fecha }) 
            });

            if (respuesta.ok) {
                // Descarga del archivo ZIP
                const blob = await respuesta.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `certificados_${fecha}.zip`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                window.URL.revokeObjectURL(url);
                
                mostrarToast('¡Descarga iniciada con éxito!', 'exito');
                setFecha(''); // Limpiar el input
            } else {
                const datos = await respuesta.json();
                mostrarToast(datos.mensaje || 'Error al generar el lote.', 'error');
            }
        } catch (error) {
            mostrarToast('Error de conexión con el servidor.', 'error');
        } finally {
            setCargando(false);
        }
    };

    return (

            <div className="contenedor">
                <div className="tarjeta-form">
                    <h1><Files size="1em" /> Emisión Masiva por Fecha</h1>
                    <p>Ingrese la fecha de solicitud del título para procesar en lote y generar los certificados de todos los alumnos correspondientes a esa fecha.</p>
                    
                    <form onSubmit={handleSubmit}>
                        <div className="grupo-form">
                            <label htmlFor="inputFecha">Fecha de Título en Trámite:</label>
                            <input type="date" id="inputFecha" required value={fecha} onChange={(e) => setFecha(e.target.value)} />
                        </div>
                        
                        <button type="submit" className="btn-generar" disabled={cargando}>
                            {cargando ? <><Spinner className="icono-cargando" size="1em" /> Procesando lote...</> : <><PaperPlaneRight size="1em" /> Generar Lote de Certificados</>}
                        </button>
                    </form>
                </div>
            </div>

    );
}