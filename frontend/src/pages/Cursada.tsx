import { useState } from 'react';
import type { FormEvent, ChangeEvent } from 'react';
import { PencilLine, FloppyDisk, Spinner } from '@phosphor-icons/react';
import { Mensaje } from '../components/Mensaje';
import { api } from '../utils/api';

export function Cursada() {
    // Centralizamos todos los campos del formulario en un solo estado
    const [formData, setFormData] = useState({
        lu: '',
        idMateria: '',
        anio: '',
        cuatrimestre: '',
        nota: ''
    });
    
    const [mensaje, setMensaje] = useState({ texto: '', tipo: '' });
    const [cargando, setCargando] = useState(false);

    // Función genérica para actualizar cualquier input del formulario
    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setCargando(true);
        setMensaje({ texto: '', tipo: '' });

        // Barrera de seguridad del Frontend (Evita enviar peticiones vacías)
        if (!formData.lu || !formData.idMateria || !formData.anio || !formData.cuatrimestre || !formData.nota) {
            setMensaje({ texto: 'Falta completar datos. Verifique todos los campos.', tipo: 'error' });
            setCargando(false);
            return;
        }

        try {
            const payload = {
                lu: formData.lu,
                idMateria: Number(formData.idMateria),
                año: Number(formData.anio), // <-- ¡Aquí estaba el error! Enviábamos "anio" en lugar de "año"
                cuatrimestre: Number(formData.cuatrimestre),
                nota: Number(formData.nota)
            };

            const data = await api.post('/api/v0/cursada', payload);
            
            setMensaje({ texto: data.mensaje || 'Cursada registrada con éxito.', tipo: 'exito' });
            setFormData({ lu: '', idMateria: '', anio: '', cuatrimestre: '', nota: '' }); 
        } catch (error: any) {
            setMensaje({ texto: error.message || 'Error de conexión con el servidor.', tipo: 'error' });
        } finally {
            setCargando(false);
        }
    };

    return (

            <div className="contenedor">
                <div className="tarjeta-form">
                    <h1><PencilLine size="1em" /> Registrar Nota Aprobada</h1>
                    <p>Ingrese los datos de la cursada para asentar la aprobación en el historial académico del alumno.</p>
                    
                    <form onSubmit={handleSubmit}>
                        <div className="grupo-form">
                            <label htmlFor="lu">Libreta Universitaria (LU):</label>
                            <input type="text" id="lu" name="lu" placeholder="Ej: 123/24" required value={formData.lu} onChange={handleChange} />
                        </div>
                        <div className="grupo-form">
                            <label htmlFor="idMateria">ID de la Materia:</label>
                            <input type="number" id="idMateria" name="idMateria" placeholder="Ej: 1" required value={formData.idMateria} onChange={handleChange} />
                        </div>
                        <div className="fila-doble">
                            <div className="grupo-form"><label htmlFor="anio">Año de Cursada:</label><input type="number" id="anio" name="anio" placeholder="Ej: 2024" required value={formData.anio} onChange={handleChange} /></div>
                            <div className="grupo-form"><label htmlFor="cuatrimestre">Cuatrimestre:</label><input type="number" id="cuatrimestre" name="cuatrimestre" placeholder="1 o 2" min="1" max="2" required value={formData.cuatrimestre} onChange={handleChange} /></div>
                            <div className="grupo-form" style={{ marginTop: '15px' }}><label htmlFor="nota">Nota de cierre (1 al 10):</label><input type="number" id="nota" name="nota" placeholder="Ej: 7" min="1" max="10" required value={formData.nota} onChange={handleChange} /></div>
                        </div>
                        
                        <button type="submit" className="btn-generar" disabled={cargando}>{cargando ? <Spinner className="icono-cargando" size="1em" /> : <FloppyDisk size="1em" />} Guardar Cursada</button>
                    </form>

                    <Mensaje texto={mensaje.texto} tipo={mensaje.tipo} />
                </div>
            </div>
    );
}