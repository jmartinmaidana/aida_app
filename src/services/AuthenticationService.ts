// src/services/AuthService.ts
import bcrypt from 'bcrypt';
import { UsuariosRepository, Usuario } from '../repositories/UsuariosRepository.js';

const SALT_ROUNDS = 10;

export class AuthenticationService {
    
    // Registra un usuario hasheando su contraseña primero
    static async registrarUsuario(username: string, passwordPlana: string, nombre: string, email: string): Promise<Usuario> {
        const hash = await bcrypt.hash(passwordPlana, SALT_ROUNDS);
        return await UsuariosRepository.crearUsuario(username, hash, nombre, email);
    }

    // Autentica validando la contraseña contra el hash de la base de datos
    static async login(username: string, passwordPlana: string): Promise<Usuario | null> {
        // 1. Buscamos al usuario en la BD
        const usuarioBD = await UsuariosRepository.buscarPorUsername(username);
        
        if (!usuarioBD || !usuarioBD.password_hash) {
            return null; // El usuario no existe
        }

        // 2. Comparamos la contraseña plana contra el hash
        const esValida = await bcrypt.compare(passwordPlana, usuarioBD.password_hash);
        
        if (!esValida) {
            return null; // Contraseña incorrecta
        }

        // 3. Devolvemos el usuario limpio (sin exponer el hash en la memoria/sesión)
        return {
            id: usuarioBD.id,
            username: usuarioBD.username,
            nombre: usuarioBD.nombre,
            email: usuarioBD.email
        };
    }
}