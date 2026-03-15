import bcrypt from 'bcrypt';
import { Client } from 'pg';

// Interfaz para usar en todo el sistema (sin la contraseña por seguridad)
export interface Usuario {
    id: number;
    username: string;
    nombre: string;
    email: string;
}

// Nivel de seguridad del encriptado
const SALT_ROUNDS = 10;

// 1. Hashea una contraseña usando bcrypt
export async function hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, SALT_ROUNDS);
}

// 2. Verifica una contraseña contra su hash
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(password, hash);
}

// 3. Crea un nuevo usuario en la base de datos
export async function crearUsuario(client: Client, username: string, passwordPlana: string, nombre: string = '', email: string = '') {
    const hash = await hashPassword(passwordPlana);
    
    const query = `
        INSERT INTO aida.usuarios (username, password_hash, nombre, email)
        VALUES ($1, $2, $3, $4) RETURNING id, username, nombre, email;
    `;
    
    const resultado = await client.query(query, [username, hash, nombre, email]);
    return resultado.rows[0];
}

// 4. Valida credenciales y retorna el usuario si todo es correcto
export async function autenticarUsuario(client: Client, username: string, passwordPlana: string): Promise<Usuario | null> {
    const query = `SELECT * FROM aida.usuarios WHERE username = $1;`;
    const resultado = await client.query(query, [username]);
    
    if (resultado.rows.length === 0) {
        return null; // El usuario no existe
    }

    const usuarioBD = resultado.rows[0];
    
    // Comparamos la contraseña que escribió el usuario con el hash guardado
    const esValida = await verifyPassword(passwordPlana, usuarioBD.password_hash);

    if (esValida) {
        // Retornamos los datos limpios (sin el hash) para guardar en la sesión
        return {
            id: usuarioBD.id,
            username: usuarioBD.username,
            nombre: usuarioBD.nombre,
            email: usuarioBD.email
        };
    } else {
        return null; // Contraseña incorrecta
    }
}