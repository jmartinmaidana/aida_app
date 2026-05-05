import { useState, useEffect, useMemo } from 'react';
import { Book, CalendarBlank, CheckCircle, Spinner, WarningCircle } from '@phosphor-icons/react';
import { api } from '../utils/api';
import { useToast } from '../context/ToastContext';

export function InscripcionesAlumno() {
    const [oferta, setOferta] = useState<any[]>([]);
    const [cargando, setCargando] = useState(true);
    const [procesandoId, setProcesandoId] = useState<number | null>(null);
    const [materiasInscritas, setMateriasInscritas] = useState<number[]>([]);
    
    const { mostrarToast } = useToast();
    const lu = localStorage.getItem('usuarioLu') || '';

    useEffect(() => {
        const cargarOferta = async () => {
            try {
                const data = await api.get('/api/inscripciones/oferta');
                setOferta(data.datos || []);
                
                // Pre-cargar las materias a las que el alumno ya está inscripto según la BD
                const yaInscriptoIds = (data.datos || []).filter((m: any) => m.inscripto).map((m: any) => m.materia_id);
                setMateriasInscritas(yaInscriptoIds);

            } catch (error: any) {
                mostrarToast(error.message || 'Error al cargar la oferta académica.', 'error');
            } finally {
                setCargando(false);
            }
        };
        cargarOferta();
    }, []);

    const handleInscribirse = async (materiaId: number, anio: number, cuatrimestre: number) => {
        setProcesandoId(materiaId);
        try {
            const data = await api.post('/api/inscripciones/inscribir', {
                lu,
                materia_id: materiaId,
                anio,
                cuatrimestre
            });
            mostrarToast(data.mensaje || 'Inscripción exitosa.', 'exito');
            
            // Guardamos localmente que ya se inscribió para cambiar el botón por un Check verde
            setMateriasInscritas(prev => [...prev, materiaId]);
        } catch (error: any) {
            mostrarToast(error.message || 'Error al inscribirse.', 'error');
        } finally {
            setProcesandoId(null);
        }
    };

    // Agrupamos las materias por período lectivo
    const periodosAgrupados = useMemo(() => {
        const grupos: Record<string, { anio: number, cuatrimestre: number, materias: any[] }> = {};
        oferta.forEach(materia => {
            const key = `${materia.anio}-${materia.cuatrimestre}`;
            if (!grupos[key]) {
                grupos[key] = {
                    anio: materia.anio,
                    cuatrimestre: materia.cuatrimestre,
                    materias: []
                };
            }
            grupos[key].materias.push(materia);
        });
        return Object.values(grupos);
    }, [oferta]);

    if (cargando) return <div className="loading"><Spinner className="icono-cargando" size="2em" style={{ display: 'block', margin: '0 auto 15px auto', color: '#0284c7' }} /> Cargando oferta...</div>;

    if (oferta.length === 0) {
        return (
            <div className="contenedor">
                <div className="tarjeta-form" style={{ textAlign: 'center', padding: '50px 20px' }}>
                    <WarningCircle size="4em" color="#94a3b8" style={{ marginBottom: '15px' }} />
                    <h2 style={{ justifyContent: 'center' }}>Inscripciones Cerradas</h2>
                    <p style={{ margin: 0 }}>Actualmente no hay ningún período de inscripciones abierto. Por favor, vuelve a revisar más adelante.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="contenedor-ancho">
            <div className="cabecera-pagina">
                <h1><Book size="1em" /> Inscripción a Materias</h1>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {periodosAgrupados.map(periodo => (
                    <div key={`${periodo.anio}-${periodo.cuatrimestre}`} className="tarjeta-form" style={{ padding: 0, overflow: 'hidden' }}>
                        <div style={{ padding: '20px', backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                            <h2 style={{ margin: 0, color: '#0f172a', fontSize: '1.25rem', display: 'flex', alignItems: 'center' }}>
                                <CalendarBlank size="1.2em" style={{ marginRight: '8px', color: '#0284c7' }} />
                                Período Académico {periodo.anio} - {periodo.cuatrimestre}º Cuatrimestre
                            </h2>
                        </div>
                        <div className="contenedor-tabla" style={{ border: 'none', borderRadius: 0, margin: 0 }}>
                            <div className="contenedor-scroll">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Materia</th>
                                            <th style={{ textAlign: 'center' }}>Fechas de Cursada</th>
                                            <th style={{ width: '150px', textAlign: 'center' }}>Acción</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {periodo.materias.map(materia => (
                                            <tr key={materia.id}>
                                                <td>
                                                    <strong>{materia.materia}</strong>
                                                    <div style={{ color: '#64748b', fontSize: '0.85rem' }}>Código: {materia.materia_id}</div>
                                                </td>
                                                <td style={{ textAlign: 'center', color: '#475569', fontSize: '0.9rem' }}>
                                                    {materia.fecha_inicio ? new Date(materia.fecha_inicio).toLocaleDateString('es-AR', {timeZone: 'UTC'}) : 'A definir'} 
                                                    {' '}al{' '} 
                                                    {materia.fecha_fin ? new Date(materia.fecha_fin).toLocaleDateString('es-AR', {timeZone: 'UTC'}) : 'A definir'}
                                                </td>
                                                <td style={{ textAlign: 'center' }}>
                                                    {materiasInscritas.includes(materia.materia_id) ? (
                                                        <span style={{ color: '#10b981', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                                                            <CheckCircle size="1.2em" weight="fill" /> Inscripto
                                                        </span>
                                                    ) : (
                                                        <button 
                                                            className="btn-accion-principal" 
                                                            style={{ width: '100%', margin: 0, padding: '8px 12px', backgroundColor: '#10b981' }}
                                                            onClick={() => handleInscribirse(materia.materia_id, materia.anio, materia.cuatrimestre)}
                                                            disabled={procesandoId === materia.materia_id}
                                                        >
                                                            {procesandoId === materia.materia_id ? <Spinner className="icono-cargando" size="1.2em" /> : <><CheckCircle size="1.2em" /> Inscribirse</>}
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}