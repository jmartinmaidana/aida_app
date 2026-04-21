import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Login } from './pages/Login';
import { Menu } from './pages/Menu';
import { Alumnos } from './pages/Alumnos';
import { Cursada } from './pages/Cursada';
import { Planes } from './pages/Planes';
import { CertificadosLu } from './pages/CertificadosLu';
import { CertificadosFecha } from './pages/CertificadosFecha';
import { CargaCsv } from './pages/CargaCsv';
import { Historial } from './pages/Historial';
import { ToastProvider } from './context/ToastContext';

function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
        <Route path="/login" element={<Login />} />
        
        {/* Capa 1: Guardia de Seguridad (Asegura que estés logueado) */}
        <Route element={<ProtectedRoute />}>
            {/* Capa 2: Diseño visual compartido (Navbar y Footer) */}
            <Route element={<Layout />}>
                <Route path="/menu" element={<Menu />} />
                <Route path="/app/alumnos" element={<Alumnos />} />
                <Route path="/app/cursada" element={<Cursada />} />
                <Route path="/app/planes" element={<Planes />} />
                <Route path="/app/certificados_lu" element={<CertificadosLu />} />
                <Route path="/app/certificados_fecha" element={<CertificadosFecha />} />
                <Route path="/app/carga_csv" element={<CargaCsv />} />
                <Route path="/app/historial" element={<Historial />} />
            </Route>
        </Route>

        <Route path="*" element={<Navigate to="/login" />} /> {/* Redirige cualquier ruta rara al login */}
      </Routes>
    </BrowserRouter>
    </ToastProvider>
  );
}

export default App;
