import { AlumnosRepository } from '../repositories/alumnosRepository.js';
import { CarrerasRepository } from '../repositories/carrerasRepository.js';
import { Alumno } from '../database.js';
import { alumnoSchema } from '../schemas_validator.js';
import { ZodError } from 'zod';
import { UsuariosRepository } from '../repositories/usuariosRepository.js';
import { EmailService } from './emailService.js';
import crypto from 'crypto';

export class AlumnosService {
    
    private static async validarYCompletarAlumno(alumno: Alumno): Promise<Alumno> {

        if (!alumno.carrera_id) {
            throw new Error(`El alumno ${alumno.lu} no tiene una carrera asignada (carrera_id es obligatorio).`);
        }

        const tituloPorDefecto = await CarrerasRepository.obtenerTituloPorId(alumno.carrera_id);
        if (!tituloPorDefecto) {
            throw new Error(`La carrera con ID ${alumno.carrera_id} no existe en la base de datos.`);
        }

        return {
            ...alumno,
            titulo: tituloPorDefecto,
            titulo_en_tramite: alumno.titulo_en_tramite === "" ? null : alumno.titulo_en_tramite,
            egreso: alumno.egreso === "" ? null : alumno.egreso
        };
    }

// Método para la Carga Masiva (CSV/JSON)
    static async cargarDesdeJson(alumnos: Alumno[]) {

        let insertados = 0;
        let cantidadIgnorados = 0;
        const alumnosIgnorados: (Alumno & { motivo_error: string })[] = [];
        
        const alumnosValidosParaInsertar: Alumno[] = [];
        const cacheTitulos = new Map<number, string>();

        for (const alumno of alumnos) {
            try {
                // Reutilizamos Zod para limpiar (sanitizar), formatear y aplicar reglas de negocio estrictas
                const alumnoLimpio = alumnoSchema.parse(alumno);
                
                // Validación de carrera con Caché (Evita problema N+1 consultas a BD)
                if (!alumnoLimpio.carrera_id) {
                    throw new Error(`El alumno ${alumnoLimpio.lu} no tiene una carrera asignada.`);
                }

                if (!cacheTitulos.has(alumnoLimpio.carrera_id)) {
                    const titulo = await CarrerasRepository.obtenerTituloPorId(alumnoLimpio.carrera_id);
                    if (!titulo) {
                        throw new Error(`La carrera con ID ${alumnoLimpio.carrera_id} no existe en la base de datos.`);
                    }
                    cacheTitulos.set(alumnoLimpio.carrera_id, titulo);
                }

                const alumnoValidado: Alumno = {
                    ...(alumnoLimpio as Alumno),
                    titulo: cacheTitulos.get(alumnoLimpio.carrera_id) || null,
                    titulo_en_tramite: alumnoLimpio.titulo_en_tramite === "" ? null : alumnoLimpio.titulo_en_tramite,
                    egreso: alumnoLimpio.egreso === "" ? null : alumnoLimpio.egreso
                };
                
                alumnosValidosParaInsertar.push(alumnoValidado);
                
            } catch (error: unknown) {
                cantidadIgnorados++;
                
                let motivo = "Error desconocido";
                if (error instanceof Error) {
                    motivo = error.message;
                }
                if (error instanceof ZodError) {
                    // Extraemos los mensajes amigables de Zod utilizando 'issues'
                    motivo = error.issues.map(e => e.message).join(' | ');
                }
                
                alumnosIgnorados.push({ ...alumno, motivo_error: motivo });
                console.error(`❌ Error al procesar la LU ${alumno.lu || 'desconocida'}: ${motivo}`);
            }
        }
        
        // Insertamos todo el lote válido de una sola vez en la base de datos
        if (alumnosValidosParaInsertar.length > 0) {
            const lusInsertadas = await AlumnosRepository.insertarLote(alumnosValidosParaInsertar);
            insertados = lusInsertadas.length;

            // Comparamos para ver cuáles fueron ignorados por estar duplicados (ON CONFLICT)
            const setInsertadas = new Set(lusInsertadas);
            for (const alumno of alumnosValidosParaInsertar) {
                if (!setInsertadas.has(alumno.lu)) {
                    cantidadIgnorados++;
                    alumnosIgnorados.push({ ...alumno, motivo_error: "El alumno ya existe en la base de datos." });
                }
            }
        }

        return { insertados, cantidadIgnorados, alumnosIgnorados };
    }

    // Cambiamos 'Alumno' por 'any' temporalmente para permitir que traiga el email extra
    static async crearAlumno(alumno: any) {
        const alumnoValidado = await this.validarYCompletarAlumno(alumno);
        await AlumnosRepository.crear(alumnoValidado);

        // NUEVO: Si nos enviaron un email, le creamos el usuario y le mandamos el Link Mágico
        if (alumno.email) {
            try {
                const nombreCompleto = `${alumnoValidado.nombres} ${alumnoValidado.apellido}`;
                
                const nuevoUsuario = await UsuariosRepository.crearUsuarioAlumno(alumnoValidado.lu, nombreCompleto, alumno.email);
                
                const tokenMagico = crypto.randomInt(100000, 1000000).toString(); // Genera un código numérico seguro de 6 dígitos (ej: "482910")
                await UsuariosRepository.guardarTokenActivacion(nuevoUsuario.id, tokenMagico);
                
                await EmailService.enviarCorreoActivacion(alumno.email, tokenMagico);
            } catch (error) {
                console.error(`⚠️ El alumno se guardó, pero falló la creación de su cuenta web:`, error);
            }
        }
    }

    
}