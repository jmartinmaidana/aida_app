import { FinalesRepository } from '../repositories/finalesRepository.js';
import { CursadasRepository } from '../repositories/cursadaRepository.js';
import { AcademicoService } from './academicoService.js';
import { pool } from '../database.js';
import { cargarFinalSchema } from '../schemas_validator.js';

export class FinalesService {
    
    static async registrarFinales(datos: any | any[]) {
        const registrosRaw = Array.isArray(datos) ? datos : [datos];
        
        let procesados = 0;
        let ignorados = 0;
        let egresos = 0;
        const alumnosIgnorados: any[] = [];
        
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            
            for (const raw of registrosRaw) {
                const validacion = cargarFinalSchema.safeParse(raw);
                if (!validacion.success) {
                    ignorados++;
                    alumnosIgnorados.push({ ...raw, motivo_error: 'Datos inválidos o incompletos.' });
                    continue;
                }

                const reg = validacion.data;
                const esAprobado = reg.aprobado !== undefined ? reg.aprobado : reg.nota >= 4;
                const fecha = reg.fecha || null;
                
                try {
                    // 1. Verificamos que el alumno tenga la cursada aprobada (regularizada)
                    const tieneCursadaAprobada = await CursadasRepository.verificarCursadaAprobada(reg.lu, reg.idMateria, client);
                    if (!tieneCursadaAprobada) {
                        throw new Error("El alumno no tiene la cursada aprobada (regularizada) para esta materia.");
                    }

                    await FinalesRepository.guardarFinal(reg.lu, reg.idMateria, reg.nota, esAprobado, fecha, client);
                    
                    // 2. Si aprueba el final, verificamos automáticamente si se recibe
                    if (esAprobado) {
                        const seRecibio = await AcademicoService.verificarCarreraAprobada(reg.lu, client);
                        if (seRecibio) egresos++;
                    }
                    
                    procesados++;
                } catch (error: any) {
                    ignorados++;
                    alumnosIgnorados.push({ ...raw, motivo_error: error.message });
                }
            }
            
            await client.query('COMMIT');
            return { procesados, ignorados, alumnosIgnorados, egresos };
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }
}
