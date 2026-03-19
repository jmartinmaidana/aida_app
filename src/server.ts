import express from 'express';
import { AlumnoRepository } from './repositories/AlumnosRepository.js';
import { CarrerasRepository } from './repositories/CarrerasRepository.js';
import { pool, conectarBD} from './database.js';
import path from 'path'; 
import session from 'express-session';
import { Request, Response, NextFunction } from 'express';
import { AuthenticationService } from './services/AuthenticationService.js';
import { Usuario } from './repositories/UsuariosRepository.js';
import { alumnoSchema } from './schemas_validator.js';
import { AcademicoService } from './services/AcademicoService.js';
import { AlumnoService } from './services/AlumnoService.js';
import { CertificadoService } from './services/CertificadoService.js';
import { catchAsync,manejadorDeErrores } from './middlewares/errorHandler.js';
import archiver from 'archiver';
import { CursadasRepository } from './repositories/CursadaRepository.js';
import { PlanEstudiosRepository } from './repositories/PlanEstudiosRepository.js';


declare module 'express-session' {
    interface SessionData {
        usuario?: Usuario;
    }
}

const app = express();

// Middleswares ------
// 1. Middleware fundamental: Le dice a Express que procese el body de las peticiones como JSON

//Un Middleware es una función que intercepta la petición antes de que llegue a nuestras rutas. 
// Esta línea actúa como un traductor automático: toma ese texto crudo, 
// verifica si tiene forma de JSON, y si es así, lo convierte en un objeto real de JavaScript para que podamos usarlo directamente.
app.use(express.json());

app.use(express.static('public'));

app.use(session({
    secret: process.env.SESSION_SECRET || 'mi_secreto_super_seguro_123', //Codigo/clave necesaria para validar una cookie y asi  evitar que  un usuario acceda solo creando su propia cookie
    resave: false, //Si ya hay una cookie creada no la dupliques
    saveUninitialized: false, //Se inicializar sin cookie (debe primero loguearse)
    cookie: { //Caracteristicas de la cookie
        secure: false, // En producción con HTTPS esto debe ser true
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24 // La sesión dura 1 día (en milisegundos)
    }
}));



// Guardia para las páginas HTML (Redirige al login si no está autenticado)
function requireAuth(req: Request, res: Response, next: NextFunction) {
    if (req.session.usuario) {
        next(); // El usuario tiene permiso, lo dejamos pasar
    } else {
        res.redirect('/app/login'); // No tiene permiso, lo enviamos al login
    }
}

// Guardia para la API (Devuelve un error JSON si no está autenticado)
function requireAuthAPI(req: Request, res: Response, next: NextFunction) {
    if (req.session.usuario) {
        next();
    } else {
        res.status(401).json({ estado: 'error', mensaje: 'No autorizado. Debe iniciar sesión.' });
    }
}
// Endpoint: Genera el certificado para la lu suministrada y lo descarga localmente
app.post('/api/v0/certificados', requireAuthAPI, catchAsync(async (req: Request, res: Response) => {
    const { lu } = req.body;
    if (!lu) return res.status(400).json({ estado: "error", mensaje: "Falta la LU." });
    
    const rutaArchivo = await CertificadoService.generarPorLU(lu);
    res.download(rutaArchivo, `Certificado_${lu.replace('/', '-')}.html`);
}));

// Endpoint: Recibe un lu y simula la solicitud del titulo en tramite (setea el atrib titulo_en_tramite con la fecha actual)
app.post('/api/v0/tramite-titulo', requireAuthAPI, catchAsync(async (req: Request, res: Response) => {
    const { lu } = req.body;
    if (!lu) return res.status(400).json({ estado: "error", mensaje: "Falta la LU." });

    const query = `UPDATE aida.alumnos SET titulo_en_tramite = CURRENT_DATE WHERE lu = $1 AND egreso IS NOT NULL AND titulo_en_tramite IS NULL;`;
    const resultado = await pool.query(query, [lu]);

    if (resultado.rowCount === 0) {
        return res.status(400).json({ estado: "error", mensaje: "No se puede iniciar el trámite. Verifique que el alumno haya egresado y no tenga un trámite activo." });
    }
    res.json({ estado: "exito", mensaje: "Trámite de título iniciado con la fecha de hoy." });
}));

