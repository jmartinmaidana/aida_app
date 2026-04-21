import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { api } from '../utils/api';

export function ProtectedRoute() {
    const [autenticado, setAutenticado] = useState<boolean | null>(null);

    useEffect(() => {
        const verificarSesion = async () => {
            try {
                await api.get('/api/v0/auth/verificar');
                setAutenticado(true);
            } catch (error) {
                setAutenticado(false);
            }
        };
        verificarSesion();
    }, []);

    if (autenticado === null) return null; // Pantalla en blanco milimétrica mientras verifica

    if (!autenticado) {
        // El atributo "replace" hace exactamente lo mismo que window.location.replace()
        return <Navigate to="/login" replace />;
    }

    return <Outlet />; // Si está todo bien, dibuja la página que el usuario pidió
}