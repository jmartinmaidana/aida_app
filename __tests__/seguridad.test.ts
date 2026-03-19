import request from 'supertest';
import { app } from '../src/server';
import { pool } from '../src/database';

describe('Suite de Pruebas: Seguridad y Control de Acceso', () => {
    let cookieSesion: string;

    // 1. PREPARACIÓN: Crear un usuario y obtener una cookie válida
    beforeAll(async () => {
        // Aseguramos que el usuario de prueba exista
        await request(app).post('/api/v0/auth/register').send({
            username: "inspector_seguridad",
            password: "PasswordSegura123!",
            nombre: "Inspector",
            email: "seguridad@aida.com"
        });

        const respuestaLogin = await request(app).post('/api/v0/auth/login').send({
            username: "inspector_seguridad",
            password: "PasswordSegura123!"
        });

        cookieSesion = respuestaLogin.headers['set-cookie'];
    });

    afterAll(async () => {
        await pool.end();
    });

    // --- PRUEBAS DE VISTAS HTML (Redirección 302) ---

    it('Debe redirigir al login (HTTP 302) al intentar ver el Historial sin sesión', async () => {
        const respuesta = await request(app).get('/app/historial');
        
        // Verificamos que el servidor responda con una redirección
        expect(respuesta.status).toBe(302);
        // Verificamos que el destino de la redirección sea la página de login
        expect(respuesta.headers.location).toBe('/app/login');
    });

    it('Debe redirigir al login (HTTP 302) al intentar ver Alumnos sin sesión', async () => {
        const respuesta = await request(app).get('/app/alumnos'); // O la ruta que use para su HTML
        expect(respuesta.status).toBe(302);
        expect(respuesta.headers.location).toBe('/app/login');
    });

    // --- PRUEBAS DE API (Rechazo 400/401 JSON) ---

    it('Debe bloquear el acceso a la API (HTTP 400/401) al endpoint de verificación sin cookie', async () => {
        const respuesta = await request(app).get('/api/v0/auth/verificar');
        
        // No debe ser 200 OK. (Dependiendo de cómo programó requireAuthAPI, será 400 o 401)
        expect(respuesta.status).not.toBe(200); 
        expect(respuesta.body.estado).toBe('error');
    });

    it('Debe permitir el acceso a la API (HTTP 200) al endpoint de verificación con una cookie válida', async () => {
        const respuesta = await request(app)
            .get('/api/v0/auth/verificar')
            .set('Cookie', cookieSesion); // Le inyectamos la sesión válida
        
        expect(respuesta.status).toBe(200);
        expect(respuesta.body.estado).toBe('exito');
        expect(respuesta.body.mensaje).toBe('Sesión activa.');
    });
});