// Endpoint: Recibe una fecha de titulo_en_tramite y genera los certificados para todos los alumnos que solicitaron titulo en esa fecha
// Endpoint: Certificados por fecha (Descarga en formato ZIP)
app.post('/api/v0/fecha', requireAuthAPI, catchAsync(async (req: Request, res: Response) => {
    const { fecha } = req.body;
    if (!fecha) return res.status(400).json({ estado: "error", mensaje: "Debe ingresar una fecha válida." });

    const rutasArchivos = await CertificadoService.generarPorFecha(fecha);

    // 1. Forzamos los encabezados de descarga
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename=certificados_${fecha}.zip`);

    const archive = archiver('zip', { zlib: { level: 9 } });

    // 2. Manejo de errores del compresor
    archive.on('error', (err) => {
        console.error("Error en el compresor ZIP:", err);
        if (!res.headersSent) {
            res.status(500).send({ error: err.message });
        }
    });

    // 3. Canalizar la salida directamente a la respuesta
    archive.pipe(res);

    // 4. Agregar archivos
    for (const ruta of rutasArchivos) {
        const nombreArchivo = path.basename(ruta);
        archive.file(ruta, { name: nombreArchivo });
    }

    // 5. Finalizar y esperar a que el stream se complete
    await archive.finalize();
    
    console.log(`ZIP enviado exitosamente para la fecha: ${fecha}`);
}));

// Endpoint: Devuelve todos los alumnos en la base de datos (se llama al carga la pagina de alumnos y cuando esta hace un fetch?)
app.get('/api/alumnos', requireAuthAPI, catchAsync(async (req: Request, res: Response) => {
    const alumnos = await AlumnoRepository.obtenerTodos();
    res.json({ estado: "exito", datos: alumnos });   
}));

// Crear alumno 
// Crear alumno individual (Refactorizado para usar el Servicio)
app.post('/api/alumno', requireAuthAPI, catchAsync(async (req: Request, res: Response) => {
    const datosValidados = alumnoSchema.parse(req.body); 
    await AlumnoService.crearAlumno(datosValidados);
    
    res.json({ estado: "exito", mensaje: "Alumno creado correctamente." });
}));



// Endpoint: actualiza los datos pasados del alumno segun la lu
app.put('/api/alumnos/:prefijo/:anio', requireAuthAPI, catchAsync(async (req: Request, res: Response) => {
    const lu = `${req.params.prefijo}/${req.params.anio}`;
    const datosValidados = alumnoSchema.parse(req.body);
    await AlumnoRepository.actualizar(lu, datosValidados);
    res.json({ estado: "exito", mensaje: "Alumno actualizado correctamente." });
}));

//Endpoint elimina de la bdd aida.alumnos el alumno suministrado por req
app.delete('/api/alumnos/:prefijo/:anio', requireAuthAPI, catchAsync(async (req: Request, res: Response) => {
    const lu = `${req.params.prefijo}/${req.params.anio}`;
    await AlumnoRepository.eliminar(lu);
    res.json({ estado: "exito", mensaje: "Alumno eliminado correctamente." });
}));

// GET: Obtener historial académico de un alumno
// Usamos :lu(*) para que Express entienda LUs con barras (ej: 123/26)
app.get('/api/v0/historial/:prefijo/:anio', requireAuthAPI, catchAsync(async (req: Request, res: Response) => {
    
    const lu = `${req.params.prefijo}/${req.params.anio}`;
    
    // 1. Verificamos que el alumno exista primero (esto sí es secuencial)
    const dataAlumno  = await AlumnoRepository.obtenerDatos(lu);

    if (dataAlumno.rows.length === 0) {
        return res.status(404).json({ estado: "error", mensaje: "Alumno no encontrado." });
    }
    const alumno = dataAlumno.rows[0];

    // 2. Ejecutamos todas las consultas independientes EN PARALELO
    const [cursadas, cantidadAprobadas, promedio, totalMateriasCarrera] = await Promise.all([
        CursadasRepository.obtenerCursadas(lu),
        CursadasRepository.cantidadMateriasAprobadas(lu),
        AcademicoService.calcularPromedioAlumno(lu),
        PlanEstudiosRepository.cantidadMateriasRequeridas(lu)
    ]);
    
    // 3. Cálculo final
    const porcentaje = totalMateriasCarrera > 0 
        ? Math.round((cantidadAprobadas / totalMateriasCarrera) * 100) 
        : 0;

    // 4. Enviar el paquete de datos
    res.json({
        estado: "exito",
        alumno: `${alumno.nombres} ${alumno.apellido}`,
        lu: lu,
        estadisticas: {
            promedioActual: promedio,
            porcentajeCompletado: porcentaje,
            materiasAprobadas: cantidadAprobadas,
            totalMaterias: totalMateriasCarrera
        },
        historial: cursadas
    });
}));

// Endpoint: Obtener lista de carreras
app.get('/api/v0/carreras', requireAuthAPI, catchAsync(async (req: Request, res: Response) => {
    const carreras = await CarrerasRepository.obtenerCarreras();
    res.json(carreras);
}));

// ----Endpoints para Funcionalidad de cursada----

// Añadir cursada
app.post('/api/v0/cursada', requireAuthAPI, catchAsync(async (req: Request, res: Response) => {
    const { lu, idMateria, año, cuatrimestre, nota } = req.body; 
    
    if(!lu || !idMateria || !año || !cuatrimestre || nota === undefined){
        return res.status(400).json({ estado: "error", mensaje: "Falta completar datos." });
    }

    const notaNum = parseInt(nota);
    if (isNaN(notaNum) || notaNum < 1 || notaNum > 10) {
        return res.status(400).json({ estado: "error", mensaje: "La nota debe ser un número entero entre 1 y 10." });
    }

    await AcademicoService.procesarNuevaNota(lu, idMateria, año, cuatrimestre, notaNum); 
    
    res.json({ estado: "exito", mensaje: "Cursada procesada y registrada correctamente." });
}));

// ---- Ednpoints de Autenticación ----

//Endpoint: creacion de usuario
app.post('/api/v0/auth/register', catchAsync(async (req: Request, res: Response) => {
    const { username, password, nombre, email } = req.body;
    if (!username || !password || !nombre || !email) {
        return res.status(400).json({ estado: 'error', mensaje: 'No se ingresaron todos los datos necesario' });
    }
    await AuthenticationService.registrarUsuario(username, password, nombre, email);
    res.json({ estado: "exito", mensaje: "Usuario registrado correctamente." });
}));

//Endpoint: login del usuario
app.post('/api/v0/auth/login', catchAsync(async (req: Request, res: Response) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ estado: "error", mensaje: "Usuario y contraseña son obligatorios." });
    }

    // Delegamos la búsqueda y la verificación criptográfica al Servicio
    const usuarioValidado = await AuthenticationService.login(username, password);
    
    if (!usuarioValidado) {
        return res.status(401).json({ estado: "error", mensaje: "Credenciales incorrectas." });
    }

    req.session.usuario = usuarioValidado;
    res.json({ estado: "exito", mensaje: "Usuario logueado correctamente." });
}));

//Endpoint de Logout
app.post('/api/v0/auth/logout', (req, res) => {
    // Destruimos la sesión en la memoria del servidor
    req.session.destroy((error) => {
        if (error) {
            return res.status(500).json({ estado: 'error', mensaje: 'No se pudo cerrar la sesión.' });
        }
        
        // Limpiamos la cookie del navegador del usuario. 
        // 'connect.sid' es el nombre por defecto que usa express-session.
        res.clearCookie('connect.sid'); 
        
        // Respondemos con éxito
        res.json({ estado: 'exito', mensaje: 'Sesión cerrada correctamente.' });
    });
});

// --- Rutas del Frontend ---

// Ruta raíz: Redirige automáticamente a la pantalla de login
app.get('/', (req, res) => {
    res.redirect('/app/login');
});

// Rutas del Frontend
app.get('/menu', requireAuth, (req, res) => {
    res.sendFile(path.resolve('./public/menu.html'));
});

app.get('/app/certificados', requireAuth, (req, res) => {
    res.sendFile(path.resolve('./public/certificados.html'));
});

app.get('/app/fecha', requireAuth, (req, res) => {
    res.sendFile(path.resolve('./public/fecha.html'));
});

app.get('/app/archivo', requireAuth, (req, res) => {
    res.sendFile(path.resolve('./public/archivo.html'));
});

app.get('/app/alumnos', requireAuth, (req, res) => {
    res.sendFile(path.resolve('./public/alumnos.html'));
});

app.get('/app/cursada', requireAuth, (req, res) => {
    res.sendFile(path.resolve('./public/cursada.html'));
});

app.get('/app/historial', requireAuth, (req, res) => {
    res.sendFile(path.resolve('./public/historial.html'));
});


app.get('/app/login', (req, res) => {
    if (req.session.usuario) {
        return res.redirect('/menu');
    }
    
    res.sendFile(path.resolve('./public/login.html'));
});

app.get('/api/v0/auth/verificar', requireAuthAPI, (req: Request, res: Response) => {
    res.json({ 
        estado: "exito", 
        mensaje: "Sesión activa." 
    });
});

// Endpoint: Carga multiples alumnos desde JSON
app.patch('/api/v0/archivo', requireAuthAPI, catchAsync(async (req: Request, res: Response) => {
    const datosAlumnos = req.body;
    if (!Array.isArray(datosAlumnos)) {
        return res.status(400).json({ estado: "error", mensaje: "El formato debe ser un arreglo JSON." });
    }
    const insertados = await AlumnoService.cargarDesdeJson(datosAlumnos);
    res.json({ estado: "exito", mensaje: `Se insertaron ${insertados} alumnos en la base de datos.` });
}));

// Arranque del servidor
async function iniciarServidor() {
    try {
        // A diferencia del CLI, en un servidor web nos conectamos a la BD UNA sola vez al arrancar
        await conectarBD(); 
        console.log("Conexión a la base de datos establecida.");

        const puerto = process.env.PORT || 3000;

        // AL FINAL DE server.ts

        // Solo iniciamos el servidor real si NO estamos testeando
        if (process.env.NODE_ENV !== 'test') {
            const PORT = process.env.PORT || 3000;
            app.listen(PORT, () => {
                console.log(`Servidor de AIDA corriendo en el puerto ${PORT}`);
            });
        }

       
    } catch (error) {
        console.error("Error fatal al arrancar el servidor:", error);
    }
}

// Exportamos la app para que Supertest pueda "simular" peticiones HTTP
export { app };
// --- Middleware Global de Errores ---
// Debe ir siempre al final de todas las rutas definidas en Express
app.use(manejadorDeErrores);

iniciarServidor();

