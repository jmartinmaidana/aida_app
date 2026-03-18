import { pool, Alumno } from '../database.js';
import { Fecha, textoAFecha, fechaAIsoString } from '../fechas.js';
import { FiltroAlumnos } from '../services/CertificadoService.js';
export class AlumnoRepository {
    
    static async obtenerTodos() {
        const query = "SELECT lu, nombres, apellido, titulo, titulo_en_tramite, egreso, carrera_id FROM aida.alumnos ORDER BY lu";
        const res = await pool.query(query);
        return res.rows;
    }

    static async crear(alumno: Alumno) {
        const query = "INSERT INTO aida.alumnos (lu, nombres, apellido, titulo, titulo_en_tramite, egreso, carrera_id) VALUES ($1, $2, $3, $4, $5, $6, $7);";
        const valores = [alumno.lu, alumno.nombres, alumno.apellido, alumno.titulo, alumno.titulo_en_tramite, alumno.egreso, alumno.carrera_id];
        await pool.query(query, valores);
    }

    static async actualizar(lu: string, valores: Alumno) {
        const query = "UPDATE aida.alumnos SET nombres = $1, apellido = $2, titulo = $3, titulo_en_tramite = $4, egreso = $5 WHERE lu = $6;";
        const nuevos_valores = [valores.nombres, valores.apellido, valores.titulo, valores.titulo_en_tramite, valores.egreso, lu];
        const resultadoUpdate = await pool.query(query, nuevos_valores);

        if (resultadoUpdate.rowCount && resultadoUpdate.rowCount > 0) {
            console.log("¡Carrera completada! Fecha de egreso registrada automáticamente.");
        } else {
            console.log("El alumno ya se encontraba egresado. La fecha original se mantuvo intacta.");
        }
    }

    static async eliminar(lu: string) {
        const query = "DELETE FROM aida.alumnos WHERE lu = $1;";
        await pool.query(query, [lu]);
    }

    static async obtenerCarreraDeAlumno(lu: string) {
        const query = "SELECT carrera_id FROM aida.alumnos WHERE lu = $1;";
        const res = await pool.query(query, [lu]);
        return res.rows.length > 0 ? res.rows[0].carrera_id : null;
    }

    static async marcarComoEgresado(lu: string) {
        const query = `UPDATE aida.alumnos SET egreso = CURRENT_DATE WHERE lu = $1 AND egreso IS NULL;`;
        const res = await pool.query(query, [lu]);
        return res.rowCount && res.rowCount > 0; 
    }
    

    static async obtenerAlumnoQueNecesitaCertificado(filtro: FiltroAlumnos) {
        let query = "SELECT lu, nombres, apellido, titulo, egreso, titulo_en_tramite FROM aida.alumnos";
        let valores: any[] = []; 

        if ('uno' in filtro) {
            query += " LIMIT 1";
        } 
        else if ('lu' in filtro) {
            query += " WHERE lu = $1";
            valores.push(filtro.lu); 
        }
        else if ('fecha' in filtro) {
            query += " WHERE titulo_en_tramite::date = $1::date";
            valores.push(fechaAIsoString(filtro.fecha));
        }
        
        console.log("Ejecutando SQL:", query, "con valores:", valores); 
        const res = await pool.query(query, valores);
        return res.rows; 
    }
}