import { useState } from 'react';
import type { FormEvent } from 'react';
import { Certificate, DownloadSimple, Spinner } from '@phosphor-icons/react';
import { useToast } from '../context/ToastContext';

export function CertificadosLu() {
    const [lu, setLu] = useState('');
    const [cargando, setCargando] = useState(false);
    
    const { mostrarToast } = useToast();

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setCargando(true);

        try {
            const respuesta = await fetch('/api/v0/certificados_lu', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ lu })
            });

            if (respuesta.ok) {
                // 1. Convertimos la respuesta cruda en un archivo binario (Blob)
                const blob = await respuesta.blob();
                // 2. Le creamos una URL temporal en la memoria del navegador
                const url = window.URL.createObjectURL(blob);
                // 3. Creamos un enlace invisible, lo clicamos y lo destruimos
                const a = document.createElement('a');
                a.href = url;
                a.download = `Certificado_${lu.replace('/', '-')}.html`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                window.URL.revokeObjectURL(url); // Limpiamos la memoria
                
                mostrarToast('Certificado descargado exitosamente.', 'exito');
                setLu(''); // Limpiar el input para el próximo uso
            } else {
                const json = await respuesta.json();
                mostrarToast(json.mensaje || 'Error al generar el certificado.', 'error');
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
                    <h1><Certificate size="1em" /> Emisión Individual por LU</h1>
                    <p>Ingrese la Libreta Universitaria del alumno para descargar su constancia de título en formato seguro.</p>
                    
                    <form onSubmit={handleSubmit}>
                        <div className="grupo-form">
                            <label htmlFor="lu">Libreta Universitaria (LU):</label>
                            <input type="text" id="lu" name="lu" placeholder="Ej: 901/24" required value={lu} onChange={(e) => setLu(e.target.value)} />
                        </div>
                        
                        <button type="submit" className="btn-generar" disabled={cargando}>
                            {cargando ? <><Spinner className="icono-cargando" size="1em" /> Generando constancia...</> : <><DownloadSimple size="1em" /> Generar y Descargar Constancia</>}
                        </button>
                    </form>
                </div>
            </div>

    );
}