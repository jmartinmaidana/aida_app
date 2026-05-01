import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, User, LockKey, SignIn, Spinner, Eye, EyeClosed } from '@phosphor-icons/react';
import { useToast } from '../context/ToastContext';

export function Login() {
    // 1. EL ESTADO: En lugar de leer el DOM al final, guardamos lo que el usuario escribe en tiempo real.
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false); // <-- Nuevo estado para el "ojito"
    const [cargando, setCargando] = useState(false); // <-- Nuevo estado
    
    const { mostrarToast } = useToast();

    // Herramienta de React Router para cambiar de pantalla
    const navigate = useNavigate();

    // 2. LA FUNCIÓN DE SUBMIT: Similar a tu Vanilla JS, pero integrada en el componente
    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setCargando(true);   // Encendemos la animación
        
        try {
            const respuesta = await fetch('/api/v0/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const datos = await respuesta.json();

            if (respuesta.ok) {
                // Guardamos el rol y el LU en el navegador para que React sepa quién es
                localStorage.setItem('usuarioRol', datos.usuario?.rol || datos.rol || 'ADMIN');
                localStorage.setItem('usuarioLu', datos.usuario?.lu_alumno || datos.lu_alumno || '');
                navigate('/menu'); // Si el login es exitoso, viajamos al menú
            } else {
                mostrarToast(datos.mensaje || 'Error al iniciar sesión', 'error');
            }
        } catch (error) {
            mostrarToast('Error de conexión con el servidor.', 'error');
        } finally {
            setCargando(false); // Apagamos la animación sin importar qué pase
        }
    };

    // 3. EL RENDER (JSX): Devolvemos el HTML. 
    // Notarás que usamos 'className' en lugar de 'class', y etiquetas <User /> para los íconos.
    return (
        <div className="login-wrapper">
            <div className="tarjeta-login">
                <div className="cabecera-login">
                    <h1><GraduationCap size={32} /> AIDA</h1>
                    <p>Acceso al sistema de gestión de alumnos</p>
                </div>
                
                <form onSubmit={handleSubmit}>
                    <div className="grupo-form">
                        <label htmlFor="username">Usuario</label>
                        <div className="input-con-icono">
                            <User size={20} style={{ position: 'absolute', left: '14px', color: '#94a3b8' }} />
                            <input type="text" id="username" placeholder="Ingrese su nombre de usuario" required
                                value={username} 
                                onChange={(e) => setUsername(e.target.value)} 
                            />
                        </div>
                    </div>
                    
                    <div className="grupo-form">
                        <label htmlFor="password">Contraseña</label>
                        <div className="input-con-icono">
                            <LockKey size={20} style={{ position: 'absolute', left: '14px', color: '#94a3b8' }} />
                            <input type={showPassword ? 'text' : 'password'} id="password" placeholder="Ingrese su contraseña" required
                                value={password} 
                                onChange={(e) => setPassword(e.target.value)} 
                            />
                            <button 
                                type="button" 
                                onClick={() => setShowPassword(!showPassword)}
                                className="btn-ojo-password"
                            >
                                {showPassword ? <EyeClosed size={20} /> : <Eye size={20} />}
                            </button>
                        </div>
                    </div>
                    
                    <button type="submit" className="btn-ingresar" disabled={cargando}>
                        {cargando ? 
                            <><Spinner size={20} className="icono-cargando" /> Iniciando...</> : 
                            <>Iniciar Sesión <SignIn size={20} /></>
                        }
                    </button>
                </form>
            </div>
        </div>
    );
}
