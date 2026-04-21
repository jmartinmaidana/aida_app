import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GraduationCap, SquaresFour, List, CaretDown, Users, Books, PencilLine, Certificate, Files, UploadSimple, SignOut } from '@phosphor-icons/react';
import { api } from '../utils/api';

export function Navbar() {
    // Estado para controlar si el menú desplegable está abierto o cerrado
    const [menuActivo, setMenuActivo] = useState(false);
    const navigate = useNavigate();
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const manejarClicFuera = (event: MouseEvent) => {
            // Si el menú existe y el elemento clickeado NO está dentro de él, lo cerramos
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setMenuActivo(false);
            }
        };

        document.addEventListener('mousedown', manejarClicFuera);
        return () => {
            document.removeEventListener('mousedown', manejarClicFuera); // Limpieza
        };
    }, []);

    // Función para cerrar sesión apuntando a tu API de Express
    const cerrarSesion = async () => {
        try {
            await api.post('/api/v0/auth/logout', {});
            navigate('/login');
        } catch (error) {
            alert("Error al intentar cerrar sesión.");
        }
    };

    return (
        <nav className="navbar">
            <Link to="/menu" className="navbar-brand" title="Volver al Inicio" style={{ textDecoration: 'none', color: 'white' }}>
                <GraduationCap /> Sistema AIDA
            </Link>
            
            <div className="navbar-links">
                <Link to="/menu"><SquaresFour /> Inicio</Link>
                
                {/* Al hacer clic, invertimos el estado actual (si era true pasa a false y viceversa) */}
                <div className={`dropdown ${menuActivo ? 'activo' : ''}`} ref={dropdownRef} onClick={() => setMenuActivo(!menuActivo)}>
                    <button className="dropbtn"><List /> Módulos <CaretDown /></button>
                    <div className="dropdown-content">
                        {/* Usamos 'Link' en lugar de 'a' para aprovechar el enrutador de React sin recargar */}
                        <Link to="/app/alumnos"><Users /> Alumnos</Link>
                        <Link to="/app/planes"><Books /> Planes de Estudio</Link>
                        <Link to="/app/cursada"><PencilLine /> Carga de Notas</Link>
                        <Link to="/app/certificados_lu"><Certificate /> Emisión Individual</Link>
                        <Link to="/app/certificados_fecha"><Files /> Emisión por Fecha</Link>
                        <Link to="/app/carga_csv"><UploadSimple /> Carga Múltiple (CSV)</Link>
                    </div>
                </div>
                
                <button onClick={cerrarSesion} className="btn-logout"><SignOut /> Salir</button>
            </div>
        </nav>
    );
}
