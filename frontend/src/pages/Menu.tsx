import { Link } from 'react-router-dom';
import { Users, Books, PencilLine, Certificate, Files, UploadSimple } from '@phosphor-icons/react';

export function Menu() {
    return (
            <div className="contenedor">
                <div className="header-seccion">
                    <h2>Panel de Administración</h2>
                    <p>Seleccione el módulo operativo para comenzar:</p>
                </div>
                
                <div className="grid-menu">
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
                    
                    {/* Puedes agregar aquí el resto de las tarjetas (Emisión Masiva y Carga CSV) de la misma forma */}
                    
                </div>
            </div>
    );
}