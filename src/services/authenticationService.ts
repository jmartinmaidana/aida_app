import bcrypt from 'bcrypt';
import { UsuariosRepository, Usuario } from '../repositories/usuariosRepository.js';
const SALT_ROUNDS = 10;

export class AuthenticationService {
    
    static async registrarUsuario(username: string, passwordPlana: string, nombre: string, email: string): Promise<Usuario> {
        const hash = await bcrypt.hash(passwordPlana, SALT_ROUNDS);
        return await UsuariosRepository.crearUsuario(username, hash, nombre, email);
    }

    static async login(username: string, passwordPlana: string): Promise<Usuario | null> {
        const usuarioBD = await UsuariosRepository.buscarPorUsername(username);
        
        if (!usuarioBD || !usuarioBD.password_hash) {
            return null; 
        }

        const esValida = await bcrypt.compare(passwordPlana, usuarioBD.password_hash);
        
        if (!esValida) {
            return null; 
        }

        return {
            id: usuarioBD.id,
            username: usuarioBD.username,
            nombre: usuarioBD.nombre,
            email: usuarioBD.email,
            rol: usuarioBD.rol,
            lu_alumno: usuarioBD.lu_alumno
        };
    }

    static async activarCuenta(token: string, passwordPlana: string): Promise<boolean> {
        const tokenBD = await UsuariosRepository.buscarToken(token);
        
        if (!tokenBD) {
            const error: any = new Error("El token es inválido o no existe.");
            error.statusCode = 400;
            throw error;
        }

        if (new Date() > new Date(tokenBD.fecha_expiracion)) {
            await UsuariosRepository.eliminarToken(tokenBD.id);
            const error: any = new Error("El token ha expirado. Solicite al administrador que lo registre nuevamente.");
            error.statusCode = 400;
            throw error;
        }

        const hash = await bcrypt.hash(passwordPlana, SALT_ROUNDS);
        await UsuariosRepository.actualizarPassword(tokenBD.usuario_id, hash);
        await UsuariosRepository.eliminarToken(tokenBD.id);
        
        return true;
    }
}