import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Key, LockKey, CheckCircle, Spinner } from '@phosphor-icons/react';
import { useToast } from '../context/ToastContext';

export function ActivarCuenta() {
    const [token, setToken] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const [confirmPassword, setConfirmPassword] = useState<string>('');
    const [cargando, setCargando] = useState<boolean>(false);
    
    const navigate = useNavigate();
    const { mostrarToast } = useToast();

    const manejarEnvio = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault(); 

        // 1. Validaciones del lado del cliente (Frontend)
        if (password !== confirmPassword) {
            mostrarToast('Las contraseñas no coinciden. Por favor, verifícalas.', 'error');
            return;
        }

        if (password.length < 6) {
            mostrarToast('La contraseña debe tener al menos 6 caracteres.', 'error');
            return;
        }

        // 2. Petición a nuestra API
        setCargando(true);
        try {
            const response = await fetch('/api/v0/auth/activar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, password }),
            });

            const data = await response.json();

            if (!response.ok || data.estado === 'error') {
                mostrarToast(data.mensaje || 'Ocurrió un error al intentar activar la cuenta.', 'error');
                setCargando(false);
            } else {
                mostrarToast('¡Cuenta activada con éxito! Redirigiendo al inicio de sesión...', 'exito');
                // Esperamos 3 segundos para que el usuario lea el mensaje y lo redirigimos
                setTimeout(() => navigate('/login'), 3000);
            }
        } catch (err) {
            mostrarToast('Error de conexión con el servidor. Inténtalo más tarde.', 'error');
            setCargando(false); 
        }
    };

    return (
        <div className="login-wrapper">
            <div className="tarjeta-login">
                <div className="cabecera-login">
                    <h1><Key size={32} /> Activar Cuenta</h1>
                    <p>Ingresa el código de 6 dígitos que recibiste por correo para establecer tu contraseña.</p>
                </div>
                
                <form onSubmit={manejarEnvio}>
                    <div className="grupo-form">
                        <label>Código de Activación</label>
                        <div className="input-con-icono">
                            <Key size={20} style={{ position: 'absolute', left: '14px', color: '#94a3b8' }} />
                            <input 
                                type="text" 
                                maxLength={6}
                                value={token} 
                                onChange={(e) => setToken(e.target.value)} 
                                placeholder="Ej: 123456" 
                                required 
                                style={{ letterSpacing: '2px', fontWeight: 'bold' }}
                            />
                        </div>
                    </div>
                    
                    <div className="grupo-form">
                        <label>Nueva Contraseña</label>
                        <div className="input-con-icono">
                            <LockKey size={20} style={{ position: 'absolute', left: '14px', color: '#94a3b8' }} />
                            <input type="password" placeholder="Mínimo 6 caracteres" value={password} onChange={(e) => setPassword(e.target.value)} required />
                        </div>
                    </div>
                    
                    <div className="grupo-form">
                        <label>Confirmar Contraseña</label>
                        <div className="input-con-icono">
                            <LockKey size={20} style={{ position: 'absolute', left: '14px', color: '#94a3b8' }} />
                            <input type="password" placeholder="Repite la contraseña" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
                        </div>
                    </div>

                    <button type="submit" className="btn-ingresar" disabled={cargando}>
                        {cargando ? <><Spinner size={20} className="icono-cargando" /> Activando...</> : <>Activar Cuenta <CheckCircle size={20} /></>}
                    </button>
                </form>
            </div>
        </div>
    );
}
