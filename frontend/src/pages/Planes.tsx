import { useState, useEffect, useMemo } from 'react';
import { Books, ArrowsDownUp, MagnifyingGlass } from '@phosphor-icons/react';
import type { Materia, Plan } from '../types/index';
import { api } from '../utils/api';

export function Planes() {
    const [planes, setPlanes] = useState<Plan[]>([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState('');
    const [busqueda, setBusqueda] = useState('');
    
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
        let resultado = planes.map(plan => {
            let materiasProcesadas = plan.materias || [];

            // 1. Filtrar por búsqueda
            if (busqueda) {
                const termino = busqueda.toLowerCase();
                materiasProcesadas = materiasProcesadas.filter(m => 
                    m.nombre.toLowerCase().includes(termino) || 
                    m.id.toString().includes(termino)
                );
            }

            // 2. Ordenar
            if (orden.columna) {
                materiasProcesadas = [...materiasProcesadas].sort((a, b) => {
                    let valA = a[orden.columna as keyof Materia];
                    let valB = b[orden.columna as keyof Materia];
                    
                    if (typeof valA === 'string') valA = valA.toLowerCase();
                    if (typeof valB === 'string') valB = valB.toLowerCase();
                    
                    if (valA < valB) return orden.ascendente ? -1 : 1;
                    if (valA > valB) return orden.ascendente ? 1 : -1;
                    return 0;
                });
            }
            
            return { ...plan, materias: materiasProcesadas };
        });

        // 3. Si hay búsqueda activa, ocultamos las carreras que no tienen materias coincidentes
        if (busqueda) {
            resultado = resultado.filter(plan => plan.materias && plan.materias.length > 0);
        }

        return resultado;
    }, [planes, orden, busqueda]);

    return (
        <div className="contenedor">
            <div className="tarjeta-form">
                <div className="cabecera-pagina" style={{ marginBottom: '30px', flexWrap: 'wrap', gap: '20px' }}>
                    <h1 style={{ margin: 0, justifyContent: 'flex-start' }}>
                        <Books size="1em" style={{ marginRight: '8px' }} /> Planes de Estudio
                    </h1>
                    <div className="input-con-icono" style={{ flex: '1 1 250px', maxWidth: '400px' }}>
                        <MagnifyingGlass size="1.2rem" style={{ position: 'absolute', left: '14px', color: '#94a3b8' }} />
                        <input 
                            type="text" 
                            className="buscador" 
                            placeholder="Buscar materia por nombre o ID..." 
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                        />
                    </div>
                </div>

                <div id="contenedor-planes">
                    {cargando ? null : error ? (
                        <div className="mensaje error" style={{ display: 'block' }}>{error}</div>
                    ) : planes.length === 0 ? (
                        <div className="mensaje" style={{ display: 'block' }}>No hay planes de estudio para mostrar.</div>
                    ) : planesOrdenados.length === 0 ? (
                        <div className="mensaje" style={{ display: 'block' }}>No se encontraron materias que coincidan con "{busqueda}".</div>
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
