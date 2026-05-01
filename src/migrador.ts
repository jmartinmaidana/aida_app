import { Client } from 'pg'; 
import * as fs from 'fs/promises';
import * as path from 'path';
import dotenv from 'dotenv';
dotenv.config();

// El migrador usará preferentemente MIGRATOR_DATABASE_URL (con permisos altos). 
// Si no existe, usará DATABASE_URL como respaldo (comportamiento anterior).
const dbUrl = process.env.MIGRATOR_DATABASE_URL || process.env.DATABASE_URL;

if (!dbUrl) {
    console.error("❌ ERROR FATAL: Falta la variable de entorno MIGRATOR_DATABASE_URL o DATABASE_URL.");
    console.error("Asegúrese de tener su archivo .env configurado o la variable en Render.");
    process.exit(1);
}

const clientAdmin = new Client({ connectionString: dbUrl });

async function ejecutarMigraciones() {
    try {
        await clientAdmin.connect();
        console.log("Conectado a la BD. Iniciando motor de migraciones...");

        await clientAdmin.query(`
            CREATE TABLE IF NOT EXISTS aida.migraciones_historial (
                id SERIAL PRIMARY KEY,
                nombre_archivo TEXT NOT NULL UNIQUE,
                fecha_ejecucion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        const rutaDirectorio = path.resolve('./migraciones');
        const archivos = await fs.readdir(rutaDirectorio);
        
        const archivosSql = archivos.filter(archivo => archivo.endsWith('.sql')).sort();

        const resultado = await clientAdmin.query('SELECT nombre_archivo FROM aida.migraciones_historial;');
        const migracionesEjecutadas = resultado.rows.map(fila => fila.nombre_archivo);

        let ejecutadasHoy = 0;

        for (const archivo of archivosSql) {
            if (!migracionesEjecutadas.includes(archivo)) {
                console.log(`\n⏳ Ejecutando migración pendiente: ${archivo}...`);
                
                const rutaArchivo = path.join(rutaDirectorio, archivo);
                const scriptSql = await fs.readFile(rutaArchivo, { encoding: 'utf8' });

                try {
                    await clientAdmin.query('BEGIN'); 
                    
                    await clientAdmin.query(scriptSql);
                    
                    await clientAdmin.query('INSERT INTO aida.migraciones_historial (nombre_archivo) VALUES ($1);', [archivo]);
                    
                    await clientAdmin.query('COMMIT'); 
                    console.log(`✅ Migración ${archivo} completada exitosamente.`);
                    ejecutadasHoy++;
                    
                } catch (error: any) {
                    await clientAdmin.query('ROLLBACK');
                    console.error(`❌ ERROR CRÍTICO en ${archivo}. Se revirtieron los cambios.`);
                    console.error("Detalle:", error.message);
                    break; 
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