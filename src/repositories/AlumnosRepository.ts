import { pool, Alumno } from '../aida.js'; // Ajuste la ruta según dónde esté aida.ts

export class AlumnoRepository {
    
    // Obtener todos los alumnos
    static async obtenerTodos() {
        const query = "SELECT lu, nombres, apellido, titulo, titulo_en_tramite, egreso, carrera_id FROM aida.alumnos ORDER BY lu";
        const res = await pool.query(query);
        return res.rows;
    }

    // Crear un alumno nuevo
    static async crear(alumno: Alumno) {
        const query = "INSERT INTO aida.alumnos (lu, nombres, apellido, titulo, titulo_en_tramite, egreso, carrera_id) VALUES ($1, $2, $3, $4, $5, $6, $7);";
        const valores = [alumno.lu, alumno.nombres, alumno.apellido, alumno.titulo, alumno.titulo_en_tramite, alumno.egreso, alumno.carrera_id];
        await pool.query(query, valores);
    }

    // Actualizar un alumno existente
    static async actualizar(lu: string, valores: Alumno) {
        const query = "UPDATE aida.alumnos SET nombres = $1, apellido = $2, titulo = $3, titulo_en_tramite = $4, egreso = $5 WHERE lu = $6;";
        const nuevos_valores = [valores.nombres, valores.apellido, valores.titulo, valores.titulo_en_tramite, valores.egreso, lu];
        await pool.query(query, nuevos_valores);
    }

    // Eliminar un alumno
    static async eliminar(lu: string) {
        const query = "DELETE FROM aida.alumnos WHERE lu = $1;";
        await pool.query(query, [lu]);
    }
}