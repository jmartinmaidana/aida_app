import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { AuthenticationController } from '../controllers/authenticationController.js';
import { catchAsync } from '../middlewares/errorHandler.js';
import { requireAuthAPI } from '../middlewares/auth.middleware.js';

const router = Router();
const aplicarRateLimit = process.env.NODE_ENV !== 'test';

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: aplicarRateLimit ? 5 : 1000,
    message: { estado: "error", mensaje: "Demasiados intentos de inicio de sesión. Por favor, intente nuevamente en 15 minutos." },
    standardHeaders: true, 
    legacyHeaders: false,
});

router.post('/register', catchAsync(AuthenticationController.registrarAuthController));
router.post('/login', loginLimiter, catchAsync(AuthenticationController.loginAuthController));
router.post('/logout', AuthenticationController.logoutAuthController);
router.get('/verificar', requireAuthAPI, AuthenticationController.verificarAuthController);

export default router;
