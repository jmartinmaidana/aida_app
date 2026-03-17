// src/services/CertificadoService.ts
import { pool } from '../database.js';
import { readFile, writeFile } from 'fs/promises';
import { Fecha, textoAFecha, fechaAIsoString } from '../fechas.js';
import { AlumnoRepository } from '../repositories/AlumnosRepository.js';

export type FiltroAlumnos = { fecha: Fecha } | { lu: string } | { uno: true };

export class CertificadoService {
    
    // El motor central (Privado porque solo se usa desde adentro de esta clase)
    private static async generarCertificadoAlumno(filtro: FiltroAlumnos, prefijoArchivo: string) {
        const alumnos = await AlumnoRepository.obtenerAlumnoQueNecesitaCertificado(filtro);

        if (alumnos.length === 0) {
            throw new Error("No se encontró ningún alumno con los datos proporcionados.");
        }

        // --- REGLAS DE NEGOCIO ---
        if ('lu' in filtro) {
            const alumno = alumnos[0];
            if (!alumno.egreso) {
                throw new Error("Operación rechazada: El alumno aún no tiene fecha de egreso registrada.");
            }
            if (!alumno.titulo_en_tramite) {
                throw new Error("Operación rechazada: El alumno no ha iniciado el trámite de título.");
            }
        }

        const fechaEmision = new Date().toLocaleDateString('es-AR');
        const plantillaHtml = await readFile('./recursos/plantilla-certificado.html', { encoding: 'utf8' });
        
        let rutaFinal = ''; 

        for (const alumno of alumnos) {
            let htmlContent = plantillaHtml;
            htmlContent = htmlContent.replace('{{NOMBRES}}', alumno.nombres);
            htmlContent = htmlContent.replace('{{APELLIDO}}', alumno.apellido);
            htmlContent = htmlContent.replace('{{TITULO}}', alumno.titulo);
            htmlContent = htmlContent.replace('{{FECHA}}', fechaEmision);
            
            const luSegura = alumno.lu.replace(/\//g, '_');
            const rutaCompleta = `/tmp/${prefijoArchivo}_${luSegura}.html`;
            
            await writeFile(rutaCompleta, htmlContent, { encoding: 'utf8' });
            rutaFinal = rutaCompleta; 
        }
        
        return rutaFinal; 
    }

    // Funciones Públicas que usará el servidor
    static async generarPorLU(lu: string) {
        console.log(`Modo LU activado. Buscando libreta: ${lu}`);
        return await this.generarCertificadoAlumno({ lu: lu }, 'certificado');
    }

    static async generarPorFecha(fechaStr: string) {
        console.log(`Modo fecha activado. Buscando alumnos para la fecha: ${fechaStr}`);
        const fechaConvertida = textoAFecha(fechaStr);
        return await this.generarCertificadoAlumno({ fecha: fechaConvertida }, 'certificado_fecha');
    }

}