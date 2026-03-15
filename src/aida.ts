import { Client } from 'pg';
import { readFile, writeFile } from 'fs/promises';
import { Fecha, textoAFecha, fechaAIsoString } from './fechas.js';
// Función 1: Encargada exclusivamente de cargar datos a la base

if (!process.env.DB_PASSWORD) {
    console.error("❌ ERROR FATAL: Falta la variable de entorno DB_PASSWORD.");
    console.error("Por favor, ejecute su archivo local-sets.bat antes de iniciar el migrador.");
    process.exit(1); // Detenemos la ejecución inmediatamente
}

export const client = new Client({
    user: process.env.DB_USER || 'aida_admin',
    password: process.env.DB_PASSWORD, // Ya no hay contraseñas hardcodeadas
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5433'),
    database: process.env.DB_NAME || 'aida_db'
});


export interface Alumno {
    lu: string;
    nombres: string;
    apellido: string;
    titulo: string | null;
    titulo_en_tramite: string | null;
    egreso: string;
}

type FiltroAlumnos = {fecha: Fecha} | {lu: string} | {uno: true}

export async function cargarNovedades(rutaArchivo: string ) {
    console.log("Cargando archivo en ruta:", rutaArchivo);
    try {
        const querySql = await readFile('./recursos/insert-ejemplo.sql', { encoding: 'utf8' });
        await client.query(querySql);
        console.log("Datos cargados exitosamente en la base de datos.");
    } catch (error: any) {
        // Capturamos el error (ej. llave duplicada) para que el programa no se detenga
        // y pueda continuar con la generación del certificado.
        console.log("Aviso en la carga de novedades:", error.message);
    }
}

export async function generarCertificadoAlumno(filtro: FiltroAlumnos, prefijoArchivo: string) {
    const alumnos = await obtenerAlumnoQueNecesitaCertificado(filtro);

    if (alumnos.length === 0) {
        throw new Error("No se encontró ningún alumno con los datos proporcionados.");
    }

    // --- NUEVAS REGLAS DE NEGOCIO PARA BÚSQUEDA POR LU ---
    if ('lu' in filtro) {
        const alumno = alumnos[0];
        
        // Regla 1: Debe tener fecha de egreso
        if (!alumno.egreso) {
            throw new Error("Operación rechazada: El alumno aún no tiene fecha de egreso registrada.");
        }
        
        // Regla 2: Debe haber solicitado el título
        if (!alumno.titulo_en_tramite) {
            throw new Error("Operación rechazada: El alumno no ha iniciado el trámite de título.");
        }
    }
    // -----------------------------------------------------

    const fechaEmision = new Date().toLocaleDateString('es-AR');
    const plantillaHtml = await readFile('./recursos/plantilla-certificado.html', { encoding: 'utf8' });

    // Iteramos sobre todos los alumnos encontrados
    for (const alumno of alumnos) {
        let htmlContent = plantillaHtml;
        htmlContent = htmlContent.replace('{{NOMBRES}}', alumno.nombres);
        htmlContent = htmlContent.replace('{{APELLIDO}}', alumno.apellido);
        htmlContent = htmlContent.replace('{{TITULO}}', alumno.titulo);
        htmlContent = htmlContent.replace('{{FECHA}}', fechaEmision);

        // Agregamos la LU al nombre del archivo, reemplazando la barra por un guión bajo
        const luSegura = alumno.lu.replace(/\//g, '_');
        const rutaCompleta = `./local-intercambio/salida/${prefijoArchivo}_${luSegura}.html`;
        
        await writeFile(rutaCompleta, htmlContent, { encoding: 'utf8' });
        console.log(`Certificado generado exitosamente en: ${rutaCompleta}`);
    }
}

export async function generarCertificadoPorLU(lu: string) {
    console.log(`Modo LU activado. Buscando libreta: ${lu}`);
    
    // Antes hacíamos el .replace() aquí. Ahora simplemente le pasamos 
    // la palabra 'certificado' como prefijo y la función central hará el resto.
    await generarCertificadoAlumno({ lu: lu }, 'certificado');
    
}

export async function generarCertifadosPorFecha(fechaStr: string) {
    console.log(`Modo fecha activado. Buscando alumnos para la fecha: ${fechaStr}`);
    const fechaConvertida = textoAFecha(fechaStr);
    
    // Antes armábamos el nombre con la fecha. Ahora pasamos un prefijo base
    // y la función central le agregará automáticamente la LU de cada alumno encontrado.
    await generarCertificadoAlumno({ fecha: fechaConvertida }, 'certificado_fecha');
}

export async function generarCertificadoAlumnoPrueba() {
    console.log("Modo prueba activado.");
    // A esta le pasamos el prefijo 'prueba'
    await generarCertificadoAlumno({ uno: true }, 'prueba');
}

async function obtenerAlumnoQueNecesitaCertificado(filtro: FiltroAlumnos) {
    // Agregamos egreso y titulo_en_tramite para poder evaluarlos en la generación
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
       // Agregamos el filtro de titulo_en_tramite para que solo genere los que ya lo solicitaron
        query += " WHERE egreso = $1 AND titulo_en_tramite IS NOT NULL";
        valores.push(fechaAIsoString(filtro.fecha));
    }
    
    const res = await client.query(query, valores);
    return res.rows; 
}

