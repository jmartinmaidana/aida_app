import { Request, Response } from 'express';
import { PlanEstudiosRepository } from '../repositories/planEstudiosRepository.js';

export class PlanEstudiosController {
    
    static async obtenerPlanesCompletosController(req: Request, res: Response) {
        const planes = await PlanEstudiosRepository.obtenerPlanesCompletos();
        res.status(200).json({ estado: "exito", datos: planes });
    }
}
