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
        const sqlPath = path.join(process.cwd(), 'migraciones', '001_esquema_inicial.sql');

        if (!fs.existsSync(sqlPath)) {
            throw new Error(`No se encontró el archivo SQL en: ${sqlPath}`);
        }

        const sql = fs.readFileSync(sqlPath, 'utf8');
        
        // Ejecutamos el script en la base de TEST
        await testPool.query(sql);
        
        console.log('✅ Base de datos de prueba sincronizada y tablas creadas.\n');
    } catch (error) {
        console.error('❌ Error crítico inicializando la base de datos de prueba:', error);
        process.exit(1);
    } finally {
        // Cerramos este pool temporal para que Jest pueda continuar
        await testPool.end();
    }
}