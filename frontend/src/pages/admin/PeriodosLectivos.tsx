import { useState, useEffect, useMemo } from 'react';
import { useToast } from '../../context/ToastContext';
import { Spinner, Book, Users, CalendarBlank, CheckCircle, Lock, PlusCircle, FloppyDisk, CaretDown, CaretUp, Clock, Buildings, Trash } from '@phosphor-icons/react';
import { api } from '../../utils/api';
import type { Materia } from '../../types/index';
import { ConfirmModal } from '../../components/ConfirmModal';

// 1. DEFINIMOS LOS TIPOS DE DATOS (Buena práctica de TypeScript)
// Representa una fila exacta que devuelve la API (cruce entre materias_por_periodo y periodos_lectivos)
interface MateriaPorPeriodo {
    id: number;
    materia_id: number;
    materia: string;
    anio: number;
    cuatrimestre: number;
    fecha_inicio: string | null;
    fecha_fin: string | null;
    fecha_inicio_inscripcion: string | null;
    fecha_fin_inscripcion: string | null;
    estado_periodo: 'PLANIFICACION' | 'INSCRIPCIONES_ABIERTAS' | 'CURSANDO' | 'CERRADO';
    inscritos: string; // Viene como string desde la BD (COUNT)
}

// Representa el período lectivo como entidad principal, con sus materias anidadas
interface PeriodoLectivo {
    anio: number;
    cuatrimestre: number;
    fecha_inicio: string | null;
    fecha_fin: string | null;
    fecha_inicio_inscripcion: string | null;
    fecha_fin_inscripcion: string | null;
    estado: MateriaPorPeriodo['estado_periodo'];
    materias: {
        id: number;
        materia_id: number;
        nombre: string;
        carreras: string;
        inscritos: number;
    }[];
}

