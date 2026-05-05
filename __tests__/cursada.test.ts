import request from 'supertest';
import { app } from '../src/server';
import { pool } from '../src/database';
import { AlumnosRepository } from '../src/repositories/alumnosRepository.js';
import { PlanEstudiosRepository } from '../src/repositories/planEstudiosRepository.js';
import { jest } from '@jest/globals';

describe('Suite de Pruebas: Registro de Cursadas y Notas', () => {
    let cookieSesion: string;
    const LU_PRUEBA = "300/26";
    const ID_MATERIA_PRUEBA = 1; // Asumimos que la materia con ID 1 existe en su esquema inicial

    // 1. PREPARACIÓN GLOBAL: Autenticación
    beforeAll(async () => {
        // Registramos un usuario (usamos un sufijo distinto por si acaso)
        await request(app).post('/api/v0/auth/register').send({
            username: "profesor_test",
            password: "PasswordSegura123!",
            nombre: "Profesor de Pruebas",
            email: "profe@aida.com"
        });

        const respuestaLogin = await request(app).post('/api/v0/auth/login').send({
            username: "profesor_test",
            password: "PasswordSegura123!"
        });

        cookieSesion = respuestaLogin.headers['set-cookie'];
        if (!cookieSesion) throw new Error("Fallo crítico: No se generó la cookie de sesión.");
    }, 15000); // <-- Aumentamos el timeout explícitamente a 15 segundos

    // 2. PREPARACIÓN INDIVIDUAL: Limpiar e insertar alumno base
    beforeEach(async () => {
        // Al borrar alumnos en cascada, también se borran sus cursadas
        await pool.query('TRUNCATE TABLE aida.alumnos CASCADE');

        // Nos aseguramos de que el plan de estudios esté configurado para la validación
        await pool.query(`INSERT INTO aida.carreras (id, nombre) SELECT 1, 'Carrera Test' WHERE NOT EXISTS (SELECT 1 FROM aida.carreras WHERE id = 1);`);
        await pool.query(`INSERT INTO aida.materias (id, nombre) SELECT 1, 'Materia Test' WHERE NOT EXISTS (SELECT 1 FROM aida.materias WHERE id = 1);`);
        await pool.query(`INSERT INTO aida.plan_estudio (carrera_id, materia_id) SELECT 1, 1 WHERE NOT EXISTS (SELECT 1 FROM aida.plan_estudio WHERE carrera_id = 1 AND materia_id = 1);`);
        
        // Insertamos un alumno directamente en la BD para tener a quién cargarle la nota
        await pool.query(
            `INSERT INTO aida.alumnos (lu, nombres, apellido, carrera_id) VALUES ($1, 'Alumno', 'De Prueba', 1)`,
            [LU_PRUEBA]
        );

        // Inscribimos al alumno para que la carga de nota pase la nueva validación estricta
        await pool.query(
            `INSERT INTO aida.cursadas (lu_alumno, materia_id, anio, cuatrimestre, estado, aprobada) VALUES ($1, 1, 2026, 1, 'CURSANDO', false)`,
            [LU_PRUEBA]
        );
    });

    afterAll(async () => {
        await pool.query('DELETE FROM aida.usuarios WHERE username = $1', ['profesor_test']);
        await pool.end();
    });

    // En __tests__/cursada.test.ts
    // --- TEST 1: CAMINO FELIZ ---
    it('Debe registrar una cursada exitosamente (HTTP 200) con datos válidos', async () => {
        const nuevaCursada = {
            lu: LU_PRUEBA,
            idMateria: ID_MATERIA_PRUEBA,
            año: 2026,
            cuatrimestre: 1,
            nota: 8
        };

        const respuesta = await request(app)
            .post('/api/v0/cursada')
            .set('Cookie', cookieSesion)
            .set('Content-Type', 'application/json') // <-- AGREGAR ESTO
            .send(nuevaCursada);

        expect(respuesta.status).toBe(200);
        expect(respuesta.body.estado).toBe("exito");

        // Verificación en la base de datos
        const dbCheck = await pool.query('SELECT nota FROM aida.cursadas WHERE lu_alumno = $1 AND materia_id = $2', [LU_PRUEBA, ID_MATERIA_PRUEBA]);
        expect(dbCheck.rows.length).toBe(1);
        expect(dbCheck.rows[0].nota).toBe(8); 
    });

    // --- TEST 2: VALIDACIÓN DE DATOS FALTANTES ---
    it('Debe rechazar el registro con estado de error si falta información obligatoria', async () => {
        const cursadaIncompleta = {
            lu: LU_PRUEBA,
            idMateria: ID_MATERIA_PRUEBA,
            // Falta año, cuatrimestre y nota
        };

        const respuesta = await request(app)
            .post('/api/v0/cursada')
            .set('Cookie', cookieSesion)
            .send(cursadaIncompleta);

        expect(respuesta.status).toBe(200); // Ahora se maneja el error internamente
        expect(respuesta.body.estado).toBe("error");
        expect(respuesta.body.mensaje).toBeDefined();
    });

    // --- TEST 3: VALIDACIÓN DE REGLAS DE NEGOCIO (RANGO DE NOTAS) ---
    it('Debe rechazar el registro con estado de error si la nota está fuera del rango permitido (1-10)', async () => {
        const cursadaInvalida = {
            lu: LU_PRUEBA,
            idMateria: ID_MATERIA_PRUEBA,
            año: 2026,
            cuatrimestre: 1,
            nota: 11 // Nota inválida (mayor a 10)
        };

        const respuesta = await request(app)
            .post('/api/v0/cursada')
            .set('Cookie', cookieSesion)
            .send(cursadaInvalida);

        expect(respuesta.status).toBe(200); // Ahora se maneja el error internamente
        expect(respuesta.body.estado).toBe("error");
        expect(respuesta.body.mensaje).toBeDefined();
    });

    // --- TEST 4: PRUEBA DE TRANSACCIÓN (ROLLBACK) ---
    it('Debe revertir (Rollback) la cursada si ocurre un error al verificar el egreso y devolver error controlado', async () => {
        // 1. ARRANGE: Espiamos el repositorio y forzamos un error justo al final del proceso
        // Simulamos que la carrera solo requiere 1 materia para que dispare la verificación de egreso
        const espiaPlan = jest.spyOn(PlanEstudiosRepository, 'cantidadMateriasRequeridas')
            .mockResolvedValueOnce(1);

        const espia = jest.spyOn(AlumnosRepository, 'marcarComoEgresado')
            .mockRejectedValueOnce(new Error("Error simulado de base de datos"));

        const nuevaCursada = {
            lu: LU_PRUEBA,
            idMateria: ID_MATERIA_PRUEBA,
            año: 2026,
            cuatrimestre: 1,
            nota: 10 // Aprobada, lo que dispara la verificación de egreso
        };

        // 2. ACT: Enviamos la petición
        const respuesta = await request(app)
            .post('/api/v0/cursada')
            .set('Cookie', cookieSesion)
            .send(nuevaCursada);

        // 3. ASSERT: Verificamos que el sistema haya abortado y la cursada NO exista
        expect(respuesta.status).toBe(200); // El Error 500 ahora fue encapsulado en 'alumnosIgnorados'
        expect(respuesta.body.estado).toBe("error");
        const dbCheck = await pool.query('SELECT estado FROM aida.cursadas WHERE lu_alumno = $1 AND materia_id = $2', [LU_PRUEBA, ID_MATERIA_PRUEBA]);
        expect(dbCheck.rows[0].estado).toBe('CURSANDO'); // ¡El Rollback funcionó, la cursada no se actualizó!
        
        espiaPlan.mockRestore();
        espia.mockRestore(); // Limpiamos el espía para no afectar otras pruebas futuras
    });

    // --- TEST 5: CARGA MASIVA DE CURSADAS ---
    it('Debe registrar múltiples cursadas exitosamente (HTTP 200) cuando se envía un arreglo (Lote/CSV)', async () => {
        // 1. ARRANGE: Agregamos un segundo alumno para la prueba
        await pool.query(
            `INSERT INTO aida.alumnos (lu, nombres, apellido, carrera_id) VALUES ($1, 'Alumno 2', 'De Prueba', 1)`,
            ["301/26"]
        );

        // Inscribimos al alumno 2
        await pool.query(
            `INSERT INTO aida.cursadas (lu_alumno, materia_id, anio, cuatrimestre, estado, aprobada) VALUES ($1, 1, 2026, 1, 'CURSANDO', false)`,
            ["301/26"]
        );

        const loteCursadas = [
            { lu: LU_PRUEBA, idMateria: ID_MATERIA_PRUEBA, año: 2026, cuatrimestre: 1, nota: 7 },
            { lu: "301/26", idMateria: ID_MATERIA_PRUEBA, año: 2026, cuatrimestre: 1, nota: 4 }
        ];

        // 2. ACT: Enviamos el arreglo completo
        const respuesta = await request(app)
            .post('/api/v0/cursada')
            .set('Cookie', cookieSesion)
            .send(loteCursadas);

        // 3. ASSERT: Verificamos éxito general y en la base de datos
        expect(respuesta.status).toBe(200);
        expect(respuesta.body.estado).toBe("exito");
        expect(respuesta.body.procesados).toBe(2); // Sabemos que debía cargar dos

        const dbCheck = await pool.query('SELECT COUNT(*) FROM aida.cursadas WHERE materia_id = $1', [ID_MATERIA_PRUEBA]);
        expect(parseInt(dbCheck.rows[0].count)).toBe(2);
    });
});