import { Request, Response } from 'express';
import { AlumnoService } from '../services/alumnoService.js';
import { AlumnoRepository } from '../repositories/alumnosRepository.js';
import { alumnoSchema } from '../schemas_validator.js'; 

export class AlumnoController {
    
    // GET: Obtener todos
    static async obtenerTodosAlumnoController(req: Request, res: Response) {
        const alumnos = await AlumnoRepository.obtenerTodos();
        res.status(200).json({ estado: "exito", datos: alumnos });
    }

    // POST: Crear individual
    static async crearAlumnoController(req: Request, res: Response) {
        const datosValidados = alumnoSchema.parse(req.body); 
        await AlumnoService.crearAlumno(datosValidados);
        res.status(200).json({ estado: "exito", mensaje: "Alumno creado correctamente." });
    }

    // PUT: Actualizar
    static async actualizarAlumnoController(req: Request, res: Response) {
        const lu = `${req.params.prefijo}/${req.params.anio}`;
        const datosValidados = alumnoSchema.parse(req.body);
        await AlumnoRepository.actualizar(lu, datosValidados);
        res.status(200).json({ estado: "exito", mensaje: "Alumno actualizado correctamente." });
    }

    // DELETE: Eliminar
    static async eliminarAlumnoController(req: Request, res: Response) {
        const lu = `${req.params.prefijo}/${req.params.anio}`;
        await AlumnoRepository.eliminar(lu);
        res.status(200).json({ estado: "exito", mensaje: "Alumno eliminado correctamente." });
    }

    // PATCH: Carga masiva desde JSON
    static async cargarArchivoAlumnoController(req: Request, res: Response) {
        const datosAlumnos = req.body;
        
        if (!Array.isArray(datosAlumnos)) {
            const error: any = new Error("El formato debe ser un arreglo JSON.");
            error.statusCode = 400;
            throw error;
        }

        const insertados = await AlumnoService.cargarDesdeJson(datosAlumnos);
        res.status(200).json({ 
            estado: "exito", 
            mensaje: `Se insertaron ${insertados} alumnos en la base de datos.` 
        });
    }
}