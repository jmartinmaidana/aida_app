import { pool } from '../database.js';

export class PlanEstudiosRepository {
    
    static async cantidadMateriasRequeridas(lu: string, client: any = pool){
        const queryRequeridas = `
            SELECT COUNT(pe.materia_id) as total_requeridas
            FROM aida.alumnos a
            JOIN aida.plan_estudio pe ON a.carrera_id = pe.carrera_id
            WHERE a.lu = $1;
        `;
        const resRequeridas = await client.query(queryRequeridas, [lu]);
        const totalRequeridas = parseInt(resRequeridas.rows[0].total_requeridas);
        return totalRequeridas
    }

    static async perteneceMateriaACarrera(idCarrera: number, idMateria: string) {
        const query = "SELECT 1 FROM aida.plan_estudio pe WHERE pe.carrera_id = $1 AND pe.materia_id = $2;";
        const res = await pool.query(query, [idCarrera, idMateria]);
        return res.rows.length > 0;
    }

    static async obtenerPlanesCompletos() {
        const query = `
            SELECT
                c.id,
                c.nombre,
                c.nombre as titulo_otorgado,
                COALESCE(
                    json_agg(
                        json_build_object(
                            'id', m.id,
                            'nombre', m.nombre
                        ) ORDER BY m.nombre
                    ) FILTER (WHERE m.id IS NOT NULL),
                    '[]'::json
                ) as materias
            FROM
                aida.carreras c
        LEFT JOIN aida.plan_estudio pe ON c.id = pe.carrera_id
        LEFT JOIN aida.materias m ON pe.materia_id = m.id
        GROUP BY
            c.id, c.nombre
            ORDER BY
                c.id;
        `;
        const res = await pool.query(query);
        return res.rows;
    }
}