import { pool } from '../database.js'; 

export class CarrerasRepository {
    
    
    static async obtenerCarreras() {
        const query = "SELECT id, nombre FROM aida.carreras ORDER BY id;";
        const res = await pool.query(query);
        return res.rows;    
    }
}
