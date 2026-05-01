import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Spinner, ArrowsDownUp, ArrowLeft } from '@phosphor-icons/react';
import type { Cursada, DatosHistorial } from '../types/index';
import { api } from '../utils/api';

export function Historial() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    
    const luParam = searchParams.get('lu');
    
    const [datos, setDatos] = useState<DatosHistorial | null>(null);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState('');
    const [anchoBarra, setAnchoBarra] = useState(0); // Para la animación de la barra verde
    
    const [orden, setOrden] = useState<{ columna: keyof Cursada | '', ascendente: boolean }>({ columna: '', ascendente: true });

    useEffect(() => {
        const cargarHistorial = async () => {
            if (!luParam) {
                setError('No se especificó ninguna Libreta Universitaria en la URL.');
                setCargando(false);
                return;
            }

            const partesLu = luParam.split('/');
            if (partesLu.length !== 2) {
                setError('El formato de la Libreta Universitaria es incorrecto.');
                setCargando(false);
                return;
            }

            try {
                const data = await api.get(`/api/v0/historial/${partesLu[0]}/${partesLu[1]}`);

                setDatos(data);
                setTimeout(() => {
                    setAnchoBarra(data.estadisticas.porcentajeCompletado);
                }, 100);
            } catch (err: any) {
                setError(err.message || "No se pudo conectar con el servidor. Verifique su conexión.");
            } finally {
                setCargando(false);
            }
        };

        cargarHistorial();
    }, [luParam]);

    // Lógica de ordenamiento reactiva
    const handleSort = (columna: keyof Cursada) => {
        setOrden(prev => ({ columna, ascendente: prev.columna === columna ? !prev.ascendente : true }));
    };

    const historialOrdenado = useMemo(() => {
        if (!datos || !orden.columna) return datos?.historial || [];
        
        return [...datos.historial].sort((a, b) => {
            let valorA = a[orden.columna as keyof Cursada];
            let valorB = b[orden.columna as keyof Cursada];

            if (typeof valorA === 'string') valorA = valorA.toLowerCase();
            if (typeof valorB === 'string') valorB = valorB.toLowerCase();

            if (valorA < valorB) return orden.ascendente ? -1 : 1;
            if (valorA > valorB) return orden.ascendente ? 1 : -1;
            return 0;
        });
    }, [datos, orden]);

    return (
            <div className="contenedor-historial">
                {cargando ? (
                    <div className="loading">
                        <Spinner className="icono-cargando" style={{ fontSize: '2rem', color: '#0284c7', marginBottom: '10px', display: 'block', margin: '0 auto' }} />
                        Cargando historial académico...
                    </div>
                ) : error ? (
                    <div className="mensaje error" style={{ display: 'block', marginBottom: '20px' }}>{error}</div>
                ) : datos ? (
                    <>
                        <div className="header-info">
                            <div>
                                <h1>Historial Académico</h1>
                                <h2>{datos.alumno}</h2>
                                <p><strong>Libreta Universitaria:</strong> {datos.lu}</p>
                            </div>
                        </div>

                        <div className="stats-grid">
                            <div className="stat-card">
                                <div className="stat-title">Promedio (Aprobadas)</div>
                                <div className="stat-value">{datos.estadisticas.promedioActual}</div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-title">Progreso de la Carrera</div>
                                <div className="stat-value">{datos.estadisticas.porcentajeCompletado}%</div>
                                <div className="progress-bg">
                                    {/* El ancho reacciona al estado, disparando la transición CSS */}
                                    <div className="progress-fill" style={{ width: `${anchoBarra}%` }}></div>
                                </div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-title">Materias Aprobadas</div>
                                <div className="stat-value">
                                    {datos.estadisticas.materiasAprobadas} <span style={{ fontSize: '20px', color: '#94a3b8' }}>/ {datos.estadisticas.totalMaterias}</span>
                                </div>
                            </div>
                        </div>

                        <h3 style={{ color: '#0f172a', borderLeft: '4px solid #0284c7', paddingLeft: '10px', marginTop: '30px' }}>Detalle de Cursadas</h3>
                        
                        <div className="table-responsive">
                            <table>
                                <thead>
                                    <tr>
                                        <th onClick={() => handleSort('anio')}>Año <ArrowsDownUp size="0.8rem" /></th>
                                        <th onClick={() => handleSort('cuatrimestre')}>Cuatrimestre <ArrowsDownUp size="0.8rem" /></th>
                                        <th onClick={() => handleSort('materia')}>Materia <ArrowsDownUp size="0.8rem" /></th>
                                        <th onClick={() => handleSort('nota')}>Nota <ArrowsDownUp size="0.8rem" /></th>
                                        <th onClick={() => handleSort('aprobada')}>Estado <ArrowsDownUp size="0.8rem" /></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {historialOrdenado.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} style={{ padding: '30px' }}>
                                                <div className="contenedor-mensaje-tabla" style={{ color: '#64748b' }}>El alumno no tiene cursadas registradas.</div>
                                            </td>
                                        </tr>
                                    ) : (
                                        historialOrdenado.map((cursada, idx) => (
                                            <tr key={idx}>
                                                <td>{cursada.anio}</td>
                                                <td>{cursada.cuatrimestre}º</td>
                                                <td><strong>{cursada.materia}</strong></td>
                                                <td className="nota-destacada">{cursada.nota}</td>
                                                <td>
                                                    <span className={`badge ${cursada.aprobada ? 'badge-aprobada' : 'badge-desaprobada'}`}>
                                                        {cursada.aprobada ? 'Aprobada' : 'Desaprobada'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </>
                ) : null}

                <button onClick={() => navigate(-1)} className="btn-volver" style={{ marginTop: '30px', display: 'inline-flex' }}>
                    <ArrowLeft size="1em" /> Volver
                </button>
            </div>

    );
}