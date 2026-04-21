import { Router, Request, Response } from 'express';
import { HistorialController } from '../controllers/historialController.js';
import { PlanEstudiosController } from '../controllers/planEstudiosController.js';
import { CursadaController } from '../controllers/cursadaController.js';
import { CarrerasRepository } from '../repositories/carrerasRepository.js';
import { catchAsync } from '../middlewares/errorHandler.js';
import { requireAuthAPI } from '../middlewares/auth.middleware.js';

const router = Router();

router.get('/v0/historial/:prefijo/:anio', requireAuthAPI, catchAsync(HistorialController.obtener));
router.get('/v0/planes-estudio', requireAuthAPI, catchAsync(PlanEstudiosController.obtenerPlanesCompletosController));
router.post('/v0/cursada', requireAuthAPI, catchAsync(CursadaController.registrar));

router.get('/v0/carreras', requireAuthAPI, catchAsync(async (req: Request, res: Response) => {
    const carreras = await CarrerasRepository.obtenerCarreras();
    res.json(carreras);
}));

export default router;
