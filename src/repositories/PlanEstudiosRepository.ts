import { pool } from '../database.js';

export class PlanEstudiosRepository {
    
    static async cantidadMateriasRequeridas(lu: string){
        const queryRequeridas = `
            SELECT COUNT(pe.materia_id) as total_requeridas
            FROM aida.alumnos a
            JOIN aida.plan_estudio pe ON a.carrera_id = pe.carrera_id
            WHERE a.lu = $1;
        `;
        const resRequeridas = await pool.query(queryRequeridas, [lu]);
        const totalRequeridas = parseInt(resRequeridas.rows[0].total_requeridas);
        return totalRequeridas
    }

    static async perteneceMateriaACarrera(idCarrera: number, idMateria: string) {
        const query = "SELECT 1 FROM aida.plan_estudio pe WHERE pe.carrera_id = $1 AND pe.materia_id = $2;";
        const res = await pool.query(query, [idCarrera, idMateria]);
        return res.rows.length > 0;
    }

}