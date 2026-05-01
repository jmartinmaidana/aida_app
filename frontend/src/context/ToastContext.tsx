import { createContext, useState, useContext, useCallback } from 'react';
import type { ReactNode } from 'react';
import { CheckCircle, XCircle, Spinner } from '@phosphor-icons/react';

interface Toast {
    id: string;
    texto: string;
    tipo: 'exito' | 'error' | '';
}

interface ToastContextType {
    mostrarToast: (texto: string, tipo: 'exito' | 'error' | '') => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const mostrarToast = useCallback((texto: string, tipo: 'exito' | 'error' | '') => {
        const id = Math.random().toString(36).substring(2, 9);
        setToasts(prev => [...prev, { id, texto, tipo }]);
        
        // Auto-eliminar después de 5 segundos
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000);
    }, []);

    return (
        <ToastContext.Provider value={{ mostrarToast }}>
            {children}
            <div className="toast-container">
                {toasts.map(toast => (
                    <div key={toast.id} className={`toast ${toast.tipo}`}>
                        {toast.tipo === 'exito' ? <CheckCircle size={25} weight="bold" color="#10b981" /> : toast.tipo === 'error' ? <XCircle size={25} weight="bold" color="#ef4444" /> : <Spinner className="icono-cargando" size={25} weight="bold" color="#0284c7" />}
                        <span>{toast.texto}</span>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) throw new Error("useToast debe usarse dentro de un ToastProvider");
    return context;
};