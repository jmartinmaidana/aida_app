import { z } from 'zod';

export const alumnoSchema = z.object({
    lu: z.string().min(3, "La libreta universitaria es obligatoria."),
    nombres: z.string().min(1, "El nombre no puede estar vacío."),
    apellido: z.string().min(1, "El apellido no puede estar vacío."),
    
    // Si viene un texto, genial. Si viene null, genial. Si no lo envían, Zod pone null.
    titulo: z.string().nullable().default(null),
    titulo_en_tramite: z.string().nullable().default(null),
    egreso: z.string().nullable().default(null),
    
    // Este sí tenía el signo de interrogación (?) en su interfaz original de aida.ts
    carrera_id: z.number().nullable().optional() 
});