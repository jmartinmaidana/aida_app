import { Request, Response } from 'express';
import { InscripcionesRepository } from '../repositories/inscripcionesRepository.js';
import { 
    inscribirMateriaAPeriodoSchema, 
    periodoSchema, 
    inscribirAlumnoSchema, 
    actualizarCursadaSchema 
} from '../schemas_validator.js';

export class InscripcionesController {
    
    // ==========================================
    // RUTAS PARA ADMINISTRADORES
    // ==========================================

    static async crearPeriodo(req: Request, res: Response): Promise<void> {
        try {
            const datos = periodoSchema.parse(req.body);
            const periodo = await InscripcionesRepository.crearPeriodo(datos.anio.toString(), datos.cuatrimestre.toString(), datos);
            res.json({ estado: 'exito', mensaje: 'Fechas del período guardadas exitosamente.', datos: periodo });
        } catch (error: any) {
            res.status(400).json({ estado: 'error', mensaje: error.message });
        }
    }

    static async inscribirMateriaAPeriodo(req: Request, res: Response): Promise<void> {
        try {
            const datos = inscribirMateriaAPeriodoSchema.parse(req.body);
            const apertura = await InscripcionesRepository.inscribirMateriaAPeriodo(
                datos.materia_id.toString(), 
                datos.anio.toString(), 
                datos.cuatrimestre.toString()
            );
            res.json({ estado: 'exito', mensaje: 'Materia planificada en el periodo.', datos: apertura });
        } catch (error: any) {
            res.status(400).json({ estado: 'error', mensaje: error.message });
        }
    }

    static async eliminarMateriaDePeriodo(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            await InscripcionesRepository.eliminarMateriaDePeriodo(id as string);
            res.json({ estado: 'exito', mensaje: 'Materia eliminada del período exitosamente.' });
        } catch (error: any) {
            res.status(400).json({ estado: 'error', mensaje: error.message });
        }
    }

    static async abrirInscripciones(req: Request, res: Response): Promise<void> {
        try {
            const datos = periodoSchema.parse(req.body);
            await InscripcionesRepository.abrirInscripciones(datos.anio.toString(), datos.cuatrimestre.toString());
            res.json({ estado: 'exito', mensaje: 'Inscripciones abiertas exitosamente.' });
        } catch (error: any) {
            res.status(400).json({ estado: 'error', mensaje: error.message });
        }
    }

    static async cerrarInscripciones(req: Request, res: Response): Promise<void> {
        try {
            const datos = periodoSchema.parse(req.body);
            await InscripcionesRepository.cerrarInscripciones(datos.anio.toString(), datos.cuatrimestre.toString());
            res.json({ estado: 'exito', mensaje: 'Inscripciones cerradas. El periodo está en curso.' });
        } catch (error: any) {
            res.status(400).json({ estado: 'error', mensaje: error.message });
        }
    }

    static async obtenerMateriasPorPeriodoAdmin(req: Request, res: Response): Promise<void> {
        try {
            const oferta = await InscripcionesRepository.obtenerMateriasPorPeriodoAdmin();
            res.json({ estado: 'exito', datos: oferta });
        } catch (error: any) {
            res.status(500).json({ estado: 'error', mensaje: 'Error interno del servidor.' });
        }
    }

    static async actualizarEstadoCursada(req: Request, res: Response): Promise<void> {
        try {
            const cursadaId = parseInt(req.params.id as string, 10);
            const datos = actualizarCursadaSchema.parse(req.body);
            
            const actualizada = await InscripcionesRepository.actualizarEstadoCursada(cursadaId, datos.estado, datos.nota || null);
            res.json({ estado: 'exito', mensaje: 'Estado de la cursada actualizado.', datos: actualizada });
        } catch (error: any) {
            res.status(400).json({ estado: 'error', mensaje: error.message });
        }
    }

    // ==========================================
    // RUTAS PARA ALUMNOS
    // ==========================================

    static async obtenerMateriasPorPeriodoAlumno(req: Request, res: Response): Promise<void> {
        try {
            const lu = req.session.usuario!.lu_alumno as string;
            const oferta = await InscripcionesRepository.obtenerMateriasPorPeriodoAlumno(lu);
            res.json({ estado: 'exito', datos: oferta });
        } catch (error: any) {
            res.status(500).json({ estado: 'error', mensaje: 'Error interno del servidor.' });
        }
    }

    static async inscribirAlumno(req: Request, res: Response): Promise<void> {
        try {
            const datos = inscribirAlumnoSchema.parse(req.body);
            // Intentamos hacer la inscripción
            const inscripcion = await InscripcionesRepository.inscribirAlumno(
                datos.lu, 
                datos.materia_id.toString(), 
                datos.anio.toString(), 
                datos.cuatrimestre.toString()
            );
            res.json({ estado: 'exito', mensaje: 'Te has inscrito correctamente.', datos: inscripcion });
        } catch (error: any) {
            // Capturamos las reglas de negocio ("La materia está cerrada", "Ya estás inscrito")
            res.status(400).json({ estado: 'error', mensaje: error.message });
        }
    }
}