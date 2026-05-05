import { useState } from 'react';
import type { DragEvent, ChangeEvent } from 'react';
import { useToast } from '../context/ToastContext';

export function csvDragAndDrop(onFileSelect?: () => void) {
    const [archivo, setArchivo] = useState<File | null>(null);
    const [dragActivo, setDragActivo] = useState(false);
    
    const { mostrarToast } = useToast();

    const handleDragOver = (e: DragEvent<HTMLDivElement>) => { e.preventDefault(); setDragActivo(true); };
    const handleDragLeave = () => setDragActivo(false);
    
    const handleDrop = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setDragActivo(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const archivoDroppeado = e.dataTransfer.files[0];
            if (archivoDroppeado.name.toLowerCase().endsWith('.csv')) {
                setArchivo(archivoDroppeado);
                if (onFileSelect) onFileSelect(); // Hook opcional para cuando se selecciona
            } else {
                mostrarToast('Por favor, arrastre únicamente un archivo con extensión .csv', 'error');
            }
        }
    };

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setArchivo(e.target.files[0]);
            if (onFileSelect) onFileSelect();
        }
    };

    const leerArchivoComoTexto = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const lector = new FileReader();
            lector.onload = (evento) => resolve(evento.target?.result as string);
            lector.onerror = () => {
                if (lector.error?.name === 'NotReadableError') {
                    reject(new Error("No se pudo leer el archivo. Es probable que esté abierto en Excel u otro programa. Por favor, ciérrelo, vuelva a seleccionarlo e intente nuevamente."));
                } else {
                    reject(new Error("Error al intentar leer el archivo físico desde el disco."));
                }
            };
            lector.readAsText(file);
        });
    };

    return {
        archivo, setArchivo,
        dragActivo,
        handleDragOver, handleDragLeave, handleDrop, handleFileChange,
        leerArchivoComoTexto
    };
}