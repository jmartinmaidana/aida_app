import { useState, useEffect, useMemo } from 'react';
import { Books, ArrowsDownUp } from '@phosphor-icons/react';
import type { Materia, Plan } from '../types/index';
import { api } from '../utils/api';

export function Planes() {
    const [planes, setPlanes] = useState<Plan[]>([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState('');
    
    // Estados para el ordenamiento global (Igual que en planes.js)
    const [orden, setOrden] = useState<{ columna: keyof Materia | '', ascendente: boolean }>({ columna: 'id', ascendente: true });

    useEffect(() => {
        const cargarPlanes = async () => {
            try {
                const data = await api.get('/api/v0/planes-estudio');
                setPlanes(data.datos || data);
            } catch (e: any) {
                setError(e.message || 'Error al obtener los planes de estudio del servidor.');
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
        <div className="contenedor">
            <div className="tarjeta-form">
                <h1 style={{ justifyContent: 'center', marginBottom: '30px' }}>
                    <Books size="1em" style={{ marginRight: '8px' }} /> Planes de Estudio por Carrera
                </h1>

                <div id="contenedor-planes">
                    {cargando ? null : error ? (
                        <div className="mensaje error" style={{ display: 'block' }}>{error}</div>
                    ) : planes.length === 0 ? (
                        <div className="mensaje" style={{ display: 'block' }}>No hay planes de estudio para mostrar.</div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '50px' }}>
                            {planesOrdenados.map((plan, index) => (
                                <div key={index}>
                                    <h2 className="titulo-carrera" style={{ color: '#0f172a', borderBottom: '2px solid #e2e8f0', paddingBottom: '10px', marginBottom: '10px' }}>
                                        {plan.nombre}
                                    </h2>
                                    <p className="subtitulo-carrera" style={{ color: '#64748b', marginBottom: '20px', fontSize: '0.95rem' }}>
                                        Título a otorgar: <strong style={{ color: '#0284c7' }}>{plan.titulo_otorgado}</strong>
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
        </div>

    );
}
