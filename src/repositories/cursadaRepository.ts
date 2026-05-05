import { pool } from '../database.js';

export class CursadasRepository {
    
    static async aprobarCursada(lu: string, idMateria: string, anio: string, cuatrimestre: string, nota: number, client: any = pool) {
        // 1. Verificamos que el alumno esté inscripto previamente (CURSANDO) en este periodo
        const checkQuery = `SELECT id FROM aida.cursadas WHERE lu_alumno = $1 AND materia_id = $2 AND anio = $3 AND cuatrimestre = $4 AND estado = 'CURSANDO'`;
        const checkRes = await client.query(checkQuery, [lu, idMateria, anio, cuatrimestre]);

        if (checkRes.rows.length === 0) {
            throw new Error("El alumno no se encuentra inscripto (CURSANDO) en esta materia para el período indicado.");
        }
        
        const cursadaId = checkRes.rows[0].id;

        // 2. Actualizamos la inscripción existente
        const updateQuery = "UPDATE aida.cursadas SET nota = $1, aprobada = true, estado = 'APROBADA' WHERE id = $2;";
        await client.query(updateQuery, [nota, cursadaId]);
        
        // Promoción: Asumimos que una nota >= 7 es promoción y genera un final aprobado automáticamente.
        // Notas entre 4 y 6 son regularidades (APROBADA), pero no generan final.
        if (nota >= 7) {
            const queryFinal = `
                INSERT INTO aida.finales (lu_alumno, materia_id, nota, aprobado, fecha) 
                VALUES ($1, $2, $3, true, CURRENT_DATE)
                ON CONFLICT (lu_alumno, materia_id, fecha) DO UPDATE SET nota = EXCLUDED.nota;
            `;
            await client.query(queryFinal, [lu, idMateria, nota]);
        }
    }

    static async desaprobarCursada(lu: string, idMateria: string, anio: string, cuatrimestre: string, nota: number, client: any = pool) {
        // 1. Verificamos que el alumno esté inscripto previamente (CURSANDO) en este periodo
        const checkQuery = `SELECT id FROM aida.cursadas WHERE lu_alumno = $1 AND materia_id = $2 AND anio = $3 AND cuatrimestre = $4 AND estado = 'CURSANDO'`;
        const checkRes = await client.query(checkQuery, [lu, idMateria, anio, cuatrimestre]);

        if (checkRes.rows.length === 0) {
            throw new Error("El alumno no se encuentra inscripto (CURSANDO) en esta materia para el período indicado.");
        }

        const cursadaId = checkRes.rows[0].id;
        
        // 2. Actualizamos la inscripción existente a DESAPROBADA
        const updateQuery = "UPDATE aida.cursadas SET nota = $1, aprobada = false, estado = 'DESAPROBADA' WHERE id = $2;";
        await client.query(updateQuery, [nota, cursadaId]);
    }

    static async cantidadMateriasAprobadas(lu: string, client: any = pool){
        const queryAprobadas = `
            SELECT COUNT(DISTINCT materia_id) as total_aprobadas
            FROM aida.finales
            WHERE lu_alumno = $1 AND aprobado = true;
        `;
        const resAprobadas = await client.query(queryAprobadas, [lu]);
        const totalAprobadas = parseInt(resAprobadas.rows[0].total_aprobadas);
        return totalAprobadas
    }

    static async verificarMateriaAprobada(lu: string, idMateria: string | number): Promise<boolean> {
        const query = "SELECT 1 FROM aida.finales WHERE lu_alumno = $1 AND materia_id = $2 AND aprobado = true LIMIT 1;";
        const res = await pool.query(query, [lu, idMateria]);
        return res.rows.length > 0;
    }
    
    static async obtenerCursadas(lu: string){
        const queryCursadas = `
        SELECT m.nombre as materia, c.nota, c.anio, c.cuatrimestre, c.aprobada, c.estado
        FROM aida.cursadas c
        JOIN aida.materias m ON c.materia_id = m.id
        WHERE c.lu_alumno = $1
        ORDER BY c.anio DESC, c.cuatrimestre DESC
    `;
        const resCursadas = await pool.query(queryCursadas, [lu]);
        return resCursadas.rows
    }

    static async verificarCursadaAprobada(lu: string, idMateria: string | number, client: any = pool): Promise<boolean> {
        // Verificamos que el alumno posea la condición de "Regular" (Cursada APROBADA)
        const query = "SELECT 1 FROM aida.cursadas WHERE lu_alumno = $1 AND materia_id = $2 AND estado = 'APROBADA' LIMIT 1;";
        const res = await client.query(query, [lu, idMateria]);
        return res.rows.length > 0;
    }

}