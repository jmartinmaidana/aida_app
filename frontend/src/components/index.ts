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
    nota: number;
    aprobada: boolean;
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
}