export function GestionPeriodoLectivo() {
    // 2. ESTADO DEL COMPONENTE
    const [materiasPeriodo, setMateriasPeriodo] = useState<MateriaPorPeriodo[]>([]);
    const [cargando, setCargando] = useState(true);
    const { mostrarToast } = useToast();

    // Estados para el modal de planificación
    const [mostrarModal, setMostrarModal] = useState(false);
    const [modoModal, setModoModal] = useState<'nuevo_periodo' | 'agregar_materia' | 'editar_fechas'>('nuevo_periodo');
    const [formPlanificar, setFormPlanificar] = useState({ 
        anio: new Date().getFullYear(), 
        cuatrimestre: 1, 
        materia_id: '',
        fecha_inicio: '',
        fecha_fin: '',
        fecha_inicio_inscripcion: '',
        fecha_fin_inscripcion: ''
    });
    const [guardando, setGuardando] = useState(false);
    const [listaMaterias, setListaMaterias] = useState<Materia[]>([]);
    const [mapaCarreras, setMapaCarreras] = useState<Record<number, string>>({});
    const [expandidos, setExpandidos] = useState<Record<string, boolean>>({});

    // Estado para el modal de eliminación
    const [modalEliminar, setModalEliminar] = useState<{ abierto: boolean, idMpp: number | null }>({ abierto: false, idMpp: null });

    // 3. EFECTO PARA CARGAR DATOS (Se ejecuta una sola vez al entrar a la pantalla)
    const cargarMaterias = async () => {
        try {
            const data = await api.get('/api/inscripciones/admin/periodos_lectivos');
            setMateriasPeriodo(data.datos || data);
        } catch (error: any) {
            mostrarToast(error.message || 'Error al cargar los períodos lectivos', 'error');
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => {
        cargarMaterias();

        // Cargamos todas las materias extrayéndolas de los planes de estudio
        api.get('/api/v0/planes-estudio').then((data: any) => {
            const planes = data.datos || data;
            
            const mCarreras: Record<number, string[]> = {};
            const materiasMap = new Map();
            
            planes.forEach((plan: any) => {
                if (plan.materias) {
                    plan.materias.forEach((m: Materia) => {
                        materiasMap.set(m.id, m);
                        if (!mCarreras[m.id]) mCarreras[m.id] = [];
                        mCarreras[m.id].push(plan.nombre); // Vinculamos la carrera a la materia
                    });
                }
            });
            
            const materiasUnicas = Array.from(materiasMap.values()).sort((a: any, b: any) => a.nombre.localeCompare(b.nombre));
            setListaMaterias(materiasUnicas as Materia[]);
            
            // Preparamos un diccionario fácil de leer { ID: 'Carrera 1 / Carrera 2' }
            const cMap: Record<number, string> = {};
            Object.keys(mCarreras).forEach(k => cMap[parseInt(k)] = mCarreras[parseInt(k)].join(' / '));
            setMapaCarreras(cMap);
        }).catch(() => console.error("Error al cargar lista de materias."));
    }, []);

    // 4. LÓGICA DE AGRUPACIÓN (useMemo para optimizar y no recalcular en cada render)
    const periodosAgrupados = useMemo(() => {
        const grupos: { [key: string]: PeriodoLectivo } = {};

        materiasPeriodo.forEach(item => {
            const key = `${item.anio}-${item.cuatrimestre}`;
            if (!grupos[key]) {
                grupos[key] = {
                    anio: item.anio,
                    cuatrimestre: item.cuatrimestre,
                    fecha_inicio: item.fecha_inicio,
                    fecha_fin: item.fecha_fin,
                    fecha_inicio_inscripcion: item.fecha_inicio_inscripcion,
                    fecha_fin_inscripcion: item.fecha_fin_inscripcion,
                    estado: item.estado_periodo,
                    materias: []
                };
            }
            if (item.materia_id) { // Solo insertamos la materia si el periodo no está vacío
                grupos[key].materias.push({
                    id: item.id,
                    materia_id: item.materia_id,
                    nombre: item.materia,
                    inscritos: parseInt(item.inscritos || '0', 10),
                    carreras: mapaCarreras[item.materia_id] || 'Varias / Sin asignar'
                });
            }
        });

        return Object.values(grupos);
    }, [materiasPeriodo, mapaCarreras]);

    // Función para manejar el acordeón visual
    const toggleExpandir = (key: string) => {
        setExpandidos(prev => ({ ...prev, [key]: !prev[key] }));
    };

    // 5. FUNCIONES DE ACCIÓN (Llaman a la API para cambiar estados)
    const handleCambiarEstado = async (anio: number, cuatrimestre: number, accion: 'abrir' | 'cerrar') => {
        try {
            const data = await api.post(`/api/inscripciones/${accion}`, { anio, cuatrimestre });
            mostrarToast(data.mensaje || `El período ${anio}-${cuatrimestre} ha sido actualizado.`, 'exito');
            await cargarMaterias(); // Recargamos los datos para ver el cambio

        } catch (error: any) {
            mostrarToast(error.message, 'error');
        }
    };

    // Función para enviar el formulario del modal
    const handlePlanificarSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setGuardando(true);
        try {
            const endpoint = (modoModal === 'nuevo_periodo' || modoModal === 'editar_fechas') ? '/api/inscripciones/periodo' : '/api/inscripciones/planificar';
            const bodyData = (modoModal === 'nuevo_periodo' || modoModal === 'editar_fechas')
                ? { 
                    anio: formPlanificar.anio, 
                    cuatrimestre: formPlanificar.cuatrimestre,
                    fecha_inicio: formPlanificar.fecha_inicio || undefined,
                    fecha_fin: formPlanificar.fecha_fin || undefined,
                    fecha_inicio_inscripcion: formPlanificar.fecha_inicio_inscripcion || undefined,
                    fecha_fin_inscripcion: formPlanificar.fecha_fin_inscripcion || undefined
                  } 
                : {
                    anio: formPlanificar.anio,
                    cuatrimestre: formPlanificar.cuatrimestre,
                    materia_id: formPlanificar.materia_id
                  };
            
            const data = await api.post(endpoint, bodyData);
            mostrarToast(data.mensaje || (modoModal === 'agregar_materia' ? 'Materia agregada exitosamente.' : 'Fechas guardadas.'), 'exito');
            setMostrarModal(false);
            setFormPlanificar({ 
                ...formPlanificar, 
                materia_id: '', 
                fecha_inicio: '', 
                fecha_fin: '', 
                fecha_inicio_inscripcion: '', 
                fecha_fin_inscripcion: '' 
            });
            await cargarMaterias(); // Recargar la tabla automáticamente
        } catch (error: any) {
            mostrarToast(error.message, 'error');
        } finally {
            setGuardando(false);
        }
    };

    // Prepara la eliminación (Abre el modal)
    const pedirConfirmacionBorrado = (idMpp: number) => {
        setModalEliminar({ abierto: true, idMpp });
    };

    // Ejecuta la eliminación real tras confirmar en el modal
    const confirmarBorrado = async () => {
        if (modalEliminar.idMpp === null) return;
        const idMpp = modalEliminar.idMpp;
        setModalEliminar({ abierto: false, idMpp: null }); // Cerramos el modal

        try {
            const data = await api.delete(`/api/inscripciones/planificar/${idMpp}`);
            mostrarToast(data.mensaje || 'Materia eliminada exitosamente.', 'exito');
            await cargarMaterias();
        } catch (error: any) {
            mostrarToast(error.message, 'error');
        }
    };

    // 6. RENDERIZADO (El HTML que se dibuja)
    if (cargando) {
        return <div className="flex justify-center items-center h-64"><Spinner size={32} className="animate-spin" /></div>;
    }

    return (
        <div className="contenedor-ancho">
            <div className="cabecera-pagina">
                <h1><CalendarBlank size="1em" /> Gestión de Períodos Lectivos</h1>
                <button onClick={() => {
                    setModoModal('nuevo_periodo');
                    setFormPlanificar({ 
                        anio: new Date().getFullYear(), 
                        cuatrimestre: 1, 
                        materia_id: '',
                        fecha_inicio: '',
                        fecha_fin: '',
                        fecha_inicio_inscripcion: '',
                        fecha_fin_inscripcion: ''
                    });
                    setMostrarModal(true);
                }} className="btn-accion-principal" style={{ width: 'auto', margin: 0, padding: '10px 14px' }}>
                    <PlusCircle size="1.2em" style={{ marginRight: '6px' }} />
                    Nuevo Período
                </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {periodosAgrupados.map(periodo => {
                    const key = `${periodo.anio}-${periodo.cuatrimestre}`;
                    const isExpanded = expandidos[key] !== false; // Abierto por defecto

                    return (
                    <div key={key} className="tarjeta-form" style={{ padding: 0, overflow: 'hidden' }}>
                        
                        {/* CABECERA DESPLEGABLE */}
                        <div 
                            style={{ padding: '20px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: isExpanded ? '#f8fafc' : 'white', borderBottom: isExpanded ? '2px solid #e2e8f0' : 'none' }}
                            onClick={() => toggleExpandir(key)}
                        >
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <h2 style={{ margin: 0, color: '#0f172a', fontSize: '1.25rem', display: 'flex', alignItems: 'center' }}>
                                    {isExpanded ? <CaretUp size="1.2em" style={{ marginRight: '10px', color: '#64748b' }}/> : <CaretDown size="1.2em" style={{ marginRight: '10px', color: '#64748b' }}/>}
                                    <CalendarBlank size="1.2em" style={{ marginRight: '8px', color: '#0284c7' }} /> 
                                    Período {periodo.anio}-{periodo.cuatrimestre}
                                </h2>
                            </div>
                            <span style={{ 
                                backgroundColor: periodo.estado === 'PLANIFICACION' ? '#f1f5f9' : periodo.estado === 'INSCRIPCIONES_ABIERTAS' ? '#dcfce7' : periodo.estado === 'CURSANDO' ? '#e0f2fe' : '#fee2e2',
                                color: periodo.estado === 'PLANIFICACION' ? '#475569' : periodo.estado === 'INSCRIPCIONES_ABIERTAS' ? '#166534' : periodo.estado === 'CURSANDO' ? '#0369a1' : '#991b1b',
                                padding: '6px 14px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold'
                            }}>
                                {periodo.estado.replace('_', ' ')}
                            </span>
                        </div>

                        {/* CONTENIDO DE LA TABLA (Oculto si se contrae) */}
                        {isExpanded && (
                            <div style={{ padding: '20px' }}>
                                <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', gap: '30px', fontSize: '0.95rem', color: '#475569' }}>
                                    <span><strong style={{ color: '#0f172a' }}>Inscripciones:</strong> {periodo.fecha_inicio_inscripcion ? new Date(periodo.fecha_inicio_inscripcion).toLocaleDateString('es-AR', {timeZone: 'UTC'}) : 'A definir'} al {periodo.fecha_fin_inscripcion ? new Date(periodo.fecha_fin_inscripcion).toLocaleDateString('es-AR', {timeZone: 'UTC'}) : 'A definir'}</span>
                                    <span><strong style={{ color: '#0f172a' }}>Cursada:</strong> {periodo.fecha_inicio ? new Date(periodo.fecha_inicio).toLocaleDateString('es-AR', {timeZone: 'UTC'}) : 'A definir'} al {periodo.fecha_fin ? new Date(periodo.fecha_fin).toLocaleDateString('es-AR', {timeZone: 'UTC'}) : 'A definir'}</span>
                                </div>
                                <div className="contenedor-tabla">
                                    <div className="contenedor-scroll">
                                        <table>
                                            <thead>
                                                <tr>
                                                    <th><Book size="1.1em" style={{ verticalAlign: 'text-bottom', marginRight: '5px' }} /> Materia</th>
                                                    <th><Buildings size="1.1em" style={{ verticalAlign: 'text-bottom', marginRight: '5px' }} /> Carrera</th>
                                                    <th style={{ textAlign: 'center' }}><Clock size="1.1em" style={{ verticalAlign: 'text-bottom', marginRight: '5px' }} /> Horarios (A definir)</th>
                                                    <th style={{ width: '150px', textAlign: 'center' }}><Users size="1.1em" style={{ verticalAlign: 'text-bottom', marginRight: '5px' }} /> Inscritos</th>
                                                    {periodo.estado === 'PLANIFICACION' && <th style={{ width: '80px', textAlign: 'center' }}>Acciones</th>}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {periodo.materias.map(materia => (
                                                    <tr key={materia.id}>
                                                        <td>
                                                            <strong>{materia.nombre}</strong> 
                                                            <span style={{ color: '#64748b', fontSize: '0.85rem', marginLeft: '8px' }}>(COD: {materia.materia_id})</span>
                                                        </td>
                                                        <td style={{ color: '#475569', fontSize: '0.9rem' }}>{materia.carreras}</td>
                                                        <td style={{ textAlign: 'center', color: '#94a3b8', fontStyle: 'italic', fontSize: '0.9rem' }}>-</td>
                                                        <td style={{ textAlign: 'center', fontWeight: 'bold', color: '#0f172a' }}>{materia.inscritos}</td>
                                                        {periodo.estado === 'PLANIFICACION' && (
                                                            <td style={{ textAlign: 'center' }}>
                                                                <button type="button" onClick={() => pedirConfirmacionBorrado(materia.id)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', padding: '5px' }} title="Eliminar materia">
                                                                    <Trash size="1.4em" />
                                                                </button>
                                                            </td>
                                                        )}
                                                    </tr>
                                                ))}
                                                {periodo.materias.length === 0 && (
                                                    <tr><td colSpan={4} style={{ textAlign: 'center', color: '#64748b', padding: '30px' }}>No hay materias planificadas en este período.</td></tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px', gap: '10px' }}>
                                    {periodo.estado === 'PLANIFICACION' && (
                                        <button 
                                            onClick={() => {
                                                setModoModal('editar_fechas');
                                                setFormPlanificar({ 
                                                    anio: periodo.anio, 
                                                    cuatrimestre: periodo.cuatrimestre, 
                                                    materia_id: '',
                                                    fecha_inicio: periodo.fecha_inicio ? periodo.fecha_inicio.split('T')[0] : '',
                                                    fecha_fin: periodo.fecha_fin ? periodo.fecha_fin.split('T')[0] : '',
                                                    fecha_inicio_inscripcion: periodo.fecha_inicio_inscripcion ? periodo.fecha_inicio_inscripcion.split('T')[0] : '',
                                                    fecha_fin_inscripcion: periodo.fecha_fin_inscripcion ? periodo.fecha_fin_inscripcion.split('T')[0] : ''
                                                });
                                                setMostrarModal(true);
                                            }} 
                                            className="btn-seleccionar" 
                                            style={{ width: 'auto', margin: 0, padding: '8px 15px', fontSize: '0.95rem', color: '#475569', borderColor: '#cbd5e1' }}
                                        >
                                            <CalendarBlank size="1.2em" style={{ marginRight: '5px' }} /> Editar Fechas
                                        </button>
                                    )}
                                    {periodo.estado === 'PLANIFICACION' && (
                                        <button 
                                            onClick={() => {
                                                setModoModal('agregar_materia');
                                                setFormPlanificar({ 
                                                    anio: periodo.anio, 
                                                    cuatrimestre: periodo.cuatrimestre, 
                                                    materia_id: '',
                                                    fecha_inicio: '',
                                                    fecha_fin: '',
                                                    fecha_inicio_inscripcion: '',
                                                    fecha_fin_inscripcion: ''
                                                });
                                                setMostrarModal(true);
                                            }} 
                                            className="btn-seleccionar" 
                                            style={{ width: 'auto', margin: 0, padding: '8px 15px', fontSize: '0.95rem' }}
                                        >
                                            <PlusCircle size="1.2em" /> Agregar Materia
                                        </button>
                                    )}
                                    {periodo.estado === 'PLANIFICACION' && <button onClick={() => handleCambiarEstado(periodo.anio, periodo.cuatrimestre, 'abrir')} className="btn-accion-principal" style={{ width: 'auto', margin: 0, padding: '8px 15px', backgroundColor: '#10b981' }}><CheckCircle size="1.2em" style={{ marginRight: '5px' }} /> Abrir Inscripciones</button>}
                                    {periodo.estado === 'INSCRIPCIONES_ABIERTAS' && <button onClick={() => handleCambiarEstado(periodo.anio, periodo.cuatrimestre, 'cerrar')} className="btn-accion-principal" style={{ width: 'auto', margin: 0, padding: '8px 15px', backgroundColor: '#ef4444' }}><Lock size="1.2em" style={{ marginRight: '5px' }} /> Cerrar Inscripciones</button>}
                                </div>
                            </div>
                        )}
                    </div>
                )})}
            </div>

            {/* MODAL PARA PLANIFICAR MATERIA */}
            {mostrarModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h3>
                                {modoModal === 'nuevo_periodo' && 'Crear Nuevo Período'}
                                {modoModal === 'editar_fechas' && `Editar Fechas del ${formPlanificar.cuatrimestre}º Cuat. ${formPlanificar.anio}`}
                                {modoModal === 'agregar_materia' && `Agregar Materia al ${formPlanificar.cuatrimestre}º Cuat. ${formPlanificar.anio}`}
                            </h3>
                        </div>
                        <form onSubmit={handlePlanificarSubmit}>
                            {(modoModal === 'nuevo_periodo' || modoModal === 'editar_fechas') && (
                                <>
                                    <div className="fila-doble" style={{ marginBottom: '15px' }}>
                                    <div className="grupo-form" style={{ marginBottom: 0 }}>
                                        <label>Año:</label>
                                        <input type="number" required min="2020" disabled={modoModal === 'editar_fechas'} value={formPlanificar.anio} onChange={e => setFormPlanificar({...formPlanificar, anio: parseInt(e.target.value)})} />
                                    </div>
                                    <div className="grupo-form" style={{ marginBottom: 0 }}>
                                        <label>Cuatrimestre:</label>
                                        <select required disabled={modoModal === 'editar_fechas'} value={formPlanificar.cuatrimestre} onChange={e => setFormPlanificar({...formPlanificar, cuatrimestre: parseInt(e.target.value)})}>
                                            <option value={1}>1º</option>
                                            <option value={2}>2º</option>
                                        </select>
                                    </div>
                                    </div>
                                    <div className="fila-doble" style={{ marginBottom: '15px' }}>
                                        <div className="grupo-form" style={{ marginBottom: 0 }}>
                                            <label>Inicio Inscripciones:</label>
                                            <input type="date" value={formPlanificar.fecha_inicio_inscripcion} onChange={e => setFormPlanificar({...formPlanificar, fecha_inicio_inscripcion: e.target.value})} />
                                        </div>
                                        <div className="grupo-form" style={{ marginBottom: 0 }}>
                                            <label>Fin Inscripciones:</label>
                                            <input type="date" value={formPlanificar.fecha_fin_inscripcion} onChange={e => setFormPlanificar({...formPlanificar, fecha_fin_inscripcion: e.target.value})} />
                                        </div>
                                    </div>
                                    <div className="fila-doble" style={{ marginBottom: '25px' }}>
                                        <div className="grupo-form" style={{ marginBottom: 0 }}>
                                            <label>Inicio Cursada:</label>
                                            <input type="date" value={formPlanificar.fecha_inicio} onChange={e => setFormPlanificar({...formPlanificar, fecha_inicio: e.target.value})} />
                                        </div>
                                        <div className="grupo-form" style={{ marginBottom: 0 }}>
                                            <label>Fin Cursada:</label>
                                            <input type="date" value={formPlanificar.fecha_fin} onChange={e => setFormPlanificar({...formPlanificar, fecha_fin: e.target.value})} />
                                        </div>
                                    </div>
                                </>
                            )}
                            {modoModal === 'agregar_materia' && (
                                <div className="grupo-form" style={{ marginBottom: '25px' }}>
                                    <label>Materia a Ofertar:</label>
                                    <select required value={formPlanificar.materia_id} onChange={e => setFormPlanificar({...formPlanificar, materia_id: e.target.value})}>
                                        <option value="">-- Seleccione una materia --</option>
                                        {listaMaterias.map(m => (
                                            <option key={m.id} value={m.id}>{m.nombre}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            
                            <div className="modal-actions">
                                <button type="button" className="btn-cancelar" onClick={() => setMostrarModal(false)} style={{ margin: 0 }}>Cancelar</button>
                                <button type="submit" className="btn-accion-principal" disabled={guardando} style={{ width: 'auto', margin: 0 }}>
                                    {guardando ? <Spinner className="icono-cargando" size="1.2em" /> : <FloppyDisk size="1.2em" style={{ marginRight: '6px' }} />}
                                    {modoModal === 'agregar_materia' ? 'Guardar Materia' : 'Guardar Fechas'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL FLOTANTE DE CONFIRMACIÓN */}
            <ConfirmModal 
                isOpen={modalEliminar.abierto} 
                titulo="Eliminar Materia" 
                mensaje="¿Está absolutamente seguro de que desea eliminar esta materia de la planificación? Los alumnos ya no podrán inscribirse a ella." 
                textoConfirmar="Sí, Eliminar"
                onConfirm={confirmarBorrado} 
                onCancel={() => setModalEliminar({ abierto: false, idMpp: null })} 
            />
        </div>
    );
}