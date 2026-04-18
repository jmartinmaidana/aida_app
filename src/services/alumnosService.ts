import { AlumnosRepository } from '../repositories/alumnosRepository.js';
import { CarrerasRepository } from '../repositories/carrerasRepository.js';
import { Alumno } from '../database.js';

export class AlumnosService {
    
    private static async validarYCompletarAlumno(alumno: Alumno): Promise<Alumno> {

        if (!alumno.carrera_id) {
            throw new Error(`El alumno ${alumno.lu} no tiene una carrera asignada (carrera_id es obligatorio).`);
        }

        const tituloPorDefecto = await CarrerasRepository.obtenerTituloPorId(alumno.carrera_id);
        if (!tituloPorDefecto) {
            throw new Error(`La carrera con ID ${alumno.carrera_id} no existe en la base de datos.`);
        }

        return {
            ...alumno,
            titulo: tituloPorDefecto,
            titulo_en_tramite: alumno.titulo_en_tramite === "" ? null : alumno.titulo_en_tramite,
            egreso: alumno.egreso === "" ? null : alumno.egreso
        };
    }

// Método para la Carga Masiva (CSV/JSON)
    static async cargarDesdeJson(alumnos: Alumno[]) {

        let insertados = 0;
        let ignorados = 0;
        
        for (const alumno of alumnos) {
            try {
                if (!alumno.lu || !alumno.nombres || !alumno.apellido) {
                    throw new Error(`Faltan datos obligatorios básicos.`);
                }

                // Limitamos estrictamente los datos que se pueden cargar masivamente
                const alumnoLimpio: Alumno = {
                    lu: alumno.lu,
                    nombres: alumno.nombres,
                    apellido: alumno.apellido,
                    carrera_id: alumno.carrera_id,
                    titulo: null,
                    titulo_en_tramite: null,
                    egreso: null
                };

                const alumnoValidado = await this.validarYCompletarAlumno(alumnoLimpio);
                
                const fueInsertado = await AlumnosRepository.crearIgnorandoDuplicados(alumnoValidado);
                
                if (fueInsertado) {
                    insertados++;
                } else {
                    ignorados++;
                }
            } catch (error: any) {
                ignorados++;
                console.error(`❌ Error crítico al procesar la LU ${alumno.lu || 'desconocida'}: ${error.message}`);
            }
        }
        
        return { insertados, ignorados };
    }

    static async crearAlumno(alumno: Alumno) {
        const alumnoValidado = await this.validarYCompletarAlumno(alumno);
        await AlumnosRepository.crear(alumnoValidado);
    }

    
}