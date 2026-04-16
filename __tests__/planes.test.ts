import request from 'supertest';
import { app } from '../src/server';
import { pool } from '../src/database';

describe('Suite de Pruebas: Endpoint de Planes de Estudio', () => {
    let cookieSesion: string;

    beforeAll(async () => {
        // 1. Registrar un usuario de prueba
        await request(app).post('/api/v0/auth/register').send({
            username: "tester_planes",
            password: "PasswordSegura123!",
            nombre: "Tester de Planes",
            email: "planes@aida.com"
        });

        // 2. Iniciar sesión para obtener la cookie
        const respuestaLogin = await request(app).post('/api/v0/auth/login').send({
            username: "tester_planes",
            password: "PasswordSegura123!"
        });

        if (!respuestaLogin.headers['set-cookie']) {
            throw new Error("FALLO CRÍTICO EN TEST: No se pudo iniciar sesión para obtener la cookie.");
        }
        cookieSesion = respuestaLogin.headers['set-cookie'];
    });

    afterAll(async () => {
        // Limpiar el usuario de prueba
        await pool.query('DELETE FROM aida.usuarios WHERE username = $1', ['tester_planes']);
        // Cerrar la conexión a la base de datos
        await pool.end();
    });

    it('Debe devolver la lista completa de planes de estudio con la estructura correcta', async () => {
        // ACT: Hacemos la petición al endpoint protegido
        const respuesta = await request(app)
            .get('/api/v0/planes-estudio')
            .set('Cookie', cookieSesion);

        // ASSERT: Verificamos la respuesta
        expect(respuesta.status).toBe(200);
        expect(respuesta.body.estado).toBe('exito');
        
        expect(Array.isArray(respuesta.body.datos)).toBe(true);
        expect(respuesta.body.datos.length).toBeGreaterThan(0);

        const primeraCarrera = respuesta.body.datos[0];
        expect(primeraCarrera).toHaveProperty('id');
        expect(typeof primeraCarrera.id).toBe('number');
        
        expect(primeraCarrera).toHaveProperty('nombre');
        expect(typeof primeraCarrera.nombre).toBe('string');

        expect(primeraCarrera).toHaveProperty('titulo_otorgado');
        expect(typeof primeraCarrera.titulo_otorgado).toBe('string');

        expect(primeraCarrera).toHaveProperty('materias');
        expect(Array.isArray(primeraCarrera.materias)).toBe(true);
    });

    it('Debe denegar el acceso (HTTP 401) si no se provee una cookie de sesión', async () => {
        const respuesta = await request(app).get('/api/v0/planes-estudio');

        expect(respuesta.status).toBe(401);
        expect(respuesta.body.estado).toBe('error');
        expect(respuesta.body.mensaje).toContain('No autorizado');
    });
});