import { z } from 'zod';

// 1. Creamos una pequeña función limpiadora
// Esto reemplaza cualquier símbolo de etiqueta HTML por un espacio vacío
const sanitizarTexto = (val: string) => val.replace(/[<>]/g, '').trim();

export const alumnoSchema = z.object({
    lu: z.string().regex(/^\d+\/\d{2,4}$/, "La LU debe tener el formato numérico 'prefijo/año' (ej. 123/24 o 123/2024)."),    
    
    // 2. Aplicamos el .transform() a los campos vulnerables
    nombres: z.string()
        .min(1, "El nombre no puede estar vacío.")
        .transform(sanitizarTexto), 
        
    apellido: z.string()
        .min(1, "El apellido no puede estar vacío.")
        .transform(sanitizarTexto),
    
    titulo: z.string().nullable().default(null),
    titulo_en_tramite: z.string().nullable().default(null),
    egreso: z.string().nullable().default(null),
    
    carrera_id: z.number().nullable().optional() 
});