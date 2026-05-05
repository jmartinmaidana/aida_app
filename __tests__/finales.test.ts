import request from 'supertest';
import { app } from '../src/server';
import { pool } from '../src/database';

describe('Suite de Pruebas: Registro de Finales (Individual y Masivo)', () => {
    let cookieSesion: string;
    const LU_PRUEBA = "400/26";
    const ID_MATERIA_PRUEBA = 1;

    beforeAll(async () => {
        // Registramos un usuario admin para pruebas
        await request(app).post('/api/v0/auth/register').send({
            username: "admin_finales",
            password: "PasswordSegura123!",
            nombre: "Admin Finales",
            email: "admin_finales@aida.com"
        });

        const respuestaLogin = await request(app).post('/api/v0/auth/login').send({
            username: "admin_finales",
            password: "PasswordSegura123!"
        });

        cookieSesion = respuestaLogin.headers['set-cookie'];
    });

    beforeEach(async () => {
        await pool.query('TRUNCATE TABLE aida.alumnos CASCADE');
        await pool.query(`INSERT INTO aida.carreras (id, nombre) SELECT 1, 'Carrera Test' WHERE NOT EXISTS (SELECT 1 FROM aida.carreras WHERE id = 1);`);
        await pool.query(`INSERT INTO aida.materias (id, nombre) SELECT 1, 'Materia Test' WHERE NOT EXISTS (SELECT 1 FROM aida.materias WHERE id = 1);`);
        await pool.query(`INSERT INTO aida.plan_estudio (carrera_id, materia_id) SELECT 1, 1 WHERE NOT EXISTS (SELECT 1 FROM aida.plan_estudio WHERE carrera_id = 1 AND materia_id = 1);`);
        await pool.query(
            `INSERT INTO aida.alumnos (lu, nombres, apellido, carrera_id) VALUES ($1, 'Alumno', 'De Prueba', 1)`,
            [LU_PRUEBA]
        );
        
        // Le otorgamos la regularidad para que la validación estricta de finales lo deje rendir
        await pool.query(
            `INSERT INTO aida.cursadas (lu_alumno, materia_id, anio, cuatrimestre, estado, aprobada) VALUES ($1, 1, 2026, 1, 'APROBADA', true)`,
            [LU_PRUEBA]
        );
    });

    afterAll(async () => {
        await pool.query('DELETE FROM aida.usuarios WHERE username = $1', ['admin_finales']);
        await pool.end();
    });

    it('Debe registrar un final exitosamente (HTTP 200)', async () => {
        const respuesta = await request(app)
            .post('/api/v0/finales')
            .set('Cookie', cookieSesion)
            .send({
                lu: LU_PRUEBA,
                idMateria: ID_MATERIA_PRUEBA,
                nota: 8,
                fecha: "2026-10-15"
            });

        expect(respuesta.status).toBe(200);
        expect(respuesta.body.estado).toBe("exito");
        expect(respuesta.body.procesados).toBe(1);

        const dbCheck = await pool.query('SELECT nota, fecha FROM aida.finales WHERE lu_alumno = $1 AND materia_id = $2', [LU_PRUEBA, ID_MATERIA_PRUEBA]);
        expect(dbCheck.rows.length).toBe(1);
        expect(dbCheck.rows[0].nota).toBe(8);
        expect(new Date(dbCheck.rows[0].fecha).toISOString().split('T')[0]).toBe("2026-10-15");
    });

    it('Debe procesar una carga masiva de finales correctamente (y permitir repetición con distintas fechas)', async () => {
        const loteFinales = [
            { lu: LU_PRUEBA, idMateria: ID_MATERIA_PRUEBA, nota: 9, fecha: "2026-11-20" },
            { lu: LU_PRUEBA, idMateria: ID_MATERIA_PRUEBA, nota: 2, fecha: "2026-11-25" } // El mismo alumno rinde de nuevo y saca un 2
        ];

        const respuesta = await request(app)
            .post('/api/v0/finales')
            .set('Cookie', cookieSesion)
            .send(loteFinales);

        expect(respuesta.status).toBe(200);
        expect(respuesta.body.procesados).toBe(2);
    });
});