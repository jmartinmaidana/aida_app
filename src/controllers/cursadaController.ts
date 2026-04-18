import { Request, Response } from 'express';
import { CursadaService } from '../services/cursadaService.js';
import { AuditoriaRepository } from '../repositories/auditoriaRepository.js';

export class CursadaController {
    
    static async registrar(req: Request, res: Response) {
        
        const { lu, idMateria, año, cuatrimestre, nota } = req.body;
        
        await CursadaService.verificarCursadaValida(lu, idMateria, año, cuatrimestre, nota);

        await AuditoriaRepository.registrar(req.session.usuario!.id, 'CARGAR_NOTA', `LU: ${lu} | Materia: ${idMateria} | Nota: ${nota}`);

        res.status(200).json({ 
            estado: "exito", 
            mensaje: "Cursada procesada y registrada correctamente." 
        });
    }
}