import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, MagnifyingGlass, UserPlus, ArrowsDownUp, CaretLeft, CaretRight, Spinner, ChartLineUp, GraduationCap, PencilSimple, Trash, FloppyDisk } from '@phosphor-icons/react';
import { Mensaje } from '../components/Mensaje';
import type { Alumno, Carrera } from '../types/index';

// Función utilitaria para formatear fechas
function formatoTabla(fechaIso?: string) {
    if (!fechaIso) return '';
    const soloFecha = fechaIso.split('T')[0];
    const partes = soloFecha.split('-');
    return `${partes[2]}-${partes[1]}-${partes[0]}`;
}

export function Alumnos() {
    const [alumnos, setAlumnos] = useState<Alumno[]>([]);
    const [cargando, setCargando] = useState(true);
    const [busqueda, setBusqueda] = useState('');
    const [pagina, setPagina] = useState(1);
    const [paginacionInfo, setPaginacionInfo] = useState({ totalPaginas: 1, total: 0 });
    const [recargar, setRecargar] = useState(0); // <-- Gatillo para forzar la recarga
    const [mensajePrincipal, setMensajePrincipal] = useState({ texto: '', tipo: '' }); // <-- Cartel global

    // Estados del Ordenamiento
    const [orden, setOrden] = useState<{ columna: keyof Alumno | '', ascendente: boolean }>({ columna: '', ascendente: true });

    // Estados del Formulario
    const [mostrarForm, setMostrarForm] = useState(false);
    const [luEnEdicion, setLuEnEdicion] = useState<string | null>(null);
    const [formData, setFormData] = useState({ lu: '', nombres: '', apellido: '', carrera_id: '' });
    const [carreras, setCarreras] = useState<Carrera[]>([]);
    const [mensajeForm, setMensajeForm] = useState({ texto: '', tipo: '' });
    const [guardando, setGuardando] = useState(false);
    
    const formRef = useRef<HTMLDivElement>(null);
    const inputLuRef = useRef<HTMLInputElement>(null);
    const inputNombresRef = useRef<HTMLInputElement>(null);

    const navigate = useNavigate();

    useEffect(() => {
        // Cargar las carreras una sola vez para el desplegable del formulario
        fetch('/api/v0/carreras').then(res => res.ok ? res.json() : []).then(data => setCarreras(data)).catch(() => {});

        const cargarAlumnos = async () => {
            setCargando(true);
            try {
                // CORRECCIÓN: Los parámetros ahora coinciden exactamente con lo que espera el backend
                const url = `/api/alumnos?pagina=${pagina}&limite=10${busqueda ? `&busqueda=${encodeURIComponent(busqueda)}` : ''}`;
                const respuesta = await fetch(url);
                
                if (respuesta.ok) {
                    const data = await respuesta.json();
                    if (data.estado === "exito") {
                        setAlumnos(data.datos);
                        setPaginacionInfo({ totalPaginas: data.paginacion.totalPaginas, total: data.paginacion.total });
                    }
                }
            } catch (error) {
                console.error("Error al cargar alumnos:", error);
            } finally {
                setCargando(false);
            }
        };

        // "Debounce": Esperamos 300ms después de que el usuario deje de tipear para hacer el fetch
        // Esto evita saturar tu base de datos con una petición por cada letra presionada.
        const timeoutId = setTimeout(() => {
            cargarAlumnos();
        }, 300);

        return () => clearTimeout(timeoutId); // Limpieza del timeout
    }, [pagina, busqueda, recargar]); // <-- Agregamos 'recargar' para que escuche el gatillo

    // --- LOGICA DE ORDENAMIENTO (Reactivo) ---
    const alumnosOrdenados = useMemo(() => {
        if (!orden.columna) return alumnos;
        return [...alumnos].sort((a, b) => {
            const valA = (a[orden.columna as keyof Alumno] || '').toString().toLowerCase();
            const valB = (b[orden.columna as keyof Alumno] || '').toString().toLowerCase();
            if (valA < valB) return orden.ascendente ? -1 : 1;
            if (valA > valB) return orden.ascendente ? 1 : -1;
            return 0;
        });
    }, [alumnos, orden]);

    const handleSort = (columna: keyof Alumno) => {
        setOrden(prev => ({ columna, ascendente: prev.columna === columna ? !prev.ascendente : true }));
    };

    // --- FUNCIONES DE ACCIÓN ---
    const iniciarTramite = async (lu: string) => {
        try {
            const res = await fetch('/api/v0/tramite-titulo', {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lu })
            });
            const data = await res.json();
            if (res.ok) {
                setMensajePrincipal({ texto: 'Trámite iniciado con éxito.', tipo: 'exito' });
                setRecargar(prev => prev + 1);
            } else setMensajePrincipal({ texto: 'Error: ' + data.mensaje, tipo: 'error' });
        } catch (e) { setMensajePrincipal({ texto: 'Error de conexión al iniciar el trámite.', tipo: 'error' }); }
    };

    const borrarAlumno = async (lu: string) => {
        if (!window.confirm(`¿Está absolutamente seguro de eliminar al alumno ${lu}?`)) return;
        setMensajePrincipal({ texto: '', tipo: '' });
        try {
            const partes = lu.split('/');
            const res = await fetch(`/api/alumnos/${partes[0]}/${partes[1]}`, { method: 'DELETE' });
            const data = await res.json();
            if (res.ok) {
                setMensajePrincipal({ texto: data.mensaje || 'Alumno eliminado correctamente.', tipo: 'exito' });
                setRecargar(prev => prev + 1); // Ahora sí forzamos una recarga real
            } else {
                setMensajePrincipal({ texto: 'Error al borrar: ' + data.mensaje, tipo: 'error' });
            }
        } catch (e) { setMensajePrincipal({ texto: 'Error de conexión al intentar borrar.', tipo: 'error' }); }
    };

    // --- FUNCIONES DEL FORMULARIO ---
    const abrirFormCreacion = () => {
        setFormData({ lu: '', nombres: '', apellido: '', carrera_id: '' });
        setMensajePrincipal({ texto: '', tipo: '' });
        setLuEnEdicion(null);
        setMensajeForm({ texto: '', tipo: '' });
        setMostrarForm(true);
        setTimeout(() => {
            formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            inputLuRef.current?.focus(); // <-- Hacemos focus en el campo LU al crear
        }, 50);
    };

    const abrirFormEdicion = (alumno: Alumno) => {
        setFormData({ lu: alumno.lu, nombres: alumno.nombres, apellido: alumno.apellido, carrera_id: alumno.carrera_id?.toString() || '' });
        setMensajePrincipal({ texto: '', tipo: '' });
        setLuEnEdicion(alumno.lu);
        setMensajeForm({ texto: '', tipo: '' });
        setMostrarForm(true);
        setTimeout(() => {
            formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            inputNombresRef.current?.focus(); // <-- Hacemos focus en Nombres porque el LU está bloqueado
        }, 50);
    };

    const guardarAlumno = async (e: React.FormEvent) => {
        e.preventDefault();
        setGuardando(true);
        setMensajeForm({ texto: '', tipo: '' });

        try {
            const url = luEnEdicion ? `/api/alumnos/${luEnEdicion.split('/')[0]}/${luEnEdicion.split('/')[1]}` : '/api/alumno';
            const method = luEnEdicion ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    lu: luEnEdicion ? luEnEdicion : formData.lu,
                    nombres: formData.nombres,
                    apellido: formData.apellido,
                    carrera_id: Number(formData.carrera_id)
                })
            });

            const data = await res.json();
            if (res.ok) {
                setMensajePrincipal({ texto: data.mensaje || 'Alumno guardado exitosamente.', tipo: 'exito' });
                setMostrarForm(false); // Cerramos tras éxito
                setRecargar(prev => prev + 1);
            } else {
                const errorTxt = data.detalles ? data.detalles.map((err: any) => err.message).join(' | ') : data.mensaje;
                setMensajeForm({ texto: errorTxt, tipo: 'error' });
            }
        } catch (error) {
            setMensajeForm({ texto: 'Error de conexión.', tipo: 'error' });
        } finally {
            setGuardando(false);
        }
    };

    return (

            <div className="contenedor-ancho">
                <div className="cabecera-pagina">
                    <h1><Users size="1em" /> Directorio de Alumnos</h1>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'stretch', justifyContent: 'flex-end', flex: 1 }}>
                        <div className="input-con-icono" style={{ flex: 1, minWidth: '120px', maxWidth: '350px' }}>
                            <MagnifyingGlass size="1.2rem" style={{ position: 'absolute', left: '14px', color: '#94a3b8' }} />
                            <input 
                                type="text" 
                                id="inputBusqueda"
                                className="buscador" 
                                placeholder="Buscar por LU o Apellido..." 
                                value={busqueda}
                                onChange={(e) => {
                                    setMensajePrincipal({ texto: '', tipo: '' });
                                    setBusqueda(e.target.value);
                                    setPagina(1);
                                }}
                            />
                        </div>
                        <button onClick={abrirFormCreacion} className="btn-accion-principal" style={{ backgroundColor: '#10b981', width: 'auto', marginTop: 0, padding: '10px 14px', fontSize: '1rem', whiteSpace: 'nowrap' }}>
                            <UserPlus size="1em" /> Registrar Alumno
                        </button>
                    </div>
                </div>

                <Mensaje texto={mensajePrincipal.texto} tipo={mensajePrincipal.tipo} style={{ marginBottom: '20px' }} />

                <div className="contenedor-tabla">
                    <div className="contenedor-scroll">
                        <table id="tablaAlumnos">
                            <thead>
                                <tr>
                                    <th onClick={() => handleSort('lu')}>LU <ArrowsDownUp size="0.8rem" /></th>
                                    <th onClick={() => handleSort('apellido')}>Apellidos <ArrowsDownUp size="0.8rem" /></th>
                                    <th onClick={() => handleSort('nombres')}>Nombres <ArrowsDownUp size="0.8rem" /></th>
                                    <th onClick={() => handleSort('titulo')}>Título <ArrowsDownUp size="0.8rem" /></th>
                                    <th onClick={() => handleSort('titulo_en_tramite')} style={{ textAlign: 'center' }}>En Trámite <ArrowsDownUp size="0.8rem" /></th>
                                    <th onClick={() => handleSort('egreso')} style={{ textAlign: 'center' }}>Egreso <ArrowsDownUp size="0.8rem" /></th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {cargando ? (
                                    <tr><td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}><Spinner className="icono-cargando" /> Cargando datos del padrón...</td></tr>
                                ) : alumnos.length === 0 ? (
                                    <tr><td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>No se encontraron alumnos.</td></tr>
                                ) : (
                                    alumnosOrdenados.map((alumno) => (
                                        <tr key={alumno.lu}>
                                            <td style={{ fontWeight: 500, color: '#0284c7' }}>{alumno.lu}</td>
                                            <td style={{ fontWeight: 500 }}>{alumno.apellido}</td>
                                            <td>{alumno.nombres}</td>
                                            <td>{alumno.titulo || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Sin asignar</span>}</td>
                                            <td style={{ textAlign: 'center' }}>{alumno.titulo_en_tramite ? formatoTabla(alumno.titulo_en_tramite) : <span style={{ color: '#cbd5e1' }}>-</span>}</td>
                                            <td style={{ textAlign: 'center' }}>{alumno.egreso ? formatoTabla(alumno.egreso) : <span style={{ color: '#cbd5e1' }}>-</span>}</td>
                                            <td>
                                                <div className="acciones-tabla">
                                                    <button className="btn-mini" style={{ color: '#8b5cf6' }} onClick={() => navigate(`/app/historial?lu=${encodeURIComponent(alumno.lu)}`)} title="Ver Historial Académico">
                                                        <ChartLineUp size="1em" />
                                                    </button>
                                                    
                                                    {alumno.egreso && !alumno.titulo_en_tramite && (
                                                        <button className="btn-mini tramite" onClick={() => iniciarTramite(alumno.lu)} title="Iniciar Trámite">
                                                            <GraduationCap size="1em" />
                                                        </button>
                                                    )}
                                                    
                                                    <button className="btn-mini editar" onClick={() => abrirFormEdicion(alumno)} title="Editar Alumno"><PencilSimple size="1em" /></button>
                                                    <button className="btn-mini borrar" onClick={() => borrarAlumno(alumno.lu)} title="Borrar Alumno"><Trash size="1em" /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                    
                    <div className="paginacion">
                        <span>Página {pagina} de {paginacionInfo.totalPaginas} ({paginacionInfo.total} registros)</span>
                        <div className="paginacion-botones">
                            <button className="btn-cancelar" onClick={() => setPagina(p => Math.max(1, p - 1))} disabled={pagina === 1}><CaretLeft size="1em" /> Anterior</button>
                            <button className="btn-cancelar" onClick={() => setPagina(p => p + 1)} disabled={pagina >= paginacionInfo.totalPaginas}>Siguiente <CaretRight size="1em" /></button>
                        </div>
                    </div>
                </div>

                {/* FORMULARIO DE ALTA / EDICIÓN */}
                {mostrarForm && (
                    <div ref={formRef} className="tarjeta-form" style={{ maxWidth: '800px', margin: '40px auto 0 auto', padding: '30px' }}>
                        <h3 style={{ marginTop: 0, fontSize: '1.3rem', color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', marginBottom: '20px' }}>
                            {luEnEdicion ? `Editar Alumno: ${luEnEdicion}` : 'Alta de Nuevo Alumno'}
                        </h3>
                        
                        <form onSubmit={guardarAlumno}>
                            <div className="grid-formulario">
                                <div className="grupo-form">
                                    <label>LU (ej. 123/24):</label> 
                                    <input type="text" ref={inputLuRef} required disabled={!!luEnEdicion} value={formData.lu} onChange={e => setFormData({...formData, lu: e.target.value})} placeholder="123/24" />
                                </div>
                                <div className="grupo-form">
                                    <label>Carrera:</label> 
                                    <select required value={formData.carrera_id} onChange={e => setFormData({...formData, carrera_id: e.target.value})}>
                                        <option value="">-- Seleccione una carrera --</option>
                                        {carreras.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                                    </select>
                                </div>
                                <div className="grupo-form">
                                    <label>Nombres:</label> 
                                    <input type="text" ref={inputNombresRef} required value={formData.nombres} onChange={e => setFormData({...formData, nombres: e.target.value})} placeholder="Nombres del alumno" />
                                </div>
                                <div className="grupo-form">
                                    <label>Apellido:</label> 
                                    <input type="text" required value={formData.apellido} onChange={e => setFormData({...formData, apellido: e.target.value})} placeholder="Apellidos del alumno" />
                                </div>
                            </div>
                            
                            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'stretch', gap: '12px', marginTop: '25px' }}>
                                <button type="button" className="btn-cancelar" onClick={() => setMostrarForm(false)} style={{ fontSize: '1.1rem', padding: '14px 18px', whiteSpace: 'nowrap' }}>Cancelar</button>
                                <button type="submit" className="btn-accion-principal" disabled={guardando} style={{ width: 'auto', marginTop: 0, padding: '14px 18px', whiteSpace: 'nowrap' }}>
                                    {guardando ? <Spinner className="icono-cargando" size="1em" /> : <FloppyDisk size="1em" />} Guardar Datos
                                </button>
                            </div>
                        </form>

                        <Mensaje texto={mensajeForm.texto} tipo={mensajeForm.tipo} style={{ marginTop: '20px' }} />
                    </div>
                )}
            </div>

    );
}
