import { pool } from '../database.js';

export class FinalesRepository {
    
    static async guardarFinal(lu: string, materiaId: number | string, nota: number, aprobado: boolean, fecha: string | null = null, client: any = pool) {
        // Usamos ON CONFLICT con fecha para permitir un historial de aplazos y múltiples intentos.
        // Si envían fecha nula, la base de datos pondrá CURRENT_DATE automáticamente por el COALESCE
        const query = `
            INSERT INTO aida.finales (lu_alumno, materia_id, nota, aprobado, fecha) 
            VALUES ($1, $2, $3, $4, COALESCE($5, CURRENT_DATE))
            ON CONFLICT (lu_alumno, materia_id, fecha) 
            DO UPDATE SET nota = EXCLUDED.nota, aprobado = EXCLUDED.aprobado
            RETURNING *;
        `;
        
        const res = await client.query(query, [lu, materiaId, nota, aprobado, fecha]);
        return res.rows[0];
    }

    static async obtenerFinalesAlumno(lu: string) {
        const query = `
            SELECT f.id, m.nombre as materia, f.nota, f.aprobado, f.fecha
            FROM aida.finales f
            JOIN aida.materias m ON f.materia_id = m.id
            WHERE f.lu_alumno = $1
            ORDER BY f.fecha DESC;
        `;
        const res = await pool.query(query, [lu]);
        return res.rows;
    }
}
