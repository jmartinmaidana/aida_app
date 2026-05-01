import { Link } from 'react-router-dom';
import { Users, Books, PencilLine, Certificate, Files, UploadSimple } from '@phosphor-icons/react';

export function Menu() {
    const rol = localStorage.getItem('usuarioRol') || 'ADMIN';
    const lu = localStorage.getItem('usuarioLu') || '';

    return (
            <div className="contenedor">
                <div className="header-seccion">
                    <h2>{rol === 'ADMIN' ? 'Panel de Administración' : 'Panel del Alumno'}</h2>
                    <p>{rol === 'ADMIN' ? 'Seleccione el módulo operativo para comenzar:' : 'Bienvenido a tu portal académico. Selecciona una opción:'}</p>
                </div>
                
                <div className="grid-menu">
                    {rol === 'ADMIN' && (
                        <>
                        <Link to="/app/alumnos" style={{ textDecoration: 'none' }}>
                        <div className="tarjeta-menu">
                            <div className="icono-contenedor"><Users /></div>
                            <h3>Tabla de Alumnos</h3>
                            <p>Altas, bajas, modificaciones y consultas del padrón.</p>
                        </div>
                    </Link>
                    
                    <Link to="/app/planes" style={{ textDecoration: 'none' }}>
                        <div className="tarjeta-menu">
                            <div className="icono-contenedor"><Books /></div>
                            <h3>Planes de Estudio</h3>
                            <p>Visualizar las materias correspondientes a cada carrera.</p>
                        </div>
                    </Link>
                    
                    <Link to="/app/cursada" style={{ textDecoration: 'none' }}>
                        <div className="tarjeta-menu">
                            <div className="icono-contenedor"><PencilLine /></div>
                            <h3>Cargar Notas</h3>
                            <p>Registrar aprobaciones de cursadas en el sistema.</p>
                        </div>
                    </Link>
                    
                    <Link to="/app/certificados_lu" style={{ textDecoration: 'none' }}>
                        <div className="tarjeta-menu">
                            <div className="icono-contenedor"><Certificate /></div>
                            <h3>Emisión Individual</h3>
                            <p>Generar constancias de título por Libreta Universitaria.</p>
                        </div>
                    </Link>
            
                    <Link to="/app/certificados_fecha" style={{ textDecoration: 'none' }}>
                        <div className="tarjeta-menu">
                            <div className="icono-contenedor">
                                <Files />
                            </div>
                            <h3>Emisión Masiva por fecha</h3>
                            <p>Generación de lotes por fecha de egreso registrada.</p>
                        </div>
                    </Link>
                    
                    <Link to="/app/carga_csv" style={{ textDecoration: 'none'}}>
                        <div className="tarjeta-menu">
                            <div className="icono-contenedor"> 
                                <UploadSimple />
                            </div>
                            <h3>Carga Masiva (CSV)</h3>
                            <p>Importar nuevos inscriptos mediante archivo delimitado.</p>
                        </div>
                    </Link>
                        </>
                    )}

                    {rol === 'ALUMNO' && (
                        <Link to={`/app/historial?lu=${encodeURIComponent(lu)}`} style={{ textDecoration: 'none' }}>
                            <div className="tarjeta-menu">
                                <div className="icono-contenedor"><Certificate /></div>
                                <h3>Mi Historial Académico</h3>
                                <p>Visualiza tus notas, promedio y progreso de carrera.</p>
                            </div>
                        </Link>
                    )}
                </div>
            </div>
    );
}