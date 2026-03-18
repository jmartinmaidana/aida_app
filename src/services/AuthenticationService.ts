import bcrypt from 'bcrypt';
import { UsuariosRepository, Usuario } from '../repositories/UsuariosRepository.js';

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
            email: usuarioBD.email
        };
    }
}