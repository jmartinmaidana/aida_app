import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { DatosHistorial, Cursada, Final } from '../types';
import { Student, BookOpen, Exam, Spinner, ArrowsDownUp } from '@phosphor-icons/react';
import { useToast } from '../context/ToastContext';

export function Historial() {
    // Parámetros de consulta de la URL (Ej: ?lu=123/24)
    const [searchParams] = useSearchParams();
    const luQuery = searchParams.get('lu');
    
    // Estados
    const [datos, setDatos] = useState<DatosHistorial | null>(null);
    const [cargando, setCargando] = useState(true);
    const [filtro, setFiltro] = useState<'TODOS' | 'CURSADAS' | 'FINALES'>('TODOS');
    
    // Estados de Ordenamiento
    const [ordenCursadas, setOrdenCursadas] = useState<{ columna: keyof Cursada | '', ascendente: boolean }>({ columna: '', ascendente: true });
    const [ordenFinales, setOrdenFinales] = useState<{ columna: keyof Final | '', ascendente: boolean }>({ columna: '', ascendente: true });
    
    const { mostrarToast } = useToast();

    useEffect(() => {
        const cargarHistorial = async () => {
            if (!luQuery) return;
            
            const [prefijo, anio] = luQuery.split('/');
            
            try {
                setCargando(true);
                const respuesta = await fetch(`/api/v0/historial/${prefijo}/${anio}`);
                const data = await respuesta.json();

                if (respuesta.ok) {
                    setDatos(data);
                } else {
                    mostrarToast(data.mensaje || 'Error al obtener el historial.', 'error');
                }
            } catch (error) {
                mostrarToast('Error de conexión con el servidor.', 'error');
            } finally {
                setCargando(false);
            }
        };

        if (luQuery) {
            cargarHistorial();
        } else {
            setCargando(false);
            mostrarToast('No se especificó la Libreta Universitaria.', 'error');
        }
    }, [luQuery]);

    // Formateador de fechas seguro para evitar problemas de Timezone
    const formatearFecha = (fechaString: string) => {
        if (!fechaString) return '-';
        const [anio, mes, dia] = fechaString.split('T')[0].split('-');
        return `${dia}/${mes}/${anio}`;
    };

    // --- LOGICA DE ORDENAMIENTO (Reactivo) ---
    const handleSortCursadas = (columna: keyof Cursada) => {
        setOrdenCursadas(prev => ({ columna, ascendente: prev.columna === columna ? !prev.ascendente : true }));
    };

    const handleSortFinales = (columna: keyof Final) => {
        setOrdenFinales(prev => ({ columna, ascendente: prev.columna === columna ? !prev.ascendente : true }));
    };

    const cursadasOrdenadas = useMemo(() => {
        if (!datos) return [];
        if (!ordenCursadas.columna) return datos.historial;

        return [...datos.historial].sort((a, b) => {
            // Lógica especial para ordenar el período cronológicamente (Año + Cuatrimestre)
            if (ordenCursadas.columna === 'anio') {
                const periodoA = a.anio * 10 + a.cuatrimestre;
                const periodoB = b.anio * 10 + b.cuatrimestre;
                return ordenCursadas.ascendente ? periodoA - periodoB : periodoB - periodoA;
            }

            let valA: any = a[ordenCursadas.columna as keyof Cursada] ?? '';
            let valB: any = b[ordenCursadas.columna as keyof Cursada] ?? '';

            if (typeof valA === 'string') valA = valA.toLowerCase();
            if (typeof valB === 'string') valB = valB.toLowerCase();

            if (valA < valB) return ordenCursadas.ascendente ? -1 : 1;
            if (valA > valB) return ordenCursadas.ascendente ? 1 : -1;
            return 0;
        });
    }, [datos, ordenCursadas]);

    const finalesOrdenados = useMemo(() => {
        if (!datos) return [];
        if (!ordenFinales.columna) return datos.finales;

        return [...datos.finales].sort((a, b) => {
            let valA: any = a[ordenFinales.columna as keyof Final] ?? '';
            let valB: any = b[ordenFinales.columna as keyof Final] ?? '';

            if (typeof valA === 'string') valA = valA.toLowerCase();
            if (typeof valB === 'string') valB = valB.toLowerCase();

            if (valA < valB) return ordenFinales.ascendente ? -1 : 1;
            if (valA > valB) return ordenFinales.ascendente ? 1 : -1;
            return 0;
        });
    }, [datos, ordenFinales]);

    if (cargando) return <div className="loading" style={{ marginTop: '40px' }}><Spinner className="icono-cargando" size="2em" style={{ display: 'block', margin: '0 auto 15px auto', color: '#0284c7' }} /> Cargando información académica...</div>;
    if (!datos) return <div className="mensaje error" style={{ display: 'block', maxWidth: '600px', margin: '40px auto' }}>No se pudo cargar el historial.</div>;

    return (
        <div className="contenedor-historial">
            {/* 1. Cabecera y Estadísticas */}
            <div className="header-info">
                <div>
                    <h1><Student size={32} style={{ marginRight: '10px' }} /> Historial Académico</h1>
                    <h2>{datos.alumno}</h2>
                    <p>Libreta Universitaria: {datos.lu}</p>
                </div>
            </div>

            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-title">Promedio (Sin Aplazos)</div>
                    <div className="stat-value">{datos.estadisticas.promedioActual}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-title">Materias Aprobadas</div>
                    <div className="stat-value">{datos.estadisticas.materiasAprobadas} / {datos.estadisticas.totalMaterias}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-title">Progreso de Carrera</div>
                    <div className="stat-value">{datos.estadisticas.porcentajeCompletado}%</div>
                    <div className="progress-bg"><div className="progress-fill" style={{ width: `${datos.estadisticas.porcentajeCompletado}%` }}></div></div>
                </div>
            </div>

            {/* 2. Botones de Filtro */}
            <div className="filtros-historial">
                <button onClick={() => setFiltro('TODOS')} className={filtro === 'TODOS' ? 'activo' : ''}>
                    Mostrar Todo
                </button>
                <button onClick={() => setFiltro('CURSADAS')} className={filtro === 'CURSADAS' ? 'activo' : ''}>
                    <BookOpen size={18}/> Cursadas
                </button>
                <button onClick={() => setFiltro('FINALES')} className={filtro === 'FINALES' ? 'activo' : ''}>
                    <Exam size={18}/> Finales
                </button>
            </div>

            {/* 3. Tabla de Cursadas (Condicional) */}
            {(filtro === 'TODOS' || filtro === 'CURSADAS') && (
                <div className="seccion-tabla">
                    <h3>Cursadas (Regularidades)</h3>
                    <div className="contenedor-tabla" style={{ marginBottom: '30px' }}>
                        <div className="contenedor-scroll">
                            <table>
                                <thead>
                                    <tr>
                                        <th onClick={() => handleSortCursadas('materia')}>Materia <ArrowsDownUp size="0.8rem" /></th>
                                        <th onClick={() => handleSortCursadas('anio')}>Período <ArrowsDownUp size="0.8rem" /></th>
                                        <th onClick={() => handleSortCursadas('estado')}>Estado <ArrowsDownUp size="0.8rem" /></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {cursadasOrdenadas.map((c, i) => (
                                        <tr key={`cursada-${i}`}><td>{c.materia}</td><td>{c.anio} - C{c.cuatrimestre}</td><td><span className={`badge badge-${c.estado.toLowerCase()}`}>{c.estado}</span></td></tr>
                                    ))}
                                    {cursadasOrdenadas.length === 0 && <tr><td colSpan={3} style={{ textAlign: 'center', color: '#64748b', padding: '20px' }}>No hay cursadas registradas.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* 4. Tabla de Finales (Condicional) */}
            {(filtro === 'TODOS' || filtro === 'FINALES') && (
                <div className="seccion-tabla">
                    <h3>Exámenes Finales</h3>
                    <div className="contenedor-tabla" style={{ marginBottom: '30px' }}>
                        <div className="contenedor-scroll">
                            <table>
                                <thead>
                                    <tr>
                                        <th onClick={() => handleSortFinales('materia')}>Materia <ArrowsDownUp size="0.8rem" /></th>
                                        <th onClick={() => handleSortFinales('fecha')}>Fecha de Acta <ArrowsDownUp size="0.8rem" /></th>
                                        <th onClick={() => handleSortFinales('nota')}>Nota <ArrowsDownUp size="0.8rem" /></th>
                                        <th onClick={() => handleSortFinales('aprobado')}>Condición <ArrowsDownUp size="0.8rem" /></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {finalesOrdenados.map(f => (
                                        <tr key={`final-${f.id}`}><td>{f.materia}</td><td>{formatearFecha(f.fecha)}</td><td><strong>{f.nota}</strong></td><td><span className={`badge badge-${f.aprobado ? 'aprobada' : 'desaprobada'}`}>{f.aprobado ? 'Aprobado' : 'Aplazo'}</span></td></tr>
                                    ))}
                                    {finalesOrdenados.length === 0 && <tr><td colSpan={4} style={{ textAlign: 'center', color: '#64748b', padding: '20px' }}>No hay exámenes finales registrados.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}