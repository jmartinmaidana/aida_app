// src/services/CertificadoService.ts
import { pool } from '../database.js';
import { readFile, writeFile } from 'fs/promises';
import { Fecha, textoAFecha, isoAFecha, fechaAIsoString } from '../fechas.js';
import { AlumnoRepository } from '../repositories/AlumnosRepository.js';
import { tmpdir } from 'os'; // <--- IMPORTANTE: Detecta la carpeta temporal del SO
import { join, basename } from 'path'; // <--- IMPORTANTE: Une rutas correctamente (\ en Win, / en Linux)

export type FiltroAlumnos = { fecha: Fecha } | { lu: string } | { uno: true };

export class CertificadoService {
    
    private static async generarCertificadoAlumno(filtro: FiltroAlumnos, prefijoArchivo: string): Promise<string[]> {
        const alumnos = await AlumnoRepository.obtenerAlumnoQueNecesitaCertificado(filtro);
        
        if (alumnos.length === 0) {
            throw new Error("No se encontró ningún alumno con los datos proporcionados.");
        }

        const fechaEmision = new Date().toLocaleDateString('es-AR');
        const plantillaHtml = await readFile('./recursos/plantilla-certificado.html', { encoding: 'utf8' });
        
        const rutasGeneradas: string[] = []; 

        for (const alumno of alumnos) {
            let htmlContent = plantillaHtml;
            htmlContent = htmlContent.replace('{{NOMBRES}}', alumno.nombres);
            htmlContent = htmlContent.replace('{{APELLIDO}}', alumno.apellido);
            htmlContent = htmlContent.replace('{{TITULO}}', alumno.titulo || 'Título no especificado');
            htmlContent = htmlContent.replace('{{FECHA}}', fechaEmision);
            
            const luSegura = alumno.lu.replace(/\//g, '_');
            
            // CAMBIO CRÍTICO: Usamos join() y tmpdir() para que funcione en Windows
            const nombreArchivo = `${prefijoArchivo}_${luSegura}.html`;
            const rutaCompleta = join(tmpdir(), nombreArchivo);
            
            await writeFile(rutaCompleta, htmlContent, { encoding: 'utf8' });
            rutasGeneradas.push(rutaCompleta); 
            console.log(`Archivo generado en: ${rutaCompleta}`); // Log para verificar
        }
        
        return rutasGeneradas; 
    }

    static async generarPorLU(lu: string) {
        const rutas = await this.generarCertificadoAlumno({ lu: lu }, 'certificado');
        return rutas[0];
    }

    static async generarPorFecha(fechaStr: string) {
        const fechaConvertida = fechaStr.includes('-') ? isoAFecha(fechaStr) : textoAFecha(fechaStr);
        return await this.generarCertificadoAlumno({ fecha: fechaConvertida }, 'certificado_fecha'); 
    }
}