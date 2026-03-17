// src/services/CertificadoService.ts
import { pool } from '../aida.js';
import { readFile, writeFile } from 'fs/promises';
import { Fecha, textoAFecha, fechaAIsoString } from '../fechas.js';

type FiltroAlumnos = { fecha: Fecha } | { lu: string } | { uno: true };

export class CertificadoService {
    
    // El motor central (Privado porque solo se usa desde adentro de esta clase)
    private static async generarCertificadoAlumno(filtro: FiltroAlumnos, prefijoArchivo: string) {
        const alumnos = await this.obtenerAlumnoQueNecesitaCertificado(filtro);

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

    static async generarPrueba() {
        console.log("Modo prueba activado.");
        return await this.generarCertificadoAlumno({ uno: true }, 'prueba');
    }

    // Idealmente esto iría en el Repositorio, pero por ahora lo mantenemos aquí para no romper el flujo
    private static async obtenerAlumnoQueNecesitaCertificado(filtro: FiltroAlumnos) {
        let query = "SELECT lu, nombres, apellido, titulo, egreso, titulo_en_tramite FROM aida.alumnos";
        let valores: any[] = []; 

        if ('uno' in filtro) {
            query += " LIMIT 1";
        } 
        else if ('lu' in filtro) {
            query += " WHERE lu = $1";
            valores.push(filtro.lu); 
        }
        else if ('fecha' in filtro) {
            query += " WHERE egreso IS NOT NULL AND titulo_en_tramite = $1";
            valores.push(fechaAIsoString(filtro.fecha));
        }
        
        const res = await pool.query(query, valores);
        return res.rows; 
    }
}