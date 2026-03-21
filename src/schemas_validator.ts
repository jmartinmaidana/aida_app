import { z } from 'zod';

// 1. Creamos una pequeña función limpiadora
// Esto reemplaza cualquier símbolo de etiqueta HTML por un espacio vacío
const sanitizarTexto = (val: string) => val.replace(/[<>]/g, '').trim();


export const alumnoSchema = z.object({
    lu: z.string().regex(/^\d+\/\d{2,4}$/, "La LU debe tener el formato numérico 'prefijo/año' (ej. 123/24 o 123/2024)."),    
    
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
})
.superRefine((datos, ctx) => {
    // REGLA 1: Tiene trámite pero NO tiene egreso
    if (datos.titulo_en_tramite && !datos.egreso) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "No se puede registrar un título en trámite si el alumno no tiene fecha de egreso.",
            path: ["titulo_en_tramite"] // Esto le dice al frontend qué campo causó el error
        });
    }

    // REGLA 2: Tiene ambos, pero la fecha de trámite es "en el pasado" respecto al egreso
    if (datos.titulo_en_tramite && datos.egreso) {
        const fechaTramite = new Date(datos.titulo_en_tramite);
        const fechaEgreso = new Date(datos.egreso);

        if (fechaTramite < fechaEgreso) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "La fecha del trámite no puede ser anterior a la fecha de egreso.",
                path: ["titulo_en_tramite"]
            });
        }
    }
});