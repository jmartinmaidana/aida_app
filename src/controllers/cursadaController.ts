import { Request, Response } from 'express';
import { CursadaService } from '../services/cursadaService.js';
export class CursadaController {
    
    static async registrar(req: Request, res: Response) {
        
        const { lu, idMateria, año, cuatrimestre, nota } = req.body;
        
        await CursadaService.verificarCursadaValida(lu, idMateria, año, cuatrimestre, nota);

        res.status(200).json({ 
            estado: "exito", 
            mensaje: "Cursada procesada y registrada correctamente." 
        });
    }
}