import { CursadasRepository } from '../repositories/CursadaRepository.js';
import { AlumnoRepository } from '../repositories/AlumnosRepository.js'; 
import { PlanEstudiosRepository } from '../repositories/PlanEstudiosRepository.js'; 

export class AcademicoService {
    
    static async procesarNuevaNota(lu: string, idMateria: string, anio: string, cuatrimestre: string, nota: number) {
        
        const idCarrera = await AlumnoRepository.obtenerCarreraDeAlumno(lu);
        
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

        await CursadasRepository.guardarCursada(lu, idMateria, anio, cuatrimestre, nota, aprobada);

        // 3. REGLA DE NEGOCIO: Solo verificamos si se recibe en su carrera si acaba de aprobar algo
        if (aprobada) {
            return await this.verificarCarreraAprobada(lu);
        }

        return false
    }


    static async verificarCarreraAprobada(lu: string) {
        console.log(`Verificando estado de título para el alumno: ${lu}`);
        
        try {

            const totalAprobadas = await CursadasRepository.cantidadMateriasAprobadas(lu);
            const totalRequeridas = await PlanEstudiosRepository.cantidadMateriasRequeridas(lu)
    
            console.log(`Progreso académico: ${totalAprobadas} / ${totalRequeridas} materias aprobadas.`);
    
            if (totalRequeridas > 0 && totalAprobadas >= totalRequeridas) {
                
                const registrado = await AlumnoRepository.marcarComoEgresado(lu);
                if (registrado) {
                    console.log("¡Carrera completada! Fecha de egreso registrada automáticamente.");
                }
                    
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

        cursadas.forEach(c => {
            if (c.aprobada) {
                sumaNotasAprobadas += parseInt(c.nota);
            }
        });

        const cantidadAprobadas = await CursadasRepository.cantidadMateriasAprobadas(lu);
        
        // CORRECCIÓN AQUÍ: Envolvemos todo en Number() para que siempre devuelva un valor numérico
        const promedio = cantidadAprobadas > 0 ? Number((sumaNotasAprobadas / cantidadAprobadas).toFixed(2)) : 0;

        return promedio;
    }


}