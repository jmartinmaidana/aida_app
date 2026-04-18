import { pool, conectarBD, desconectarBD } from './database.js';

async function resetearDatosGestion() {
    console.log(` ATENCIÓN: Iniciando script de reseteo de base de datos...`);
    
    try {
        await conectarBD();
        console.log("Conectado a la base de datos para reseteo...");

        const tablasALimpiar = [
            'aida.auditoria',
            'aida.cursadas',
            'aida.plan_estudio',
            'aida.alumnos',
            'aida.materias',
            'aida.carreras'
        ];

        console.log("Limpiando tablas de gestión y reiniciando contadores...");
        await pool.query(`TRUNCATE TABLE ${tablasALimpiar.join(', ')} RESTART IDENTITY CASCADE;`);

        // 1. Insertamos Carreras (IDs generados: 1, 2, 3)
        console.log("Insertando carreras...");
        await pool.query(`
            INSERT INTO aida.carreras (nombre) VALUES 
            ('Tecnicatura Web'),             -- ID 1
            ('Ingeniería en Software'),      -- ID 2
            ('Licenciatura en Sistemas');    -- ID 3
        `);

        // 2. Insertamos Materias (IDs generados: 1 al 6)
        console.log("Insertando materias...");
        await pool.query(`
            INSERT INTO aida.materias (nombre) VALUES 
            ('Programación Inicial'),        -- ID 1
            ('Bases de Datos'),              -- ID 2
            ('Arquitectura de Sistemas'),    -- ID 3
            ('Matemática Discreta'),         -- ID 4
            ('Diseño de Interfaces UX'),     -- ID 5
            ('Gestión de Proyectos');        -- ID 6
        `);

        // 3. Asociamos Plan de Estudio
        // Relacionamos los IDs según la lógica de cada carrera
        console.log("Asociando materias a planes de estudio...");
        await pool.query(`
            INSERT INTO aida.plan_estudio (carrera_id, materia_id, anio_cursada, cuatrimestre_cursada) VALUES 
            -- Tecnicatura Web (ID 1)
            (1, 1, 1, 1), (1, 2, 1, 2), (1, 5, 2, 1),
            -- Ingeniería en Software (ID 2)
            (2, 1, 1, 1), (2, 2, 1, 2), (2, 3, 2, 1), (2, 4, 2, 2), (2, 6, 3, 1),
            -- Licenciatura en Sistemas (ID 3)
            (3, 1, 1, 1), (3, 2, 1, 2), (3, 4, 2, 1), (3, 6, 2, 2);
        `);

        // 4. Insertamos Alumnos de prueba para paginación
        console.log("Insertando alumnos de prueba para probar la paginación...");
        const alumnosPrueba = [];
        for (let i = 1; i <= 35; i++) {
            const carreraId = (i % 3) + 1; // Distribuidos equitativamente entre las 3 carreras
            alumnosPrueba.push(`('${100 + i}/24', 'Estudiante ${i}', 'Prueba', ${carreraId})`);
        }
        
        await pool.query(`
            INSERT INTO aida.alumnos (lu, nombres, apellido, carrera_id) VALUES 
            ${alumnosPrueba.join(', ')}
        `);

        console.log("✅ Reseteo y carga inicial completada.");
        console.log("ℹ️ La tabla 'aida.usuarios' no fue modificada.");

    } catch (error: any) {
        console.error("❌ Error durante el reseteo:", error.message);
    } finally {
        await desconectarBD();
    }
}

resetearDatosGestion();