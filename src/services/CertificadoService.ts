// src/services/CertificadoService.ts
import { pool } from '../database.js';
import { readFile, writeFile } from 'fs/promises';
import { Fecha, textoAFecha, isoAFecha, fechaAIsoString } from '../fechas.js';
import { AlumnoRepository } from '../repositories/AlumnosRepository.js';
import { tmpdir } from 'os';
import { join } from 'path';

export type FiltroAlumnos = { fecha: Fecha } | { lu: string } | { uno: true };

export class CertificadoService {
    
    private static async generarCertificadoAlumno(filtro: FiltroAlumnos, prefijoArchivo: string): Promise<string[]> {
        const alumnos = await AlumnoRepository.obtenerAlumnoQueNecesitaCertificado(filtro);
        if (alumnos.length === 0) {
            throw new Error("No se encontró ningún alumno con los datos proporcionados.");
        }

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
        
        const rutasGeneradas: string[] = []; 

        for (const alumno of alumnos) {
            let htmlContent = plantillaHtml;
            
            // Restauración de las inyecciones de datos en la plantilla
            htmlContent = htmlContent.replace('{{NOMBRES}}', alumno.nombres);
            htmlContent = htmlContent.replace('{{APELLIDO}}', alumno.apellido);
            htmlContent = htmlContent.replace('{{TITULO}}', alumno.titulo || 'Título no especificado');
            htmlContent = htmlContent.replace('{{FECHA}}', fechaEmision);
            
            const luSegura = alumno.lu.replace(/\//g, '_');
            
            // Generación de ruta segura multiplataforma
            const rutaCompleta = join(tmpdir(), `${prefijoArchivo}_${luSegura}.html`);
            
            await writeFile(rutaCompleta, htmlContent, { encoding: 'utf8' });
            rutasGeneradas.push(rutaCompleta); 
        }
        
        return rutasGeneradas; 
    }

    static async generarPorLU(lu: string) {
        console.log(`Modo LU activado. Buscando libreta: ${lu}`);
        const rutas = await this.generarCertificadoAlumno({ lu: lu }, 'certificado');
        return rutas[0];
    }

    static async generarPorFecha(fechaStr: string) {
        console.log(`Modo fecha activado. Buscando alumnos para la fecha: ${fechaStr}`);
        const fechaConvertida = fechaStr.includes('-') ? isoAFecha(fechaStr) : textoAFecha(fechaStr);
        return await this.generarCertificadoAlumno({ fecha: fechaConvertida }, 'certificado_fecha'); 
    }
}