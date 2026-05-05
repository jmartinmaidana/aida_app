import { Router } from 'express';
import { InscripcionesController } from '../controllers/inscripcionesController.js';
// ⚠️ Importante: Ajusta esta línea para importar tus middlewares reales de seguridad
import { requireAuthAPI, requireRole } from '../middlewares/authMiddleware.js'; 

const router = Router();

// 1. Barrera principal: Ninguna de estas rutas es pública. Se requiere sesión activa.
router.use(requireAuthAPI);

// ==========================================
// RUTAS PARA ADMINISTRADORES
// ==========================================

router.post('/periodo', requireRole(['ADMIN']), InscripcionesController.crearPeriodo);
router.post('/planificar', requireRole(['ADMIN']), InscripcionesController.inscribirMateriaAPeriodo);
router.delete('/planificar/:id', requireRole(['ADMIN']), InscripcionesController.eliminarMateriaDePeriodo);
router.post('/abrir', requireRole(['ADMIN']), InscripcionesController.abrirInscripciones);
router.post('/cerrar', requireRole(['ADMIN']), InscripcionesController.cerrarInscripciones);
router.get('/admin/periodos_lectivos', requireRole(['ADMIN']), InscripcionesController.obtenerMateriasPorPeriodoAdmin);
router.patch('/cursada/:id/estado', requireRole(['ADMIN']), InscripcionesController.actualizarEstadoCursada);

// ==========================================
// RUTAS PARA ALUMNOS
// ==========================================

router.get('/oferta', requireRole(['ALUMNO']), InscripcionesController.obtenerMateriasPorPeriodoAlumno);
router.post('/inscribir', requireRole(['ALUMNO']), InscripcionesController.inscribirAlumno);

export default router;
