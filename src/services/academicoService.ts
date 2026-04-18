import { CursadasRepository } from '../repositories/cursadaRepository.js';
import { AlumnosRepository } from '../repositories/alumnosRepository.js'; 
import { PlanEstudiosRepository } from '../repositories/planEstudiosRepository.js';
import { pool } from '../database.js';
export class AcademicoService {
    
    static async procesarCursadaAprobada(lu: string, idMateria: string, anio: string, cuatrimestre: string, nota: number) {
        
        const idCarrera = await AlumnosRepository.obtenerCarreraDeAlumno(lu);
        
        if (!idCarrera) {
            throw new Error("El alumno no existe o no tiene una carrera asignada.");
        }

        const esValida = await PlanEstudiosRepository.perteneceMateriaACarrera(idCarrera, idMateria);
        if (!esValida) {
            throw new Error("Cursada inválida: La materia no pertenece al plan de estudios de este alumno.");
        }

        const yaAprobada = await CursadasRepository.verificarMateriaAprobada(lu, idMateria);
        if (yaAprobada) {
            throw new Error("Operación rechazada: El alumno ya tiene esta materia aprobada en su historial.");
        }

        const aprobada = nota >= 4;

        // ⏳ Iniciamos la Transacción SQL
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            await CursadasRepository.guardarCursada(lu, idMateria, anio, cuatrimestre, nota, aprobada, client);

            let egreso = false;
            if (aprobada) {
                egreso = await this.verificarCarreraAprobada(lu, client);
            }

            await client.query('COMMIT'); // 🟢 Confirmar cambios si todo fue exitoso
            return egreso;
        } catch (error) {
            await client.query('ROLLBACK'); // 🔴 Revertir si algo falla
            throw error;
        } finally {
            client.release();
        }
    }


    static async verificarCarreraAprobada(lu: string, client: any = pool) {
        
        try {

            const totalAprobadas = await CursadasRepository.cantidadMateriasAprobadas(lu, client);
            const totalRequeridas = await PlanEstudiosRepository.cantidadMateriasRequeridas(lu, client);
        
            if (totalRequeridas > 0 && totalAprobadas >= totalRequeridas) {
                
                await AlumnosRepository.marcarComoEgresado(lu, client);
                return true;
            }
    
            return false; 
    
        } catch (error: any) {
            console.error("Error al verificar el título:", error.message);
            throw new Error("Fallo en la verificación automática de materias.");
        }
    }
    static async calcularPromedioAlumno(lu: string) {
        
        const cursadas = await CursadasRepository.obtenerCursadas(lu);

        let sumaNotasAprobadas = 0;

        cursadas.forEach((c: any) => {
            if (c.aprobada) {
                sumaNotasAprobadas += parseInt(c.nota);
            }
        });

        const cantidadAprobadas = await CursadasRepository.cantidadMateriasAprobadas(lu);
        
        const promedio = cantidadAprobadas > 0 ? Number((sumaNotasAprobadas / cantidadAprobadas).toFixed(2)) : 0;

        return promedio;
    }


}