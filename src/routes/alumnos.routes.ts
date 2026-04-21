import { Router } from 'express';
import { AlumnosController } from '../controllers/alumnosController.js';
import { catchAsync } from '../middlewares/errorHandler.js';
import { requireAuthAPI } from '../middlewares/auth.middleware.js';

const router = Router();

router.get('/alumnos', requireAuthAPI, catchAsync(AlumnosController.obtenerTodosAlumnoPorPaginaController));
router.post('/alumno', requireAuthAPI, catchAsync(AlumnosController.crearAlumnoController));
router.put('/alumnos/:prefijo/:anio', requireAuthAPI, catchAsync(AlumnosController.actualizarAlumnoController));
router.delete('/alumnos/:prefijo/:anio', requireAuthAPI, catchAsync(AlumnosController.eliminarAlumnoController));
router.patch('/v0/archivo', requireAuthAPI, catchAsync(AlumnosController.cargarArchivoAlumnoController));

export default router;
