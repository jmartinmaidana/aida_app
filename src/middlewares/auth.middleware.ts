import { Request, Response, NextFunction } from 'express';

// Guardia para las páginas HTML heredadas (Redirige al login si no está autenticado)
export function requireAuth(req: Request, res: Response, next: NextFunction) {
    if (req.session.usuario) {
        next();
    } else {
        res.redirect('/app/login');
    }
}

// Guardia para la API (Devuelve un error JSON si no está autenticado)
export function requireAuthAPI(req: Request, res: Response, next: NextFunction) {
    if (req.session.usuario) {
        next();
    } else {
        res.status(401).json({ estado: 'error', mensaje: 'No autorizado. Debe iniciar sesión.' });
    }
}
