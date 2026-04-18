import { pool } from '../database.js';

export class AuditoriaRepository {
    static async registrar(usuarioId: number, accion: string, detalle: string) {
        const query = `
            INSERT INTO aida.auditoria (usuario_id, accion, detalle)
            VALUES ($1, $2, $3)
        `;
        try {
            await pool.query(query, [usuarioId, accion, detalle]);
        } catch (error) {
            console.error('❌ Error al guardar log de auditoría:', error);
        }
    }
}