import request from 'supertest';
import { app } from '../src/server';
import { pool } from '../src/database';

describe('Suite de Pruebas: Historial Académico', () => {
    let cookieSesion: string;
    
    const CARRERA_ID_PRUEBA = 1; 
    const MATERIA_ID_PRUEBA = 1;
    
    const alumnoPrueba = {
        lu: "9999/99", // Una LU inventada que no choque con datos reales
        nombres: "Alumno",
        apellido: "De Prueba",
        carrera_id: CARRERA_ID_PRUEBA
    };

    beforeAll(async () => {

        await request(app).post('/api/v0/auth/register').send({
            username: "profe_historial",
            password: "PasswordSegura123!",
            nombre: "Profe Prueba",
            email: "profe@aida.com"
        });

        const respuestaLogin = await request(app).post('/api/v0/auth/login').send({
            username: "profe_historial",
            password: "PasswordSegura123!"
        });

        if (!respuestaLogin.headers['set-cookie']) {
            throw new Error("FALLO CRÍTICO EN TEST: No se pudo iniciar sesión. Respuesta del servidor: " + JSON.stringify(respuestaLogin.body));
        }

        cookieSesion = respuestaLogin.headers['set-cookie'];

        await request(app)
            .post('/api/alumno')
            .set('Cookie', cookieSesion)
            .send(alumnoPrueba);

        // E) Le cargamos una nota aprobada (ej. un 8)
        await request(app)
            .post('/api/v0/cursada')
            .set('Cookie', cookieSesion)
            .send({
                lu: alumnoPrueba.lu,
                idMateria: MATERIA_ID_PRUEBA,
                año: 2024,
                cuatrimestre: 1,
                nota: 8
            });
    });

    afterAll(async () => {
        await request(app)
            .delete(`/api/alumnos/9999/99`)
            .set('Cookie', cookieSesion);
            
        await pool.query('DELETE FROM aida.usuarios WHERE username = $1', ['profe_historial']);
            
        await pool.end();
    });


    it('Debe devolver el historial completo con las estadísticas calculadas correctamente', async () => {
        const respuesta = await request(app)
            .get(`/api/v0/historial/9999/99`)
            .set('Cookie', cookieSesion);

        expect(respuesta.status).toBe(200);
        expect(respuesta.body.estado).toBe('exito');

        expect(respuesta.body).toHaveProperty('alumno');
        expect(respuesta.body.alumno).toBe('Alumno De Prueba');
        expect(respuesta.body).toHaveProperty('estadisticas');
        expect(respuesta.body).toHaveProperty('historial');

        const stats = respuesta.body.estadisticas;
        
        expect(stats.materiasAprobadas).toBe(1);
        expect(stats.promedioActual).toBe(8);
        expect(stats.totalMaterias).toBeGreaterThan(0); 
        
        expect(typeof stats.porcentajeCompletado).toBe('number');
        expect(stats.porcentajeCompletado).toBeGreaterThanOrEqual(0);

        // Verificaciones de la lista de cursadas
        expect(Array.isArray(respuesta.body.historial)).toBe(true);
        expect(respuesta.body.historial.length).toBeGreaterThanOrEqual(1);
    });

    it('Debe devolver un error 404 si se solicita el historial de una LU inexistente', async () => {
        const respuesta = await request(app)
            .get(`/api/v0/historial/0000/00`) // LU que no existe
            .set('Cookie', cookieSesion);

        expect(respuesta.status).toBe(404);
        expect(respuesta.body.estado).toBe('error');
        expect(respuesta.body.mensaje).toBe('Alumno no encontrado.');
    });
});