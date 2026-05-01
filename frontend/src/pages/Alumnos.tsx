import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, MagnifyingGlass, UserPlus, ArrowsDownUp, CaretLeft, CaretRight, Spinner, ChartLineUp, GraduationCap, PencilSimple, Trash, FloppyDisk } from '@phosphor-icons/react';
import type { Alumno, Carrera } from '../types/index';
import { api } from '../utils/api';
import { useToast } from '../context/ToastContext';
import { ConfirmModal } from '../components/ConfirmModal';

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

    // Estados del Ordenamiento
    const [orden, setOrden] = useState<{ columna: keyof Alumno | '', ascendente: boolean }>({ columna: '', ascendente: true });

    // Estados del Formulario
    const [mostrarForm, setMostrarForm] = useState(false);
    const [luEnEdicion, setLuEnEdicion] = useState<string | null>(null);
    const [formData, setFormData] = useState({ lu: '', nombres: '', apellido: '', carrera_id: '', email: '' });
    const [carreras, setCarreras] = useState<Carrera[]>([]);
    const [guardando, setGuardando] = useState(false);
    
    const formRef = useRef<HTMLDivElement>(null);
    const inputLuRef = useRef<HTMLInputElement>(null);
    const inputNombresRef = useRef<HTMLInputElement>(null);

    const navigate = useNavigate();
    const { mostrarToast } = useToast();
    
    // Estado para el modal de eliminación
    const [modalEliminar, setModalEliminar] = useState({ abierto: false, lu: '' });

    useEffect(() => {
        api.get('/api/v0/carreras').then(data => setCarreras(data)).catch(() => {});

        const cargarAlumnos = async () => {
            setCargando(true);
            try {
                const url = `/api/alumnos?pagina=${pagina}&limite=10${busqueda ? `&busqueda=${encodeURIComponent(busqueda)}` : ''}`;
                const data = await api.get(url);
                
                if (data.estado === "exito") {
                    setAlumnos(data.datos);
                    setPaginacionInfo({ totalPaginas: data.paginacion.totalPaginas, total: data.paginacion.total });
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
            await api.post('/api/v0/tramite-titulo', { lu });
            mostrarToast('Trámite iniciado con éxito.', 'exito');
            setRecargar(prev => prev + 1);
        } catch (e: any) { mostrarToast(e.message || 'Error al iniciar el trámite.', 'error'); }
    };

    // Prepara la eliminación (Abre el modal)
    const pedirConfirmacionBorrado = (lu: string) => {
        setModalEliminar({ abierto: true, lu });
    };

    // Ejecuta la eliminación real tras confirmar en el modal
    const confirmarBorrado = async () => {
        setModalEliminar({ abierto: false, lu: '' }); // Cerramos el modal
        try {
            const partes = modalEliminar.lu.split('/');
            const data = await api.delete(`/api/alumnos/${partes[0]}/${partes[1]}`);
            mostrarToast(data.mensaje || 'Alumno eliminado correctamente.', 'exito');
            setRecargar(prev => prev + 1); 
        } catch (e: any) { mostrarToast(e.message || 'Error al intentar borrar.', 'error'); }
    };

    // --- FUNCIONES DEL FORMULARIO ---
    const abrirFormCreacion = () => {
        setFormData({ lu: '', nombres: '', apellido: '', carrera_id: '', email: '' });
        setLuEnEdicion(null);
        setMostrarForm(true);
        setTimeout(() => {
            formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            inputLuRef.current?.focus(); // <-- Hacemos focus en el campo LU al crear
        }, 50);
    };

    const abrirFormEdicion = (alumno: Alumno) => {
        setFormData({ lu: alumno.lu, nombres: alumno.nombres, apellido: alumno.apellido, carrera_id: alumno.carrera_id?.toString() || '', email: '' });
        setLuEnEdicion(alumno.lu);
        setMostrarForm(true);
        setTimeout(() => {
            formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            inputNombresRef.current?.focus(); // <-- Hacemos focus en Nombres porque el LU está bloqueado
        }, 50);
    };

    const guardarAlumno = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setGuardando(true);

        try {
            const url = luEnEdicion ? `/api/alumnos/${luEnEdicion.split('/')[0]}/${luEnEdicion.split('/')[1]}` : '/api/alumno';
            
            const body = {
                lu: luEnEdicion ? luEnEdicion : formData.lu,
                nombres: formData.nombres,
                apellido: formData.apellido,
                carrera_id: Number(formData.carrera_id),
                email: formData.email ? formData.email : undefined // Enviamos el email solo si el usuario escribió algo
            };

            const data = luEnEdicion ? await api.put(url, body) : await api.post(url, body);

            mostrarToast(data.mensaje || 'Alumno guardado exitosamente.', 'exito');
            setMostrarForm(false); 
            setRecargar(prev => prev + 1);
        } catch (error: any) {
            mostrarToast(error.message || 'Error al guardar.', 'error');
        } finally {
            setGuardando(false);
        }
    };

    return (

            <div className="contenedor-ancho">
                <div className="cabecera-pagina">
                    <h1><Users size="1em" /> Directorio de Alumnos</h1>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'stretch', justifyContent: 'flex-end', flex: 1 }}>
                        <div className="input-con-icono" style={{ flex: 1, minWidth: '120px', maxWidth: '200px' }}>
                            <MagnifyingGlass size="1.2rem" style={{ position: 'absolute', left: '14px', color: '#94a3b8' }} />
                            <input 
                                type="text" 
                                id="inputBusqueda"
                                className="buscador" 
                                placeholder="Buscar..." 
                                value={busqueda}
                                onChange={(e) => {
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
                                                    <button className="btn-mini borrar" onClick={() => pedirConfirmacionBorrado(alumno.lu)} title="Borrar Alumno"><Trash size="1em" /></button>
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
                                <div className="grupo-form" style={{ gridColumn: '1 / -1' }}>
                                    <label>Correo Electrónico (Opcional):</label> 
                                    <input 
                                        type="email" 
                                        value={formData.email} 
                                        onChange={e => setFormData({...formData, email: e.target.value})} 
                                        placeholder="alumno@ejemplo.com" 
                                        disabled={!!luEnEdicion}
                                        title={luEnEdicion ? "El correo solo se puede asignar al registrar un alumno nuevo." : ""}
                                    />
                                    <p style={{ margin: '5px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>Si se ingresa un correo, se enviará automáticamente un link de activación.</p>
                                </div>
                            </div>
                            
                            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'stretch', gap: '12px', marginTop: '25px' }}>
                                <button type="button" className="btn-cancelar" onClick={() => setMostrarForm(false)} style={{ fontSize: '1.1rem', padding: '14px 18px', whiteSpace: 'nowrap' }}>Cancelar</button>
                                <button type="submit" className="btn-accion-principal" disabled={guardando} style={{ width: 'auto', marginTop: 0, padding: '14px 18px', whiteSpace: 'nowrap' }}>
                                    {guardando ? <Spinner className="icono-cargando" size="1em" /> : <FloppyDisk size="1em" />} Guardar Datos
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* MODAL FLOTANTE DE CONFIRMACIÓN */}
                <ConfirmModal 
                    isOpen={modalEliminar.abierto} 
                    titulo="Eliminar Alumno" 
                    mensaje={`¿Está absolutamente seguro de que desea eliminar al alumno con LU ${modalEliminar.lu}? Esta acción borrará todas sus calificaciones y no se puede deshacer.`} 
                    textoConfirmar="Sí, Eliminar"
                    onConfirm={confirmarBorrado} 
                    onCancel={() => setModalEliminar({ abierto: false, lu: '' })} 
                />
            </div>

    );
}
