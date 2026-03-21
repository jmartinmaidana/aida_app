import { Request, Response } from 'express';
import { HistorialService } from '../services/historialService.js';

export class HistorialController {
    static async obtener(req: Request, res: Response) {

        const lu = `${req.params.prefijo}/${req.params.anio}`;
        
        const datosHistorial = await HistorialService.obtenerHistorialCompleto(lu);

        // 3. Devolvemos el JSON estructurado
        res.status(200).json({
            estado: "exito",
            ...datosHistorial 
        });
    }
}