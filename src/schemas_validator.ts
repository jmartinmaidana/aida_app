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
    
    email: z.string().email("Debe ser un correo electrónico válido.").optional(),
    
    titulo: z.string().nullable().default(null),
    titulo_en_tramite: z.string().nullable().default(null),
    egreso: z.string().nullable().default(null),
    
    carrera_id: z.number().nullable().optional() 
});


export const inscribirMateriaAPeriodoSchema = z.object({
    materia_id: z.union([z.number(), z.string()]),
    anio: z.union([z.number(), z.string()]),
    cuatrimestre: z.union([z.number(), z.string()])
});

export const periodoSchema = z.object({
    anio: z.union([z.number(), z.string()]),
    cuatrimestre: z.union([z.number(), z.string()]),
    fecha_inicio: z.string().optional(),
    fecha_fin: z.string().optional(),
    fecha_inicio_inscripcion: z.string().optional(),
    fecha_fin_inscripcion: z.string().optional()
});

export const inscribirAlumnoSchema = z.object({
    lu: z.string().min(1, "El LU es obligatorio"),
    materia_id: z.union([z.number(), z.string()]),
    anio: z.union([z.number(), z.string()]),
    cuatrimestre: z.union([z.number(), z.string()])
});

export const actualizarCursadaSchema = z.object({
    estado: z.enum(['CURSANDO', 'APROBADA', 'DESAPROBADA']),
    nota: z.number().min(1).max(10).nullable().optional()
});

export const cargarCursadaSchema = z.object({
    lu: z.string().min(1, "El LU es obligatorio"),
    idMateria: z.union([z.number(), z.string()]),
    año: z.union([z.number(), z.string()]).optional(), // Soporta columna "año"
    anio: z.union([z.number(), z.string()]).optional(), // Soporta columna "anio"
    cuatrimestre: z.union([z.number(), z.string()]),
    nota: z.number().min(1).max(10)
});

export const cargarCursadasMasivoSchema = z.union([
    cargarCursadaSchema,
    z.array(cargarCursadaSchema)
]);

export const cargarFinalSchema = z.object({
    lu: z.string().min(1, "El LU es obligatorio"),
    idMateria: z.union([z.number(), z.string()]),
    fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "El formato de fecha debe ser YYYY-MM-DD").optional(),
    nota: z.number().min(1).max(10),
    aprobado: z.boolean().optional() // Opcional, si no se envía se calcula automáticamente
});

export const cargarFinalesMasivoSchema = z.union([
    cargarFinalSchema,
    z.array(cargarFinalSchema)
]);
