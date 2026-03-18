import { pool } from '../database.js';

export class CursadasRepository {

    static async guardarCursada(lu: string, idMateria: string, anio: string, cuatrimestre: string, nota: number, aprobada: boolean) {
        const query = "INSERT INTO aida.cursadas (lu_alumno, materia_id, anio, cuatrimestre, nota, aprobada) VALUES ($1, $2, $3, $4, $5, $6);";
        await pool.query(query, [lu, idMateria, anio, cuatrimestre, nota, aprobada]);
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

    static async verificarMateriaAprobada(lu: string, idMateria: string): Promise<boolean> {
        const query = "SELECT 1 FROM aida.cursadas WHERE lu_alumno = $1 AND materia_id = $2 AND aprobada = true LIMIT 1;";
        const res = await pool.query(query, [lu, idMateria]);
        return res.rows.length > 0;
    }

}