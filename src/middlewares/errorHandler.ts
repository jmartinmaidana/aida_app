// src/middlewares/errorHandler.ts
import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export const catchAsync = (fn: Function) => {
    return (req: Request, res: Response, next: NextFunction) => {
        fn(req, res, next).catch(next);
    };
};

export const manejadorDeErrores = (err: any, req: Request, res: Response, next: NextFunction) => {  

    console.error("❌ Error detectado en el servidor:", err.message);

    if (err instanceof ZodError) {
        return res.status(400).json({
            estado: "error",
            mensaje: "Datos de entrada inválidos",
            detalles: err.issues 
        });
    }

    const statusCode = err.statusCode || 500;
    
    res.status(statusCode).json({
        estado: "error",
        mensaje: err.message || "Error interno del servidor"
    });
};