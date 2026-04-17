import { pool, Alumno } from '../database.js';
import { Fecha, textoAFecha, fechaAIsoString } from '../fechas.js';
import { FiltroAlumnos } from '../services/certificadoService.js';
export class AlumnosRepository {
    
    static async obtenerTodos() {
        const query = "SELECT lu, nombres, apellido, titulo, titulo_en_tramite, egreso, carrera_id FROM aida.alumnos ORDER BY lu";
        const res = await pool.query(query);
        return res.rows;
    }

    static async crear(alumno: any) {
        const query = `
            INSERT INTO aida.alumnos (lu, nombres, apellido, carrera_id, titulo, titulo_en_tramite, egreso)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
        `;
        const valores = [
            alumno.lu, alumno.nombres, alumno.apellido, alumno.carrera_id,
            alumno.titulo || null, alumno.titulo_en_tramite || null, alumno.egreso || null
        ];
        await pool.query(query, valores);
    }

    static async crearIgnorandoDuplicados(alumno: any): Promise<boolean> {
        const query = `
            INSERT INTO aida.alumnos (lu, nombres, apellido, carrera_id, titulo, titulo_en_tramite, egreso)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (lu) DO NOTHING
            RETURNING lu; -- Pedimos que nos devuelva el LU solo si logró insertarlo
        `;
        
        const valores = [
            alumno.lu, alumno.nombres, alumno.apellido, alumno.carrera_id,
            alumno.titulo || null, alumno.titulo_en_tramite || null, alumno.egreso || null
        ];

        const res = await pool.query(query, valores);
        
        // Retorna 'true' si insertó una fila nueva, 'false' si la ignoró
        return res.rowCount !== null && res.rowCount > 0;
    }

    static async actualizar(lu: string, datosActualizados: any) {
        const query = `
            UPDATE aida.alumnos 
            SET nombres = $1, 
                apellido = $2, 
                carrera_id = $3,
                titulo = (SELECT nombre FROM aida.carreras WHERE id = $3),
                titulo_en_tramite = $4,
                egreso = $5
            WHERE lu = $6
        `;
        
        const valores = [
            datosActualizados.nombres, 
            datosActualizados.apellido, 
            datosActualizados.carrera_id, 
            datosActualizados.titulo_en_tramite,
            datosActualizados.egreso,
            lu
        ];

        await pool.query(query, valores);
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
        
        const res = await pool.query(query, valores);
        return res.rows; 
    }

    static async obtenerDatos(lu: string){
        // 1. Obtener datos básicos del alumno
        const queryAlumno = `SELECT nombres, apellido, carrera_id FROM aida.alumnos WHERE lu = $1`;
        const resAlumno = await pool.query(queryAlumno, [lu]); 
    
        return resAlumno
    }

    static async obtenerPaginados(pagina: number, limite: number, busqueda: string) {
        const offset = (pagina - 1) * limite;
        const params: any[] = [];
        
        // CORRECCIÓN: Solucionados los nombres de las columnas e incluidas las faltantes
        let query = `
            SELECT a.lu, a.nombres, a.apellido, a.titulo, a.titulo_en_tramite, a.egreso, a.carrera_id, c.nombre as carrera
            FROM aida.alumnos a
            LEFT JOIN aida.carreras c ON a.carrera_id = c.id
        `;
        let countQuery = `SELECT COUNT(*) FROM aida.alumnos a`;

        // Si el usuario escribió algo, filtramos
        if (busqueda) {
            const termino = `%${busqueda}%`;
            const filtro = ` WHERE a.lu ILIKE $1 OR a.apellido ILIKE $1 OR a.nombres ILIKE $1`;
            query += filtro;
            countQuery += filtro;
            params.push(termino);
        }

        // Ordenamos y aplicamos la paginación (LIMIT y OFFSET)
        query += ` ORDER BY a.apellido ASC, a.nombres ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        
        const resAlumnos = await pool.query(query, [...params, limite, offset]);
        const resTotal = await pool.query(countQuery, params);

        return {
            alumnos: resAlumnos.rows,
            total: parseInt(resTotal.rows[0].count)
        };
    }


}