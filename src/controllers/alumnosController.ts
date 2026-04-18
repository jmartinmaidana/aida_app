import { Request, Response } from 'express';
import { AlumnosService } from '../services/alumnosService.js';
import { AlumnosRepository } from '../repositories/alumnosRepository.js';
import { alumnoSchema } from '../schemas_validator.js'; 
import { AuditoriaRepository } from '../repositories/auditoriaRepository.js';

export class AlumnosController {
    
    // GET: Obtener todos
    static async obtenerTodosAlumnoController(req: Request, res: Response) {
        const alumnos = await AlumnosRepository.obtenerTodos();
        res.status(200).json({ estado: "exito", datos: alumnos });
    }

    static async obtenerTodosAlumnoPorPaginaController(req: Request, res: Response) {
        // Extraemos los parámetros de la URL (Query Params). Usamos valores seguros por defecto.
        const pagina = parseInt(req.query.pagina as string) || 1;
        const limite = parseInt(req.query.limite as string) || 10;
        const busqueda = (req.query.busqueda as string) || "";

        // Llamamos al repositorio que acabamos de crear
        const resultado = await AlumnosRepository.obtenerPaginados(pagina, limite, busqueda);
        
        const totalPaginas = Math.ceil(resultado.total / limite);

        res.status(200).json({ 
            estado: "exito", 
            datos: resultado.alumnos,
            paginacion: {
                total: resultado.total,
                paginaActual: pagina,
                totalPaginas: totalPaginas === 0 ? 1 : totalPaginas
            }
        });
    }


    // POST: Crear individual
    static async crearAlumnoController(req: Request, res: Response) {
        const datosValidados = alumnoSchema.parse(req.body); 
        await AlumnosService.crearAlumno(datosValidados);
        
        await AuditoriaRepository.registrar(req.session.usuario!.id, 'CREAR_ALUMNO', `Creó al alumno LU: ${datosValidados.lu}`);
        
        res.status(200).json({ estado: "exito", mensaje: "Alumno creado correctamente." });
    }

    // PUT: Actualizar
    static async actualizarAlumnoController(req: Request, res: Response) {
        const lu = `${req.params.prefijo}/${req.params.anio}`;
        const datosValidados = alumnoSchema.parse(req.body);
        await AlumnosRepository.actualizar(lu, datosValidados);
        
        await AuditoriaRepository.registrar(req.session.usuario!.id, 'ACTUALIZAR_ALUMNO', `Actualizó datos del alumno LU: ${lu}`);
        
        res.status(200).json({ estado: "exito", mensaje: "Alumno actualizado correctamente." });
    }

    // DELETE: Eliminar
    static async eliminarAlumnoController(req: Request, res: Response) {
        const lu = `${req.params.prefijo}/${req.params.anio}`;
        await AlumnosRepository.eliminar(lu);
        
        await AuditoriaRepository.registrar(req.session.usuario!.id, 'ELIMINAR_ALUMNO', `Eliminó al alumno LU: ${lu}`);
        
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

        const { insertados, cantidadIgnorados, alumnosIgnorados } = await AlumnosService.cargarDesdeJson(datosAlumnos);
        
        await AuditoriaRepository.registrar(req.session.usuario!.id, 'CARGA_MASIVA_ALUMNOS', `Insertados: ${insertados} | Ignorados: ${cantidadIgnorados}`);
        
        res.status(200).json({ 
            estado: "exito", 
            insertados,
            ignorados: cantidadIgnorados,
            alumnosIgnorados,
            mensaje: "Carga masiva procesada."
        });
    }
}