// src/repositories/CursadasRepository.ts
import { pool } from '../database.js';

export class CursadasRepository {

    static async guardarCursadaAprobada(lu: string, idMateria: string, anio: string, cuatrimestre: string) {
        const query = "INSERT INTO aida.cursadas (lu_alumno, materia_id, anio, cuatrimestre, aprobada) VALUES ($1, $2, $3, $4, true);";
        await pool.query(query, [lu, idMateria, anio, cuatrimestre]);
    }

    static async cantidadMateriasAprobadas(lu: string){
        const queryAprobadas = `
            SELECT COUNT(id) as total_aprobadas
            FROM aida.cursadas
            WHERE lu_alumno = $1 AND aprobada = true;
        `;
        const resAprobadas = await pool.query(queryAprobadas, [lu]);
        const totalAprobadas = parseInt(resAprobadas.rows[0].total_aprobadas);
        return totalAprobadas
    }

}