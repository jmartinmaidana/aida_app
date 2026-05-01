import { Request, Response } from 'express';
import { AuthenticationService } from '../services/authenticationService.js';
import { AuditoriaRepository } from '../repositories/auditoriaRepository.js';

export class AuthenticationController {
    
    // POST: Registro de usuario
    static async registrarAuthController(req: Request, res: Response) {
        const { username, password, nombre, email } = req.body;
        
        if (!username || !password || !nombre || !email) {
            const error = new Error("No se ingresaron todos los datos necesarios.") as Error & { statusCode: number };
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
            const error = new Error("Usuario y contraseña son obligatorios.") as Error & { statusCode: number };
            error.statusCode = 400;
            throw error;
        }

        const usuarioValidado = await AuthenticationService.login(username, password);
        
        if (!usuarioValidado) {
            const error = new Error("Credenciales incorrectas.") as Error & { statusCode: number };
            error.statusCode = 401; // 401 Unauthorized
            throw error;
        }

        // Si todo está bien, guardamos la sesión
        req.session.usuario = usuarioValidado;
        
        AuditoriaRepository.registrar(usuarioValidado.id, 'INICIO_SESION', 'El usuario inició sesión exitosamente.');
        
        res.status(200).json({ 
            estado: "exito", 
            mensaje: "Usuario logueado correctamente.",
            usuario: usuarioValidado 
        });
    }

    // POST: Logout
    // Nota: Como req.session.destroy usa un callback tradicional, no usamos catchAsync aquí.
    static logoutAuthController(req: Request, res: Response) {
        const usuarioId = req.session.usuario?.id;
        
        req.session.destroy((error) => {
            if (error) {
                return res.status(500).json({ estado: 'error', mensaje: 'No se pudo cerrar la sesión.' });
            }
            if (usuarioId) AuditoriaRepository.registrar(usuarioId, 'CIERRE_SESION', 'El usuario cerró sesión.');
            res.clearCookie('connect.sid'); 
            res.status(200).json({ estado: 'exito', mensaje: 'Sesión cerrada correctamente.' });
        });
    }

    // GET: Verificar sesión activa
    static verificarAuthController(req: Request, res: Response) {
        res.status(200).json({ estado: "exito", mensaje: "Sesión activa." });
    }

    static async activarCuentaController(req: Request, res: Response) {
        const { token, password } = req.body;
        
        if (!token || !password) {
            return res.status(400).json({ 
                estado: 'error', 
                mensaje: 'Faltan datos requeridos. Se necesita el token y la nueva contraseña.' 
            });
        }

        await AuthenticationService.activarCuenta(token, password);
        
        res.json({ 
            estado: 'exito', 
            mensaje: 'Cuenta activada correctamente. Ya puede iniciar sesión.' 
        });
    }

}