import { pool } from '../database.js';

export class TituloEnTramiteService {
    static async iniciarTramiteTitulo(lu: string) {
        // Ejecutamos la actualización en la BD
        const query = `UPDATE aida.alumnos SET titulo_en_tramite = CURRENT_DATE WHERE lu = $1 AND egreso IS NOT NULL AND titulo_en_tramite IS NULL;`;
        const resultado = await pool.query(query, [lu]);

        // Regla de negocio: Si no se actualizó ninguna fila, es porque no cumplía los requisitos
        if (resultado.rowCount === 0) {
            const error: any = new Error("No se puede iniciar el trámite. Verifique que el alumno haya egresado y no tenga un trámite activo.");
            error.statusCode = 400;
            throw error;
        }
    }
}