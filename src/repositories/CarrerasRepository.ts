import { pool } from '../database.js'; 

export class CarrerasRepository {
    
    
    static async obtenerCarreras() {
        const query = "SELECT id, nombre FROM aida.carreras ORDER BY id;";
        const res = await pool.query(query);
        return res.rows;    
    }

    static async obtenerTituloPorId(id: number): Promise<string | null> {
        const query = "SELECT nombre FROM aida.carreras WHERE id = $1"; 
        const res = await pool.query(query, [id]);
        
        if (res.rows.length === 0) return null;
        return res.rows[0].nombre; 
    }
}
