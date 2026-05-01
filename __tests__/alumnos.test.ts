import request from 'supertest';
import { app } from '../src/server';
import { pool } from '../src/database';
import { EmailService } from '../src/services/emailService.js';
import { jest } from '@jest/globals';

describe('Suite de Pruebas: Creación de Alumnos', () => {
    // Variable global para almacenar la cookie de sesión de nuestras pruebas
    let cookieSesion: string; 

    // Se ejecuta UNA SOLA VEZ antes de comenzar todos los tests de este archivo
    beforeAll(async () => {

        // Simulamos el servicio de correos para que Jest NO envíe emails reales 
        jest.spyOn(EmailService, 'enviarCorreoActivacion').mockResolvedValue(true);

        await request(app)
            .post('/api/v0/auth/register')
            .send({
                username: "robot_tester",
                password: "PasswordSegura123!",
                nombre: "Robot de Pruebas",
                email: "robot@aida.com"
            });

        const respuestaLogin = await request(app)
            .post('/api/v0/auth/login')
            .send({
                username: "robot_tester",
                password: "PasswordSegura123!"
            });

        cookieSesion = respuestaLogin.headers['set-cookie'];
        
        if (!cookieSesion) {
            throw new Error("Fallo crítico: No se generó la cookie de sesión durante el login.");
        }
    }, 15000); // <-- Aumentamos el timeout explícitamente a 15 segundos

    // Se ejecuta antes de CADA prueba individual para limpiar la tabla
    beforeEach(async () => {
        await pool.query('TRUNCATE TABLE aida.alumnos CASCADE');
    });

    // Se ejecuta al finalizar todas las pruebas para liberar la base de datos
    afterAll(async () => {
        jest.restoreAllMocks(); // Limpiamos el simulador de correos
        await pool.query('DELETE FROM aida.usuarios WHERE username = $1', ['robot_tester']); // <-- Limpiamos el usuario
        await pool.end();
    });
    // --- TEST 1: Alumno Invalido (Faltan Carrera id) ---
    it('Debe rechazar la creación (HTTP 400) si falta la carrera_id', async () => {
        // Simulamos el envío de datos incompletos
        const alumnoIncompleto = {
            lu: "100/26",
            nombres: "Usuario",
            apellido: "Test"
            // Falla intencional: carrera_id omitido
        };

        const respuesta = await request(app)
            .post('/api/alumno')
            .set('Cookie', cookieSesion) // Entregamos la credencial al guardia (requireAuthAPI)
            .send(alumnoIncompleto);

        // Afirmamos que Zod detuvo la petición y devolvió un 400 Bad Request
        expect(respuesta.status).toBe(400); 
    });
    // --- TEST 2: Alumno Valido ---
    it('Debe crear un alumno exitosamente (HTTP 200) cuando los datos son válidos', async () => {
        // 1. ARRANGE: Preparamos un alumno con todos los datos requeridos
        const alumnoValido = {
            lu: "105/26", // Usamos un LU nuevo
            nombres: "María",
            apellido: "García",
            carrera_id: 1, // Sabemos por el setup que el ID 1 es "Tecnicatura Web"
            email: "maria.test@aida.com" // Añadimos el email para probar el nuevo flujo
        };

        // 2. ACT: Enviamos la petición autorizada al servidor
        const respuesta = await request(app)
            .post('/api/alumno')
            .set('Cookie', cookieSesion)
            .send(alumnoValido);

        // 3. ASSERT: Afirmamos las respuestas del servidor
        expect(respuesta.status).toBe(200); // Su API devuelve 200 al tener éxito
        expect(respuesta.body.estado).toBe("exito");
        expect(respuesta.body.mensaje).toBe("Alumno creado correctamente.");

        // ASSERT EXTRA: Vamos directo a la base de datos a comprobar la verdad absoluta
        const dbCheck = await pool.query('SELECT * FROM aida.alumnos WHERE lu = $1', ['105/26']);
        
        expect(dbCheck.rows.length).toBe(1); // Debe haber exactamente 1 registro
        expect(dbCheck.rows[0].nombres).toBe("María"); // El nombre debe coincidir
        expect(dbCheck.rows[0].carrera_id).toBe(1); // La carrera debe haberse guardado
        
        // ASSERT EXTRA 2: Verificamos que el sistema haya intentado mandar el correo
        expect(EmailService.enviarCorreoActivacion).toHaveBeenCalledWith(
            "maria.test@aida.com",
            expect.any(String) // El token es aleatorio, así que solo verificamos que sea un texto
        );
    });
    // --- TEST 3: LU REPETIDA ---
    it('Debe rechazar la creación si la LU ya existe en el sistema', async () => {

        const alumnoDuplicado = {
            lu: "110/26",
            nombres: "Juan",
            apellido: "Pérez",
            carrera_id: 1
        };

        await request(app).post('/api/alumno').set('Cookie', cookieSesion).send(alumnoDuplicado);

        const respuesta = await request(app).post('/api/alumno').set('Cookie', cookieSesion).send(alumnoDuplicado);

        expect(respuesta.status).not.toBe(200); 
    });

    // --- TEST 4: FORMATO DE LU INVÁLIDO ---
    it('Debe rechazar la creación (HTTP 400) si la LU tiene un formato incorrecto', async () => {
        // 1. ARRANGE: LU sin la barra obligatoria
        const alumnoMalFormateado = {
            lu: "123456", // Formato incorrecto
            nombres: "Ana",
            apellido: "López",
            carrera_id: 1
        };

        // 2. ACT: Enviamos la petición
        const respuesta = await request(app)
            .post('/api/alumno')
            .set('Cookie', cookieSesion)
            .send(alumnoMalFormateado);

        // 3. ASSERT: Zod debe interceptarlo antes de llegar a la base de datos
        expect(respuesta.status).toBe(400);
    });

    // --- TEST 6: CARGA MASIVA CON DUPLICADOS ---
    it('Debe procesar una carga masiva, insertando nuevos e ignorando a los que ya existen sin sobrescribirlos', async () => {

        const alumnoExistente = {
            lu: "200/26",
            nombres: "Alumno",
            apellido: "Intocable",
            carrera_id: 1
        };
        await request(app).post('/api/alumno').set('Cookie', cookieSesion).send(alumnoExistente);

        const loteMasivo = [
            {
                lu: "200/26", 
                nombres: "Hacker", 
                apellido: "Malicioso", 
                carrera_id: 1
            },
            {
                lu: "201/26", 
                nombres: "Nuevo",
                apellido: "Estudiante 1",
                carrera_id: 1
            },
            {
                lu: "202/26", 
                nombres: "Nuevo",
                apellido: "Estudiante 2",
                carrera_id: 2
            }
        ];

        const respuesta = await request(app)
            .patch('/api/v0/archivo')
            .set('Cookie', cookieSesion)
            .send(loteMasivo);

        expect(respuesta.status).toBe(200);
        
        expect(respuesta.body.insertados).toBe(2);
        expect(respuesta.body.ignorados).toBe(1);

        const dbTotal = await pool.query('SELECT COUNT(*) FROM aida.alumnos');
        expect(parseInt(dbTotal.rows[0].count)).toBe(3);

        const dbOriginal = await pool.query('SELECT apellido FROM aida.alumnos WHERE lu = $1', ['200/26']);
        expect(dbOriginal.rows[0].apellido).toBe("Intocable"); // Sigue intacto

        // Afirmamos que el sistema detectó al alumno duplicado y lo devolvió
        expect(respuesta.body.alumnosIgnorados).toBeDefined();
        expect(respuesta.body.alumnosIgnorados.length).toBe(1);
        expect(respuesta.body.alumnosIgnorados[0].lu).toBe("200/26");
    });
});