import { Router } from 'express';
import authRoutes from './auth.routes.js';
import alumnosRoutes from './alumnos.routes.js';
import certificadosRoutes from './certificados.routes.js';
import academicosRoutes from './academicos.routes.js';

const router = Router();

router.use('/v0/auth', authRoutes);

router.use('/', alumnosRoutes);
router.use('/', certificadosRoutes);
router.use('/', academicosRoutes);

export default router;
