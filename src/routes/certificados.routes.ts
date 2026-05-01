import { Router } from 'express';
import { CertificadoController } from '../controllers/certificadoController.js';
import { catchAsync } from '../middlewares/errorHandler.js';
import { requireAuthAPI, requireRole } from '../middlewares/auth.middleware.js';

const router = Router();

router.post('/v0/certificados_lu', requireAuthAPI, requireRole(['ADMIN']), catchAsync(CertificadoController.generarPorLuController));
router.post('/v0/tramite-titulo', requireAuthAPI, requireRole(['ADMIN']), catchAsync(CertificadoController.iniciarTramiteController));
router.post('/v0/certificados_fecha', requireAuthAPI, requireRole(['ADMIN']), catchAsync(CertificadoController.generarZipPorFechaController));

export default router;
