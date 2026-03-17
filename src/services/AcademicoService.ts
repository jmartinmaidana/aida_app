// src/services/AcademicoService.ts
// src/services/AcademicoService.ts
import { CursadasRepository } from '../repositories/CursadaRepository.js';
import { AlumnoRepository } from '../repositories/AlumnosRepository.js'; 
import { PlanEstudiosRepository } from '../repositories/PlanEstudiosRepository.js'; 
import { Alumno } from '../database.js'; // O de donde mueva la interfaz

export class AcademicoService {
    
    static async procesarNuevaNota(lu: string, idMateria: string, anio: string, cuatrimestre: string) {
        
        const idCarrera = await AlumnoRepository.obtenerCarreraDeAlumno(lu);
        
        if (!idCarrera) {
            throw new Error("El alumno no existe o no tiene una carrera asignada.");
        }

        const esValida = await PlanEstudiosRepository.perteneceMateriaACarrera(idCarrera, idMateria);
        if (!esValida) {
            throw new Error("Cursada inválida: La materia no pertenece al plan de estudios de este alumno.");
        }

        await CursadasRepository.guardarCursadaAprobada(lu, idMateria, anio, cuatrimestre);

        return await this.verificarCarreraAprobada(lu)
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
    
            return false; // Aún le faltan materias
    
        } catch (error: any) {
            console.error("Error al verificar el título:", error.message);
            throw new Error("Fallo en la verificación automática de materias.");
        }
    }
}