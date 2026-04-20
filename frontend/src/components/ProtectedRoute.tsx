import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';

export function ProtectedRoute() {
    const [autenticado, setAutenticado] = useState<boolean | null>(null);

    useEffect(() => {
        const verificarSesion = async () => {
            try {
                // Replicamos la misma llamada de tu archivo seguridad.js original
                const res = await fetch('/api/v0/auth/verificar');
                if (res.ok) {
                    setAutenticado(true);
                } else {
                    setAutenticado(false);
                }
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