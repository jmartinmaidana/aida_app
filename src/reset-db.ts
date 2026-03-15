import { client, conectarBD, desconectarBD } from './aida.js';

async function resetearDatosGestion() {
    try {
        await conectarBD();
        console.log("Conectado a la base de datos para reseteo...");

        // Usamos TRUNCATE para vaciar las tablas rápido. 
        // CASCADE se encarga de las relaciones (claves foráneas).
        // IMPORTANTE: No incluimos 'aida.usuarios' en esta lista.
        const tablasALimpiar = [
            'aida.cursadas',
            'aida.plan_estudio',
            'aida.alumnos',
            'aida.materias',
            'aida.carreras'
        ];

        console.log("Limpiando tablas de gestión...");
        await client.query(`TRUNCATE TABLE ${tablasALimpiar.join(', ')} RESTART IDENTITY CASCADE;`);

        // Aquí puede agregar los INSERT de prueba que desee que siempre aparezcan después del reset
        console.log("Insertando datos de prueba iniciales...");
        await client.query(`
            INSERT INTO aida.carreras (nombre) VALUES ('Tecnicatura Web'), ('Ingeniería en Software');
            INSERT INTO aida.materias (nombre) VALUES ('Programación Inicial'), ('Bases de Datos');
        `);

        console.log("✅ Reseteo completado. La tabla de usuarios permanece intacta.");
    } catch (error: any) {
        console.error("❌ Error durante el reseteo:", error.message);
    } finally {
        await desconectarBD();
    }
}

resetearDatosGestion();