import { Request, Response } from 'express';
import { HistorialService } from '../services/historialService.js';

export class HistorialController {
    static async obtener(req: Request, res: Response) {

        const lu = `${req.params.prefijo}/${req.params.anio}`;
        const usuario = req.session.usuario!; // Sabemos que existe porque pasó el middleware
        
        // SEGURIDAD IDOR: Si es alumno, verificamos que su LU coincida estrictamente con la que está pidiendo
        if (usuario.rol === 'ALUMNO' && usuario.lu_alumno !== lu) {
            const error = new Error("Violación de seguridad: No tienes permisos para consultar el historial académico de otro estudiante.") as Error & { statusCode: number };
            error.statusCode = 403;
            throw error;
        }
        
        const datosHistorial = await HistorialService.obtenerHistorialCompleto(lu);

        // 3. Devolvemos el JSON estructurado
        res.status(200).json({
            estado: "exito",
            ...datosHistorial 
        });
    }
}