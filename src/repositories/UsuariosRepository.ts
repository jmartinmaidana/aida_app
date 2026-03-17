// src/repositories/UsuarioRepository.ts
import { pool } from '../database.js';

export interface Usuario {
    id: number;
    username: string;
    nombre: string;
    email: string;
    password_hash?: string; // Es opcional porque al frontend no se lo enviamos
}

export class UsuariosRepository {
    
    // Busca un usuario por su nombre de usuario (Ideal para el login)
    static async buscarPorUsername(username: string): Promise<Usuario | null> {
        const query = `SELECT id, username, password_hash, nombre, email FROM aida.usuarios WHERE username = $1;`;
        const resultado = await pool.query(query, [username]);
        
        if (resultado.rows.length === 0) return null;
        return resultado.rows[0];
    }

    // Guarda el usuario ya con la contraseña encriptada
    static async crearUsuario(username: string, passwordHash: string, nombre: string, email: string): Promise<Usuario> {
        const query = `
            INSERT INTO aida.usuarios (username, password_hash, nombre, email)
            VALUES ($1, $2, $3, $4) RETURNING id, username, nombre, email;
        `;
        const resultado = await pool.query(query, [username, passwordHash, nombre, email]);
        return resultado.rows[0];
    }
}