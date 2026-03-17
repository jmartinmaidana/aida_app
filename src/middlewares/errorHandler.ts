// src/middlewares/errorHandler.ts
import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

/**
 * 1. El Envoltorio Asíncrono (catchAsync)
 * Toma su función de ruta, la ejecuta, y si algo falla, 
 * atrapa el error y lo envía automáticamente al Interceptor Global usando next(err).
 */
export const catchAsync = (fn: Function) => {
    return (req: Request, res: Response, next: NextFunction) => {
        fn(req, res, next).catch(next);
    };
};

/**
 * 2. El Interceptor Global (Manejador de Errores)
 * Express reconoce automáticamente que es un manejador de errores porque tiene 4 parámetros.
 */
export const manejadorDeErrores = (err: any, req: Request, res: Response, next: NextFunction) => {  
    // Logueamos el error en la consola del servidor para poder depurarlo nosotros
    console.error("❌ Error detectado en el servidor:", err.message);

    // Si el error fue causado por nuestro escudo Zod (Validación de datos)
    if (err instanceof ZodError) {
        return res.status(400).json({
            estado: "error",
            mensaje: "Datos de entrada inválidos",
            detalles: err.issues // Le enviamos al frontend exactamente qué campo falló
        });
    }

    // Si es un error de regla de negocio o de base de datos
    // Si el error trae un código de estado específico lo usamos, si no, asumimos que es un 500 (Error de Servidor)
    const statusCode = err.statusCode || 500;
    
    // Le enviamos la respuesta limpia al usuario
    res.status(statusCode).json({
        estado: "error",
        mensaje: err.message || "Error interno del servidor"
    });
};