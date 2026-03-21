import { Request, Response } from 'express';
import { AuthenticationService } from '../services/authenticationService.js';

export class AuthenticationController {
    
    // POST: Registro de usuario
    static async registrarAuthController(req: Request, res: Response) {
        const { username, password, nombre, email } = req.body;
        
        if (!username || !password || !nombre || !email) {
            const error: any = new Error("No se ingresaron todos los datos necesarios.");
            error.statusCode = 400;
            throw error;
        }
        
        await AuthenticationService.registrarUsuario(username, password, nombre, email);
        res.status(200).json({ estado: "exito", mensaje: "Usuario registrado correctamente." });
    }

    // POST: Login de usuario
    static async loginAuthController(req: Request, res: Response) {
        const { username, password } = req.body;
        
        if (!username || !password) {
            const error: any = new Error("Usuario y contraseña son obligatorios.");
            error.statusCode = 400;
            throw error;
        }

        const usuarioValidado = await AuthenticationService.login(username, password);
        
        if (!usuarioValidado) {
            const error: any = new Error("Credenciales incorrectas.");
            error.statusCode = 401; // 401 Unauthorized
            throw error;
        }

        // Si todo está bien, guardamos la sesión
        req.session.usuario = usuarioValidado;
        res.status(200).json({ estado: "exito", mensaje: "Usuario logueado correctamente." });
    }

    // POST: Logout
    // Nota: Como req.session.destroy usa un callback tradicional, no usamos catchAsync aquí.
    static logoutAuthController(req: Request, res: Response) {
        req.session.destroy((error) => {
            if (error) {
                return res.status(500).json({ estado: 'error', mensaje: 'No se pudo cerrar la sesión.' });
            }
            res.clearCookie('connect.sid'); 
            res.status(200).json({ estado: 'exito', mensaje: 'Sesión cerrada correctamente.' });
        });
    }

    // GET: Verificar sesión activa
    static verificarAuthController(req: Request, res: Response) {
        res.status(200).json({ estado: "exito", mensaje: "Sesión activa." });
    }
}