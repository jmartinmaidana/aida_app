export interface Alumno {
    lu: string;
    apellido: string;
    nombres: string;
    titulo?: string;
    titulo_en_tramite?: string;
    egreso?: string;
    carrera_id?: number;
}

export interface Carrera {
    id: number;
    nombre: string;
}

export interface Materia {
    id: number;
    nombre: string;
}

export interface Plan {
    nombre: string;
    titulo_otorgado: string;
    materias: Materia[];
}

export interface Cursada {
    anio: number;
    cuatrimestre: number;
    materia: string;
    nota: number | null;
    aprobada: boolean;
    estado: 'CURSANDO' | 'APROBADA' | 'DESAPROBADA'; // <-- ¡Agrega esta línea!
}

export interface Final {
    id: number;
    materia: string;
    nota: number;
    aprobado: boolean;
    fecha: string;
}

export interface DatosHistorial {
    alumno: string;
    lu: string;
    estadisticas: {
        promedioActual: number;
        porcentajeCompletado: number;
        materiasAprobadas: number;
        totalMaterias: number;
    };
    historial: Cursada[];
    finales: Final[];
}
