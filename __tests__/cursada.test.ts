import request from 'supertest';
import { app } from '../src/server';
import { pool } from '../src/database';

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
    });

    // 2. PREPARACIÓN INDIVIDUAL: Limpiar e insertar alumno base
    beforeEach(async () => {
        // Al borrar alumnos en cascada, también se borran sus cursadas
        await pool.query('TRUNCATE TABLE aida.alumnos CASCADE');
        
        // Insertamos un alumno directamente en la BD para tener a quién cargarle la nota
        await pool.query(
            `INSERT INTO aida.alumnos (lu, nombres, apellido, carrera_id) VALUES ($1, 'Alumno', 'De Prueba', 1)`,
            [LU_PRUEBA]
        );
    });

    afterAll(async () => {
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
    it('Debe rechazar el registro (HTTP 400) si falta información obligatoria', async () => {
        const cursadaIncompleta = {
            lu: LU_PRUEBA,
            idMateria: ID_MATERIA_PRUEBA,
            // Falta año, cuatrimestre y nota
        };

        const respuesta = await request(app)
            .post('/api/v0/cursada')
            .set('Cookie', cookieSesion)
            .send(cursadaIncompleta);

        expect(respuesta.status).toBe(400);
        expect(respuesta.body.mensaje).toBe("Falta completar datos.");
    });

    // --- TEST 3: VALIDACIÓN DE REGLAS DE NEGOCIO (RANGO DE NOTAS) ---
    it('Debe rechazar el registro (HTTP 400) si la nota está fuera del rango permitido (1-10)', async () => {
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

        expect(respuesta.status).toBe(400);
        expect(respuesta.body.mensaje).toBe("La nota debe ser un número entero entre 1 y 10.");
    });
});