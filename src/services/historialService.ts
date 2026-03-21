import { AlumnoRepository } from '../repositories/alumnosRepository.js';
import { CursadasRepository } from '../repositories/cursadaRepository.js';
import { PlanEstudiosRepository } from '../repositories/planEstudiosRepository.js';
import { AcademicoService } from './academicoService.js';

export class HistorialService {
    static async obtenerHistorialCompleto(lu: string) {

        const dataAlumno = await AlumnoRepository.obtenerDatos(lu);

        if (dataAlumno.rows.length === 0) {
            const error: any = new Error("Alumno no encontrado.");
            error.statusCode = 404; // Le indicamos al errorHandler que es un 404
            throw error;
        }
        const alumno = dataAlumno.rows[0];

        // 2. Ejecutamos todas las consultas independientes EN PARALELO
        const [cursadas, cantidadAprobadas, promedio, totalMateriasCarrera] = await Promise.all([
            CursadasRepository.obtenerCursadas(lu),
            CursadasRepository.cantidadMateriasAprobadas(lu),
            AcademicoService.calcularPromedioAlumno(lu),
            PlanEstudiosRepository.cantidadMateriasRequeridas(lu)
        ]);
        
        const porcentaje = totalMateriasCarrera > 0 
            ? Math.round((cantidadAprobadas / totalMateriasCarrera) * 100) 
            : 0;

        return {
            alumno: `${alumno.nombres} ${alumno.apellido}`,
            lu: lu,
            estadisticas: {
                promedioActual: promedio,
                porcentajeCompletado: porcentaje,
                materiasAprobadas: cantidadAprobadas,
                totalMaterias: totalMateriasCarrera
            },
            historial: cursadas
        };
    }
}