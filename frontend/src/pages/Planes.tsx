import { useState, useEffect, useMemo } from 'react';
import { Books, ArrowsDownUp } from '@phosphor-icons/react';
import { Mensaje } from '../components/Mensaje';
import type { Materia, Plan } from '../types/index';

export function Planes() {
    const [planes, setPlanes] = useState<Plan[]>([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState('');
    
    // Estados para el ordenamiento global (Igual que en planes.js)
    const [orden, setOrden] = useState<{ columna: keyof Materia | '', ascendente: boolean }>({ columna: 'id', ascendente: true });

    useEffect(() => {
        const cargarPlanes = async () => {
            try {
                const res = await fetch('/api/v0/planes-estudio');
                if (res.ok) {
                    const data = await res.json();
                    setPlanes(data.datos || data);
                } else {
                    setError('Error al obtener los planes de estudio del servidor.');
                }
            } catch (e) {
                setError('Error de conexión con el servidor.');
            } finally {
                setCargando(false);
            }
        };

        cargarPlanes();
    }, []);

    // --- LOGICA DE ORDENAMIENTO (Reactivo) ---
    const handleSort = (columna: keyof Materia) => {
        setOrden(prev => ({ columna, ascendente: prev.columna === columna ? !prev.ascendente : true }));
    };

    const planesOrdenados = useMemo(() => {
        if (!orden.columna) return planes;
        
        return planes.map(plan => {
            // Hacemos una copia de las materias para no mutar el estado original
            const materiasOrdenadas = [...(plan.materias || [])].sort((a, b) => {
                let valA = a[orden.columna as keyof Materia];
                let valB = b[orden.columna as keyof Materia];
                
                if (typeof valA === 'string') valA = valA.toLowerCase();
                if (typeof valB === 'string') valB = valB.toLowerCase();
                
                if (valA < valB) return orden.ascendente ? -1 : 1;
                if (valA > valB) return orden.ascendente ? 1 : -1;
                return 0;
            });
            
            return { ...plan, materias: materiasOrdenadas };
        });
    }, [planes, orden]);

    return (

            <div className="contenedor-ancho">
                <div className="cabecera-pagina" style={{ justifyContent: 'center' }}>
                    <h1 style={{ display: 'block', width: '100%', textAlign: 'center' }}>
                        <Books size="1em" style={{ marginRight: '8px' }} /> Planes de Estudio por Carrera
                    </h1>
                </div>

                <div id="contenedor-planes" style={{ marginTop: '40px' }}>
                    {cargando ? null : error ? (
                        <Mensaje texto={error} tipo="error" />
                    ) : planes.length === 0 ? (
                        <Mensaje texto="No hay planes de estudio para mostrar." tipo="" />
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                            {planesOrdenados.map((plan, index) => (
                                <div key={index} className="tarjeta-form">
                                    <h2 className="titulo-carrera">{plan.nombre}</h2>
                                    <p className="subtitulo-carrera" style={{ color: '#64748b', marginBottom: '30px', fontSize: '0.95rem', lineHeight: '1.5' }}>
                                        Título a otorgar: {plan.titulo_otorgado}
                                    </p>
                                    
                                    <div className="table-responsive">
                                        <table>
                                            <thead>
                                                <tr>
                                                    <th style={{ width: '20%', cursor: 'pointer' }} onClick={() => handleSort('id')}>ID Materia <ArrowsDownUp size="0.8rem" /></th>
                                                    <th style={{ cursor: 'pointer' }} onClick={() => handleSort('nombre')}>Nombre de la Materia <ArrowsDownUp size="0.8rem" /></th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {plan.materias && plan.materias.length > 0 ? (
                                                    plan.materias.map((materia, idx) => (
                                                        <tr key={idx}>
                                                            <td>{materia.id}</td>
                                                            <td><strong>{materia.nombre}</strong></td>
                                                        </tr>
                                                    ))
                                                ) : (
                                                    <tr><td colSpan={2} style={{ textAlign: 'center', color: '#64748b', padding: '20px' }}>Esta carrera no tiene materias asignadas.</td></tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

    );
}