export async function obtenerAlumnosEnBD() {
    let query = "SELECT lu, nombres, apellido, titulo, titulo_en_tramite, egreso FROM aida.alumnos ORDER BY lu";
    const res = await client.query(query);
    return res.rows;    
}

export async function cargarAlumnoEnBD(alumno: Alumno) {
    console.log("Insertando alumno con LU:", alumno.lu);
    try {
        let query = "INSERT INTO aida.alumnos (lu, nombres, apellido, titulo, titulo_en_tramite, egreso) VALUES ($1, $2, $3, $4, $5, $6);";
        
        // Saneamiento defensivo: evitamos enviar "" a una columna DATE
        const tituloTramite = alumno.titulo_en_tramite === "" ? null : alumno.titulo_en_tramite;
        const egreso = alumno.egreso === "" ? null : alumno.egreso;

        const valores = [alumno.lu, alumno.nombres, alumno.apellido, alumno.titulo, tituloTramite, egreso];
        await client.query(query, valores);
    } catch (error) {
        throw new Error(`No se pudo cargar el alumno: ${(error as Error).message}`);
    }
}

export async function actualizarAlumnoEnBD(lu: string, valores: Alumno) {
    console.log("Actualizando alumno con LU:", lu);
    try {
        let query = "UPDATE aida.alumnos SET nombres = $1, apellido = $2, titulo = $3, titulo_en_tramite = $4, egreso = $5 WHERE lu = $6;";
        
        // Saneamiento defensivo
        const tituloTramite = valores.titulo_en_tramite === "" ? null : valores.titulo_en_tramite;
        const egreso = valores.egreso === "" ? null : valores.egreso;

        const nuevos_valores = [valores.nombres, valores.apellido, valores.titulo, tituloTramite, egreso, lu];
        await client.query(query, nuevos_valores);
    } catch (error) {
        throw new Error(`No se pudo actualizar el alumno: ${(error as Error).message}`);
    }
}

export async function eliminarAlumno(lu: string) {
    console.log("Eliminando alumno con LU:", lu);
    try {
        let query = "DELETE FROM aida.alumnos WHERE lu = $1;";
        const valor = [lu];
        await client.query(query, valor);
    } catch (error) {
        throw new Error(`No se pudo eliminar el alumno: ${(error as Error).message}`);
    }
}
// Exportamos una función para conectar
export async function conectarBD() {
    await client.connect();
}

// Exportamos una función para desconectar
export async function desconectarBD() {
    await client.end();
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
            
            await client.query(query, valores); 
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
        const resRequeridas = await client.query(queryRequeridas, [lu]);
        // ParseInt asegura que tratemos el resultado como número y no como texto
        const totalRequeridas = parseInt(resRequeridas.rows[0].total_requeridas);

        // Paso 1B: ¿Cuántas materias tiene aprobadas en su cursada? (Su deducción exacta)
        const queryAprobadas = `
            SELECT COUNT(id) as total_aprobadas
            FROM aida.cursadas
            WHERE lu_alumno = $1 AND aprobada = true;
        `;
        const resAprobadas = await client.query(queryAprobadas, [lu]);
        const totalAprobadas = parseInt(resAprobadas.rows[0].total_aprobadas);

        console.log(`Progreso académico: ${totalAprobadas} / ${totalRequeridas} materias aprobadas.`);

        // Paso 2: La evaluación lógica
        // (Agregamos totalRequeridas > 0 para evitar que alguien sin carrera se reciba por error)
        if (totalRequeridas > 0 && totalAprobadas >= totalRequeridas) {
            
        // Paso 3: La Acción Automática
        // Agregamos "AND egreso IS NULL" para blindar el dato. 
        // Si el alumno ya tenía fecha, esta consulta no hará nada y protegerá el dato original.
        const queryUpdate = `UPDATE aida.alumnos SET egreso = CURRENT_DATE WHERE lu = $1 AND egreso IS NULL;`;
        const resultadoUpdate = await client.query(queryUpdate, [lu]);       
            
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
        const resultadoCarrera = await client.query(queryIDCarrera, [lu]); 
        
        // Verificamos que el alumno exista y tenga una carrera asignada
        if (resultadoCarrera.rows.length === 0 || !resultadoCarrera.rows[0].carrera_id) {
            throw new Error("El alumno no existe o no tiene una carrera asignada.");
        }
        const idCarreraReal = resultadoCarrera.rows[0].carrera_id;

        // 2. Verificar si ESA materia específica pertenece a ESA carrera
        const queryCursadaValida = "SELECT 1 FROM aida.plan_estudio pe WHERE pe.carrera_id = $1 AND pe.materia_id = $2;";
        const cursadaValida = await client.query(queryCursadaValida, [idCarreraReal, idMateria]);
        
        // 3. Evaluar y Ejecutar (Contando las filas)
        if (cursadaValida.rows.length > 0) {
            const queryInsert = "INSERT INTO aida.cursadas (lu_alumno, materia_id, anio, cuatrimestre, aprobada) VALUES ($1, $2, $3, $4, $5);";
            // Agregamos el 'true' al final del arreglo para el $5
            await client.query(queryInsert, [lu, idMateria, año, cuatrimestre, true]);
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