import { Pool } from 'pg'; // Cambiamos Client por Pool
import { readFile, writeFile } from 'fs/promises';
import { Fecha, textoAFecha, fechaAIsoString } from './fechas.js';
import dotenv from 'dotenv';
dotenv.config(); // Lectura del .env

export const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 20, // Número máximo de conexiones simultáneas en el pool
    idleTimeoutMillis: 30000, // Cierra las conexiones inactivas después de 30 segundos
});

export interface Alumno {
    lu: string;
    nombres: string;
    apellido: string;
    titulo: string | null;
    titulo_en_tramite: string | null;
    egreso: string | null;
    carrera_id?: number | null; 
}

type FiltroAlumnos = {fecha: Fecha} | {lu: string} | {uno: true}

export async function cargarNovedades(rutaArchivo: string ) {
    console.log("Cargando archivo en ruta:", rutaArchivo);
    try {
        const querySql = await readFile('./recursos/insert-ejemplo.sql', { encoding: 'utf8' });
        await pool.query(querySql);
        console.log("Datos cargados exitosamente en la base de datos.");
    } catch (error: any) {
        // Capturamos el error (ej. llave duplicada) para que el programa no se detenga
        // y pueda continuar con la generación del certificado.
        console.log("Aviso en la carga de novedades:", error.message);
    }
}


export async function obtenerCarreras() {
    let query = "SELECT id, nombre FROM aida.carreras ORDER BY id;";
    const res = await pool.query(query);
    return res.rows;    
}

export async function cargarAlumnosDesdeJson(alumnos: Alumno[]) {
    console.log(`Procesando carga de ${alumnos.length} alumnos desde JSON...`);
    
    let insertados = 0;
    for (const alumno of alumnos) {
        try {
            const query = `
                INSERT INTO aida.alumnos (lu, nombres, apellido, titulo, titulo_en_tramite, egreso) 
                VALUES ($1, $2, $3, $4, $5, $6)
            `;
            
            // Saneamiento defensivo para inserciones masivas
            const tituloTramite = alumno.titulo_en_tramite === "" ? null : alumno.titulo_en_tramite;
            const egreso = alumno.egreso === "" ? null : alumno.egreso;

            const valores = [alumno.lu, alumno.nombres, alumno.apellido, alumno.titulo, tituloTramite, egreso];
            
            await pool.query(query, valores); 
            insertados++;
        } catch (error: any) {
            console.error(`Error al insertar la LU ${alumno.lu}: ${error.message}`);
        }
    }
    return insertados;
}

export async function verificarCarreraAprobada(lu: string) {
    console.log(`Verificando estado de título para el alumno: ${lu}`);
    
    try {
        // Paso 1A: ¿Cuántas materias requiere su carrera? (Uniendo alumnos y plan_estudio)
        const queryRequeridas = `
            SELECT COUNT(pe.materia_id) as total_requeridas
            FROM aida.alumnos a
            JOIN aida.plan_estudio pe ON a.carrera_id = pe.carrera_id
            WHERE a.lu = $1;
        `;
        const resRequeridas = await pool.query(queryRequeridas, [lu]);
        // ParseInt asegura que tratemos el resultado como número y no como texto
        const totalRequeridas = parseInt(resRequeridas.rows[0].total_requeridas);

        // Paso 1B: ¿Cuántas materias tiene aprobadas en su cursada? (Su deducción exacta)
        const queryAprobadas = `
            SELECT COUNT(id) as total_aprobadas
            FROM aida.cursadas
            WHERE lu_alumno = $1 AND aprobada = true;
        `;
        const resAprobadas = await pool.query(queryAprobadas, [lu]);
        const totalAprobadas = parseInt(resAprobadas.rows[0].total_aprobadas);

        console.log(`Progreso académico: ${totalAprobadas} / ${totalRequeridas} materias aprobadas.`);

        // Paso 2: La evaluación lógica
        // (Agregamos totalRequeridas > 0 para evitar que alguien sin carrera se reciba por error)
        if (totalRequeridas > 0 && totalAprobadas >= totalRequeridas) {
            
        // Paso 3: La Acción Automática
        // Agregamos "AND egreso IS NULL" para blindar el dato. 
        // Si el alumno ya tenía fecha, esta consulta no hará nada y protegerá el dato original.
        const queryUpdate = `UPDATE aida.alumnos SET egreso = CURRENT_DATE WHERE lu = $1 AND egreso IS NULL;`;
        const resultadoUpdate = await pool.query(queryUpdate, [lu]);       
            
        // rowCount nos dice cuántas filas se modificaron realmente
        if (resultadoUpdate.rowCount && resultadoUpdate.rowCount > 0) {
            console.log("¡Carrera completada! Fecha de egreso registrada automáticamente.");
        } else {
            console.log("El alumno ya se encontraba egresado. La fecha original se mantuvo intacta.");
        }
            
        return true;
        }

        return false; // Aún le faltan materias

    } catch (error: any) {
        console.error("Error al verificar el título:", error.message);
        throw new Error("Fallo en la verificación automática de materias.");
    }
}

export async function cargarCursadaAprobada(lu: string, idMateria: string, año: string, cuatrimestre: string) {
    try {
        // 1. Obtener el ID real de la carrera del alumno
        const queryIDCarrera = "SELECT a.carrera_id FROM aida.alumnos a WHERE a.lu = $1;";
        const resultadoCarrera = await pool.query(queryIDCarrera, [lu]); 
        
        // Verificamos que el alumno exista y tenga una carrera asignada
        if (resultadoCarrera.rows.length === 0 || !resultadoCarrera.rows[0].carrera_id) {
            throw new Error("El alumno no existe o no tiene una carrera asignada.");
        }
        const idCarreraReal = resultadoCarrera.rows[0].carrera_id;

        // 2. Verificar si ESA materia específica pertenece a ESA carrera
        const queryCursadaValida = "SELECT 1 FROM aida.plan_estudio pe WHERE pe.carrera_id = $1 AND pe.materia_id = $2;";
        const cursadaValida = await pool.query(queryCursadaValida, [idCarreraReal, idMateria]);
        
        // 3. Evaluar y Ejecutar (Contando las filas)
        if (cursadaValida.rows.length > 0) {
            const queryInsert = "INSERT INTO aida.cursadas (lu_alumno, materia_id, anio, cuatrimestre, aprobada) VALUES ($1, $2, $3, $4, $5);";
            // Agregamos el 'true' al final del arreglo para el $5
            await pool.query(queryInsert, [lu, idMateria, año, cuatrimestre, true]);
        } else {
            // Lanzamos el error específico
            throw new Error("Cursada inválida: La materia no pertenece al plan de estudios de este alumno.");
        }
        
    } catch (error: any) {
        console.error("Error al cargar cursada aprobada:", error.message);
        // Lanzamos el error hacia arriba (server.ts) para que el frontend se entere
        throw new Error(error.message); 
    }
}

export async function conectarBD() {
    const clientePrueba = await pool.connect();
    clientePrueba.release(); // Libera la conexión para que vuelva al pool
}

export async function desconectarBD() {
    await pool.end();
}