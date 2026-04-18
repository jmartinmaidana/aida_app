import pg from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

export default async function setup() {
    
    // Creamos un pool temporal solo para el setup usando la base de pruebas
    const testPool = new Pool({
        connectionString: process.env.TEST_DB_URL,
    });

    try {
        const migracionesDir = path.join(process.cwd(), 'migraciones');
        const archivos = fs.readdirSync(migracionesDir).filter(f => f.endsWith('.sql')).sort();
        
        for (const archivo of archivos) {
            const sqlPath = path.join(migracionesDir, archivo);
            const sql = fs.readFileSync(sqlPath, 'utf8');
            await testPool.query(sql);
        }
        
        console.log('✅ Base de datos de prueba sincronizada y tablas creadas.\n');
    } catch (error) {
        console.error('❌ Error crítico inicializando la base de datos de prueba:', error);
        process.exit(1);
    } finally {
        // Cerramos este pool temporal para que Jest pueda continuar
        await testPool.end();
    }
}