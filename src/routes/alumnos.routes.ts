import { Router } from 'express';
import { AlumnosController } from '../controllers/alumnosController.js';
import { catchAsync } from '../middlewares/errorHandler.js';
import { requireAuthAPI, requireRole } from '../middlewares/auth.middleware.js';

const router = Router();

router.get('/alumnos', requireAuthAPI, requireRole(['ADMIN']), catchAsync(AlumnosController.obtenerTodosAlumnoPorPaginaController));
router.post('/alumno', requireAuthAPI, requireRole(['ADMIN']), catchAsync(AlumnosController.crearAlumnoController));
router.put('/alumnos/:prefijo/:anio', requireAuthAPI, requireRole(['ADMIN']), catchAsync(AlumnosController.actualizarAlumnoController));
router.delete('/alumnos/:prefijo/:anio', requireAuthAPI, requireRole(['ADMIN']), catchAsync(AlumnosController.eliminarAlumnoController));
router.patch('/v0/archivo', requireAuthAPI, requireRole(['ADMIN']), catchAsync(AlumnosController.cargarArchivoAlumnoController));

export default router;
