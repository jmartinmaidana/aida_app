import { pool } from '../src/database';
import { InscripcionesRepository } from '../src/repositories/inscripcionesRepository';

describe('Suite de Pruebas: Flujo de Inscripciones (Repository)', () => {
    let materiaId: number;
    let carreraId: number;
    const alumnoLu = '999/26';

    // 1. SETUP: Preparamos la base de datos temporal con datos ficticios
    beforeAll(async () => {
        await pool.query('TRUNCATE TABLE aida.alumnos, aida.materias_por_periodo, aida.periodos_lectivos, aida.cursadas CASCADE');

        // Creamos una carrera de prueba
        const resCarrera = await pool.query("INSERT INTO aida.carreras (nombre) VALUES ('Carrera de Testing') RETURNING id");
        carreraId = resCarrera.rows[0].id;

        // Creamos una materia de prueba
        const resMateria = await pool.query("INSERT INTO aida.materias (nombre) VALUES ('Materia de Testing') RETURNING id");
        materiaId = resMateria.rows[0].id;

        // Creamos un alumno de prueba
        await pool.query(
            "INSERT INTO aida.alumnos (lu, nombres, apellido, carrera_id) VALUES ($1, 'Juan', 'Perez', $2)",
            [alumnoLu, carreraId]
        );

        // Agregamos la materia al plan de estudios para que el alumno pueda verla e inscribirse
        await pool.query(
            "INSERT INTO aida.plan_estudio (carrera_id, materia_id) VALUES ($1, $2)",
            [carreraId, materiaId]
        );
    });

    // 2. TEARDOWN: Limpiamos cuando terminen todas las pruebas
    afterAll(async () => {
        await pool.query('TRUNCATE TABLE aida.alumnos, aida.materias_por_periodo, aida.periodos_lectivos, aida.cursadas CASCADE');
        await pool.query('DELETE FROM aida.plan_estudio WHERE carrera_id = $1 AND materia_id = $2', [carreraId, materiaId]);
        await pool.query('DELETE FROM aida.materias WHERE id = $1', [materiaId]);
        await pool.query('DELETE FROM aida.carreras WHERE id = $1', [carreraId]);
        await pool.end(); // Cerramos la conexión para que Jest pueda finalizar el proceso
    });

    // --- INICIO DE LA HISTORIA ---

    it('Paso 1 (ADMIN): Debe poder planificar una materia (El periodo nace en PLANIFICACION)', async () => {
        const apertura = await InscripcionesRepository.inscribirMateriaAPeriodo(materiaId.toString(), '2026', '1');
        
        expect(apertura).toBeDefined();
        expect(apertura.materia_id).toBe(materiaId);
    });

    it('Paso 2 (ALUMNO): No debe poder ver la materia mientras el periodo esté en PLANIFICACION', async () => {
        const aperturasAlumno = await InscripcionesRepository.obtenerMateriasPorPeriodoAlumno(alumnoLu);
        expect(aperturasAlumno.length).toBe(0);
    });

    it('Paso 3 (ADMIN): Debe poder abrir las inscripciones del periodo', async () => {
        const abiertas = await InscripcionesRepository.abrirInscripciones('2026', '1');
        
        expect(abiertas.length).toBe(1);
        expect(abiertas[0].estado).toBe('INSCRIPCIONES_ABIERTAS');
    });

    it('Paso 4 (TODOS): Debe poder listar las aperturas abiertas y mostrar que hay 0 inscritos', async () => {
        const aperturas = await InscripcionesRepository.obtenerMateriasPorPeriodoAdmin();
        
        expect(aperturas.length).toBe(1);
        expect(aperturas[0].materia).toBe('Materia de Testing');
        expect(Number(aperturas[0].inscritos)).toBe(0);
        
        const aperturasAlumno = await InscripcionesRepository.obtenerMateriasPorPeriodoAlumno(alumnoLu);
        expect(aperturasAlumno.length).toBe(1);
    });

    it('Paso 5 (ALUMNO): Debe poder inscribirse a la materia abierta', async () => {
        const cursada = await InscripcionesRepository.inscribirAlumno(alumnoLu, materiaId.toString(), '2026', '1');
        
        expect(cursada).toBeDefined();
        expect(cursada.estado).toBe('CURSANDO');
        expect(cursada.nota).toBeNull(); // Al inscribirse no debe tener nota
        expect(cursada.aprobada).toBe(false);
    });

    it('Paso 6 (ALUMNO): El sistema debe impedir que se inscriba dos veces a la misma materia', async () => {
        // Usamos expect().rejects para verificar que la función lance un Error
        // La nueva lógica arroja un error más específico.
        await expect(
            InscripcionesRepository.inscribirAlumno(alumnoLu, materiaId.toString(), '2026', '1')
        ).rejects.toThrow("Ya te encuentras cursando esta materia. No puedes inscribirte nuevamente.");
    });

    it('Paso 7 (ADMIN): Debe poder cerrar las inscripciones del periodo', async () => {
        const cerradas = await InscripcionesRepository.cerrarInscripciones('2026', '1');
        expect(cerradas.length).toBe(1);
        expect(cerradas[0].estado).toBe('CURSANDO');
        
        // Verificamos que los alumnos ya no la vean
        const aperturasAlumno = await InscripcionesRepository.obtenerMateriasPorPeriodoAlumno(alumnoLu);
        expect(aperturasAlumno.length).toBe(0);
    });

    it('Paso 8 (ADMIN): Al finalizar el cuatrimestre, debe poder cargarle una nota y aprobar la cursada', async () => {
        // Primero obtenemos el ID interno de la cursada que se generó en el Paso 5
        const resCursada = await pool.query('SELECT id FROM aida.cursadas WHERE lu_alumno = $1', [alumnoLu]);
        const cursadaId = resCursada.rows[0].id;

        // El Admin actualiza el estado
        const actualizada = await InscripcionesRepository.actualizarEstadoCursada(cursadaId, 'APROBADA', 8);
        
        expect(actualizada.estado).toBe('APROBADA');
        expect(actualizada.nota).toBeNull(); // La nota ya no se guarda en cursada
        expect(actualizada.aprobada).toBe(true); // La retrocompatibilidad funciona

        // Verificamos que se haya registrado el final automáticamente por promoción
        const resFinal = await pool.query('SELECT nota, aprobado FROM aida.finales WHERE lu_alumno = $1 AND materia_id = $2', [alumnoLu, materiaId]);
        expect(resFinal.rows.length).toBe(1);
        expect(resFinal.rows[0].nota).toBe(8);
    });

    it('Paso 9 (ALUMNO): No debe poder inscribirse a una materia que ya tiene aprobada', async () => {
        // Para este test, necesitamos que el período de inscripción esté abierto de nuevo.
        // En un escenario real, esto sería un período futuro, pero para la prueba, reabrimos el mismo.
        await InscripcionesRepository.abrirInscripciones('2026', '1');

        // Intentamos inscribir al alumno a la materia que aprobó en el paso 8
        await expect(
            InscripcionesRepository.inscribirAlumno(alumnoLu, materiaId.toString(), '2026', '1')
        ).rejects.toThrow("Ya tienes aprobada esta materia.");
    });
});