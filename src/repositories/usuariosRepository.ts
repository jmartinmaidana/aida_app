import { pool } from '../database.js';

export interface Usuario {
    id: number;
    username: string;
    nombre: string;
    email: string;
    password_hash?: string; 
    rol: 'ADMIN' | 'ALUMNO';
    lu_alumno?: string | null;
}

export class UsuariosRepository {
    
    static async buscarPorUsername(username: string): Promise<Usuario | null> {
        const query = `SELECT id, username, password_hash, nombre, email, rol, lu_alumno FROM aida.usuarios WHERE username = $1;`;
        const resultado = await pool.query(query, [username]);
        
        if (resultado.rows.length === 0) return null;
        return resultado.rows[0];
    }

    static async crearUsuario(username: string, passwordHash: string, nombre: string, email: string): Promise<Usuario> {
        const query = `
            INSERT INTO aida.usuarios (username, password_hash, nombre, email, rol)
            VALUES ($1, $2, $3, $4, 'ADMIN') RETURNING id, username, nombre, email, rol;
        `;
        const resultado = await pool.query(query, [username, passwordHash, nombre, email]);
        return resultado.rows[0];
    }

    static async crearUsuarioAlumno(lu: string, nombre: string, email: string): Promise<Usuario> {
        // Usamos el email como "username" para que inicien sesión con su correo
        const query = `
            INSERT INTO aida.usuarios (username, password_hash, nombre, email, rol, lu_alumno)
            VALUES ($1, NULL, $2, $3, 'ALUMNO', $4) RETURNING id, username, nombre, email, rol, lu_alumno;
        `;
        const resultado = await pool.query(query, [email, nombre, email, lu]);
        return resultado.rows[0];
    }

    static async guardarTokenActivacion(usuarioId: number, token: string): Promise<void> {
        const query = `
            INSERT INTO aida.tokens_activacion (usuario_id, token, fecha_expiracion)
            VALUES ($1, $2, NOW() + INTERVAL '24 hours');
        `;
        await pool.query(query, [usuarioId, token]);
    }

    static async buscarToken(token: string) {
        const query = `SELECT id, usuario_id, fecha_expiracion FROM aida.tokens_activacion WHERE token = $1;`;
        const res = await pool.query(query, [token]);
        
        if (res.rows.length === 0) return null;
        return res.rows[0];
    }

    static async actualizarPassword(usuarioId: number, passwordHash: string): Promise<void> {
        const query = `UPDATE aida.usuarios SET password_hash = $1 WHERE id = $2;`;
        await pool.query(query, [passwordHash, usuarioId]);
    }

    static async eliminarToken(tokenId: number): Promise<void> {
        const query = `DELETE FROM aida.tokens_activacion WHERE id = $1;`;
        await pool.query(query, [tokenId]);
    }
}