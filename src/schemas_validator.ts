import { z } from 'zod';

export const alumnoSchema = z.object({
    lu: z.string().regex(/^\d+\/\d{2,4}$/, "La LU debe tener el formato numérico 'prefijo/año' (ej. 123/24 o 123/2024)."),    nombres: z.string().min(1, "El nombre no puede estar vacío."),
    apellido: z.string().min(1, "El apellido no puede estar vacío."),
    
    titulo: z.string().nullable().default(null),
    titulo_en_tramite: z.string().nullable().default(null),
    egreso: z.string().nullable().default(null),
    
    carrera_id: z.number().nullable().optional() 
});