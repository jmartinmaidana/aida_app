import { AlumnoRepository } from '../repositories/AlumnosRepository.js';
import { CarrerasRepository } from '../repositories/CarrerasRepository.js';
import { Alumno } from '../database.js';

export class AlumnoService {
    
    private static async validarYCompletarAlumno(alumno: Alumno): Promise<Alumno> {

        if (!alumno.carrera_id) {
            throw new Error(`El alumno ${alumno.lu} no tiene una carrera asignada (carrera_id es obligatorio).`);
        }

        let tituloFinal = alumno.titulo === "" ? null : alumno.titulo;
        
        if (!tituloFinal) {
            const tituloPorDefecto = await CarrerasRepository.obtenerTituloPorId(alumno.carrera_id);
            if (!tituloPorDefecto) {
                throw new Error(`La carrera con ID ${alumno.carrera_id} no existe en la base de datos.`);
            }
            tituloFinal = tituloPorDefecto;
        }

        return {
            ...alumno,
            titulo: tituloFinal,
            titulo_en_tramite: alumno.titulo_en_tramite === "" ? null : alumno.titulo_en_tramite,
            egreso: alumno.egreso === "" ? null : alumno.egreso
        };
    }

// Método para la Carga Masiva (CSV/JSON)
    static async cargarDesdeJson(alumnos: Alumno[]) {
        console.log(`Procesando carga de ${alumnos.length} alumnos desde JSON...`);
        let insertados = 0;
        let ignorados = 0;
        
        for (const alumno of alumnos) {
            try {
                if (!alumno.lu || !alumno.nombres || !alumno.apellido) {
                    throw new Error(`Faltan datos obligatorios básicos.`);
                }

                const alumnoValidado = await this.validarYCompletarAlumno(alumno);
                
                const fueInsertado = await AlumnoRepository.crearIgnorandoDuplicados(alumnoValidado);
                
                if (fueInsertado) {
                    insertados++;
                } else {
                    ignorados++;
                    console.log(`⚠️ Alumno con LU ${alumno.lu} ignorado (ya existe en el sistema).`);
                }
            } catch (error: any) {
                console.error(`❌ Error crítico al procesar la LU ${alumno.lu || 'desconocida'}: ${error.message}`);
            }
        }
        
        console.log(`Resumen de carga: ${insertados} insertados, ${ignorados} ignorados por duplicidad.`);
        return insertados;
    }

    static async crearAlumno(alumno: Alumno) {
        const alumnoValidado = await this.validarYCompletarAlumno(alumno);
        await AlumnoRepository.crear(alumnoValidado);
    }

    
}