// src/services/CertificadoService.ts
import { pool } from '../database.js';
import { readFile, writeFile } from 'fs/promises';
import { Fecha, textoAFecha, isoAFecha, fechaAIsoString } from '../fechas.js';
import { AlumnoRepository } from '../repositories/AlumnosRepository.js';

export type FiltroAlumnos = { fecha: Fecha } | { lu: string } | { uno: true };

export class CertificadoService {
    
    // El motor ahora devuelve un arreglo de strings (string[])
    private static async generarCertificadoAlumno(filtro: FiltroAlumnos, prefijoArchivo: string): Promise<string[]> {
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
        
        // REEMPLAZAMOS rutaFinal POR UN ARREGLO
        const rutasGeneradas: string[] = []; 

        for (const alumno of alumnos) {
            let htmlContent = plantillaHtml;
            htmlContent = htmlContent.replace('{{NOMBRES}}', alumno.nombres);
            // ... (los demás reemplazos quedan igual) ...
            
            const luSegura = alumno.lu.replace(/\//g, '_');
            const rutaCompleta = `/tmp/${prefijoArchivo}_${luSegura}.html`;
            
            await writeFile(rutaCompleta, htmlContent, { encoding: 'utf8' });
            
            // AGREGAMOS LA RUTA A LA LISTA
            rutasGeneradas.push(rutaCompleta); 
        }
        
        return rutasGeneradas; 
    }

    // Funciones Públicas
    static async generarPorLU(lu: string) {
        console.log(`Modo LU activado. Buscando libreta: ${lu}`);
        const rutas = await this.generarCertificadoAlumno({ lu: lu }, 'certificado');
        return rutas[0]; // Como es uno solo, devolvemos el primer elemento
    }

    static async generarPorFecha(fechaStr: string) {
        console.log(`Modo fecha activado. Buscando alumnos para la fecha: ${fechaStr}`);
        const fechaConvertida = fechaStr.includes('-') ? isoAFecha(fechaStr) : textoAFecha(fechaStr);
        // Retornamos la lista completa de rutas generadas
        return await this.generarCertificadoAlumno({ fecha: fechaConvertida }, 'certificado_fecha'); 
    }
}

