import { Request, Response } from 'express';
import { AcademicoService } from '../services/academicoService.js';
import { AuditoriaRepository } from '../repositories/auditoriaRepository.js';
import { cargarCursadaSchema } from '../schemas_validator.js';

export class CursadaController {
    
    static async registrar(req: Request, res: Response) {
        const payload = req.body;
        const registrosRaw = Array.isArray(payload) ? payload : [payload];
        
        let procesados = 0;
        let ignorados = 0;
        let egresos = 0;
        const alumnosIgnorados: any[] = [];

        for (const raw of registrosRaw) {
            // 1. Validación individual (evita que Zod aborte todo el request)
            const validacion = cargarCursadaSchema.safeParse(raw);
            if (!validacion.success) {
                ignorados++;
                alumnosIgnorados.push({ lu: raw.lu || 'Desconocido', motivo_error: 'Datos inválidos (ej. nota fuera de rango o datos faltantes).' });
                continue;
            }

            const reg = validacion.data;
            const anio = reg.anio || reg.año;
            
            try {
                // 2. Validación de Reglas de Negocio
                const egreso = await AcademicoService.procesarCursadaAprobada(reg.lu, reg.idMateria.toString(), anio!.toString(), reg.cuatrimestre.toString(), reg.nota!);
                if (egreso) egresos++;
                procesados++;
            } catch (error: any) {
                ignorados++;
                alumnosIgnorados.push({ lu: reg.lu, motivo_error: error.message });
            }
        }

        if (procesados === 0 && ignorados > 0) return res.status(200).json({ estado: "error", mensaje: "No se pudo procesar ningún registro válido.", ignorados, alumnosIgnorados });

        await AuditoriaRepository.registrar(req.session.usuario!.id, 'CARGAR_CURSADA', `Cursadas masivas. Procesadas: ${procesados} | Ignoradas: ${ignorados}`);

        res.status(200).json({ 
            estado: "exito", 
            mensaje: procesados === 1 && ignorados === 0 ? "Cursada registrada exitosamente." : `Carga finalizada. Procesados: ${procesados}.`,
            procesados,
            ignorados,
            alumnosIgnorados,
            egresos
        });
    }
}