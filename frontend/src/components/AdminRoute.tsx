import { Navigate, Outlet } from 'react-router-dom';

export function AdminRoute() {
    const rol = localStorage.getItem('usuarioRol');
    
    if (rol !== 'ADMIN') {
        return <Navigate to="/menu" replace />;
    }
    
    return <Outlet />;
}
