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

        // Borramos a todos los usuarios y alumnos (en cascada) para garantizar un estado limpio
        await pool.query('TRUNCATE TABLE aida.usuarios CASCADE');
        await pool.query('TRUNCATE TABLE aida.alumnos CASCADE');

        // 2. Registramos al usuario
        const respuestaRegistro = await request(app).post('/api/v0/auth/register').send({
            username: "profe_historial",
            password: "PasswordSegura123!",
            nombre: "Profe Prueba",
            email: "historial@aida.com" // Correo único
        });

        // 3. LA VERIFICACIÓN: Si el registro falla, el test se detiene aquí con un mensaje claro
        expect(respuestaRegistro.status).toBe(200);

        // 4. Hacemos el Login
        const respuestaLogin = await request(app).post('/api/v0/auth/login').send({
            username: "profe_historial",
            password: "PasswordSegura123!"
        });

        if (!respuestaLogin.headers['set-cookie']) {
            throw new Error("FALLO CRÍTICO EN TEST: No se pudo iniciar sesión. Respuesta del servidor: " + JSON.stringify(respuestaLogin.body));
        }

        cookieSesion = respuestaLogin.headers['set-cookie'];

        // Configuramos la materia en el plan de estudios para evitar rechazos en la cursada
        await pool.query(`INSERT INTO aida.carreras (id, nombre) SELECT $1, 'Carrera Test' WHERE NOT EXISTS (SELECT 1 FROM aida.carreras WHERE id = $1);`, [CARRERA_ID_PRUEBA]);
        await pool.query(`INSERT INTO aida.materias (id, nombre) SELECT $1, 'Materia Test' WHERE NOT EXISTS (SELECT 1 FROM aida.materias WHERE id = $1);`, [MATERIA_ID_PRUEBA]);
        await pool.query(`INSERT INTO aida.plan_estudio (carrera_id, materia_id) SELECT $1, $2 WHERE NOT EXISTS (SELECT 1 FROM aida.plan_estudio WHERE carrera_id = $1 AND materia_id = $2);`, [CARRERA_ID_PRUEBA, MATERIA_ID_PRUEBA]);

        // 5. Preparamos el alumno de prueba
        await request(app)
            .post('/api/alumno')
            .set('Cookie', cookieSesion)
            .send(alumnoPrueba);

        // Simulamos la inscripción previa obligatoria
        await pool.query(
            `INSERT INTO aida.cursadas (lu_alumno, materia_id, anio, cuatrimestre, estado, aprobada) VALUES ($1, $2, 2024, 1, 'CURSANDO', false)`,
            [alumnoPrueba.lu, MATERIA_ID_PRUEBA]
        );

        // 6. Le cargamos una nota aprobada (ej. un 8)
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
    }, 15000);

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