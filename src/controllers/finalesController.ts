import { Request, Response } from 'express';
import { FinalesService } from '../services/finalesService.js';
import { AuditoriaRepository } from '../repositories/auditoriaRepository.js';

export class FinalesController {
    
    static async registrar(req: Request, res: Response) {
        
        const { procesados, ignorados, alumnosIgnorados, egresos } = await FinalesService.registrarFinales(req.body);

        if (procesados === 0 && ignorados > 0) return res.status(200).json({ estado: "error", mensaje: "No se pudo procesar ningún registro válido.", ignorados, alumnosIgnorados });

        await AuditoriaRepository.registrar(
            req.session.usuario!.id, 
            'CARGAR_FINAL', 
            `Finales masivos. Procesados: ${procesados} | Ignorados: ${ignorados} | Egresos: ${egresos}`
        );

        res.status(200).json({ 
            estado: "exito", 
            mensaje: procesados === 1 && ignorados === 0 ? "Examen final registrado correctamente." : `Carga finalizada. Procesados: ${procesados}.`,
            procesados,
            ignorados,
            alumnosIgnorados,
            egresos
        });
    }
}
