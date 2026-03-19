import request from 'supertest';
import { app } from '../src/server';
import { pool } from '../src/database';

describe('Suite de Pruebas: Generación de Certificados (ZIP)', () => {
    let cookieSesion: string;
    const FECHA_PRUEBA = "2026-10-15"; // Fecha simulada del trámite
    const LU_PRUEBA = "400/26";

    // 1. PREPARACIÓN GLOBAL: Autenticar al usuario
    beforeAll(async () => {
        await request(app).post('/api/v0/auth/register').send({
            username: "admin_certificados",
            password: "PasswordSegura123!",
            nombre: "Admin de Certificados",
            email: "certificados@aida.com"
        });

        const respuestaLogin = await request(app).post('/api/v0/auth/login').send({
            username: "admin_certificados",
            password: "PasswordSegura123!"
        });

        cookieSesion = respuestaLogin.headers['set-cookie'];
    });

    // 2. PREPARACIÓN INDIVIDUAL: Limpiar e insertar un alumno listo para el certificado
    beforeEach(async () => {
        await pool.query('TRUNCATE TABLE aida.alumnos CASCADE');

        await pool.query(
            `INSERT INTO aida.alumnos (lu, nombres, apellido, carrera_id, egreso, titulo_en_tramite) 
             VALUES ($1, 'Graduado', 'Ejemplo', 1, '2025-12-01', $2)`,
            [LU_PRUEBA, FECHA_PRUEBA]
        );
    });

    afterAll(async () => {
        await pool.end();
    });

    // --- TEST 1: CAMINO TRISTE (Falta de datos) ---
    it('Debe rechazar la petición (HTTP 400) si no se envía la fecha', async () => {
        const respuesta = await request(app)
            .post('/api/v0/fecha')
            .set('Cookie', cookieSesion)
            .send({}); // Body vacío intencionalmente

        expect(respuesta.status).toBe(400);
        expect(respuesta.body.mensaje).toBe("Debe ingresar una fecha válida.");
    });

    // --- TEST 2: CAMINO FELIZ (Descarga del archivo binario) ---
    it('Debe generar y descargar un archivo ZIP (HTTP 200) para una fecha válida', async () => {
        const respuesta = await request(app)
            .post('/api/v0/fecha')
            .set('Cookie', cookieSesion)
            .send({ fecha: FECHA_PRUEBA })
            .responseType('blob'); 

        expect(respuesta.status).toBe(200);
        expect(respuesta.headers['content-type']).toBe('application/zip');
        expect(respuesta.headers['content-disposition']).toContain(`certificados_${FECHA_PRUEBA}.zip`);
        expect(respuesta.body).toBeInstanceOf(Buffer);
        expect(respuesta.body.length).toBeGreaterThan(0);
    });
});