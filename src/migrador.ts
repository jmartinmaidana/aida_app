import { Client } from 'pg'; // Importamos Client directamente, no usamos el de aida.ts
import * as fs from 'fs/promises';
import * as path from 'path';


// Validamos de forma estricta que la variable de entorno exista
if (!process.env.DB_PASSWORD_OWNER) {
    console.error("❌ ERROR FATAL: Falta la variable de entorno DB_PASSWORD_OWNER.");
    console.error("Por favor, ejecute su archivo local-sets.bat antes de iniciar el migrador.");
    process.exit(1); // Detenemos la ejecución inmediatamente
}

const clientAdmin = new Client({
    user: process.env.DB_USER_OWNER || 'aida_owner',
    password: process.env.DB_PASSWORD_OWNER, // Ya no hay contraseñas hardcodeadas
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'aida_db'
});


async function ejecutarMigraciones() {
    try {
        await clientAdmin.connect();
        console.log("Conectado a la BD. Iniciando motor de migraciones...");

        // 1. Crear la tabla de historial (si no existe)
        // Esta tabla es vital: aquí anotamos qué archivos ya se ejecutaron
        await clientAdmin.query(`
            CREATE TABLE IF NOT EXISTS aida.migraciones_historial (
                id SERIAL PRIMARY KEY,
                nombre_archivo TEXT NOT NULL UNIQUE,
                fecha_ejecucion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // 2. Leer los archivos de la carpeta ./migraciones
        const rutaDirectorio = path.resolve('./migraciones');
        const archivos = await fs.readdir(rutaDirectorio);
        
        // Filtramos solo los .sql y los ordenamos alfabéticamente (001, 002, etc.)
        const archivosSql = archivos.filter(archivo => archivo.endsWith('.sql')).sort();

        // 3. Consultar qué migraciones ya están registradas en la base de datos
        const resultado = await clientAdmin.query('SELECT nombre_archivo FROM aida.migraciones_historial;');
        const migracionesEjecutadas = resultado.rows.map(fila => fila.nombre_archivo);

        // 4. Ejecutar solo las pendientes
        let ejecutadasHoy = 0;

        for (const archivo of archivosSql) {
            if (!migracionesEjecutadas.includes(archivo)) {
                console.log(`\n⏳ Ejecutando migración pendiente: ${archivo}...`);
                
                const rutaArchivo = path.join(rutaDirectorio, archivo);
                const scriptSql = await fs.readFile(rutaArchivo, { encoding: 'utf8' });

                try {
                    // INICIO DE TRANSACCIÓN: Si el script falla a la mitad, se revierte todo
                    await clientAdmin.query('BEGIN'); 
                    
                    // Ejecutamos el contenido del archivo .sql
                    await clientAdmin.query(scriptSql);
                    
                    // Anotamos en el historial que fue un éxito
                    await clientAdmin.query('INSERT INTO aida.migraciones_historial (nombre_archivo) VALUES ($1);', [archivo]);
                    
                    // CONFIRMAMOS LOS CAMBIOS
                    await clientAdmin.query('COMMIT'); 
                    console.log(`✅ Migración ${archivo} completada exitosamente.`);
                    ejecutadasHoy++;
                    
                } catch (error: any) {
                    // REVERSIÓN: Si hubo un error, deshacemos cualquier cambio parcial de esta migración
                    await clientAdmin.query('ROLLBACK');
                    console.error(`❌ ERROR CRÍTICO en ${archivo}. Se revirtieron los cambios.`);
                    console.error("Detalle:", error.message);
                    break; // Detenemos el motor, no seguimos con las demás
                }
            }
        }

        if (ejecutadasHoy === 0) {
            console.log("\n✅ La base de datos está completamente actualizada. No hay migraciones pendientes.");
        } else {
            console.log(`\n🎉 Proceso finalizado: ${ejecutadasHoy} migraciones aplicadas.`);
        }

    } catch (error: any) {
        console.error("Error al iniciar el motor de migraciones:", error.message);
    } finally {
        await clientAdmin.end();
    }
}

ejecutarMigraciones();