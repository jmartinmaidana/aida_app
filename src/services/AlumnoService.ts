// src/services/AlumnoService.ts
import { AlumnoRepository } from '../repositories/AlumnosRepository.js';
import { Alumno } from '../database.js'; // O de donde mueva la interfaz

export class AlumnoService {
    static async cargarDesdeJson(alumnos: Alumno[]) {
        console.log(`Procesando carga de ${alumnos.length} alumnos desde JSON...`);
        
        let insertados = 0;
        for (const alumno of alumnos) {
            try {
                const tituloTramite = alumno.titulo_en_tramite === "" ? null : alumno.titulo_en_tramite;
                const egreso = alumno.egreso === "" ? null : alumno.egreso;

                const nuevoAlumno: Alumno = {
                    ...alumno,
                    titulo_en_tramite: tituloTramite,
                    egreso: egreso
                };
                await AlumnoRepository.crear(nuevoAlumno);
                insertados++;
            } catch (error: any) {
                console.error(`Error al insertar la LU ${alumno.lu}: ${error.message}`);
            }
        }
        return insertados;
    }
}