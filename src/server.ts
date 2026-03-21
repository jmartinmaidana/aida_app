import express from 'express';
import { AlumnoRepository } from './repositories/alumnosRepository.js';
import { CarrerasRepository } from './repositories/carrerasRepository.js';
import { pool, conectarBD} from './database.js';
import path from 'path'; 
import session from 'express-session';
import { Request, Response, NextFunction } from 'express';
import { AuthenticationController } from './controllers/authenticationController.js';
import { Usuario } from './repositories/usuariosRepository.js';
import { AlumnoController } from './controllers/alumnoController.js';
import { CertificadoController } from './controllers/certificadoController.js';
import { catchAsync,manejadorDeErrores } from './middlewares/errorHandler.js';
import { HistorialController } from './controllers/historialController.js';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { CursadaController } from './controllers/cursadaController.js';

declare module 'express-session' {
    interface SessionData {
        usuario?: Usuario;
    }
}

const app = express();

app.set('trust proxy', 1); // Confiar en el proxy de Render para las cookies seguras

// Middlewares ------
// 1. Middleware fundamental: Le dice a Express que procese el body de las peticiones como JSON

//Un Middleware es una función que intercepta la petición antes de que llegue a nuestras rutas. 
// Esta línea actúa como un traductor automático: toma ese texto crudo, 
// verifica si tiene forma de JSON, y si es así, lo convierte en un objeto real de JavaScript para que podamos usarlo directamente.
app.use(express.json());

app.use(express.static('public'));

//Esto configurará automáticamente 11 cabeceras de seguridad que bloquean el Clickjacking, 
// previenen que el navegador adivine tipos de archivos (MIME Sniffing) y obligan a conexiones seguras.
// En su server.ts
// En su server.ts
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            
            // Permite los scripts normales
            scriptSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com", "https://cdn.jsdelivr.net"],
            
            // NUEVO: Permite los eventos onclick="..." en sus botones
            scriptSrcAttr: ["'unsafe-inline'"], 
            
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://unpkg.com", "https://cdn.jsdelivr.net"],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "https://unpkg.com", "https://cdn.jsdelivr.net"],
            imgSrc: ["'self'", "data:", "https://unpkg.com", "https://cdn.jsdelivr.net"],
            connectSrc: ["'self'", "https://unpkg.com", "https://cdn.jsdelivr.net"], 
        },
    },
    crossOriginResourcePolicy: { policy: "cross-origin" } 
}));

app.use(session({
    secret: process.env.SESSION_SECRET || 'mi_secreto_super_seguro_123', //Codigo/clave necesaria para validar una cookie y asi  evitar que  un usuario acceda solo creando su propia cookie
    resave: false, //Si ya hay una cookie creada no la dupliques
    saveUninitialized: false, //Se inicializar sin cookie (debe primero loguearse)
    
    cookie: {
    // Si estamos en producción, obligamos a que viaje por HTTPS
        secure: process.env.NODE_ENV === 'production', // En producción con HTTPS esto debe ser true
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


// ----------------ENDPOINTS----------------

// ---- Endpoints de Certificados y Trámites ----
app.post('/api/v0/certificados', requireAuthAPI, catchAsync(CertificadoController.generarPorLuController));
app.post('/api/v0/tramite-titulo', requireAuthAPI, catchAsync(CertificadoController.iniciarTramiteController));
app.post('/api/v0/fecha', requireAuthAPI, catchAsync(CertificadoController.generarZipPorFechaController));

// ---- Endpoints de Gestión de Alumnos ----
app.get('/api/alumnos', requireAuthAPI, catchAsync(AlumnoController.obtenerTodosAlumnoController));
app.post('/api/alumno', requireAuthAPI, catchAsync(AlumnoController.crearAlumnoController));
app.put('/api/alumnos/:prefijo/:anio', requireAuthAPI, catchAsync(AlumnoController.actualizarAlumnoController));
app.delete('/api/alumnos/:prefijo/:anio', requireAuthAPI, catchAsync(AlumnoController.eliminarAlumnoController));
app.patch('/api/v0/archivo', requireAuthAPI, catchAsync(AlumnoController.cargarArchivoAlumnoController));

// GET: Obtener historial académico de un alumno
// Usamos :lu(*) para que Express entienda LUs con barras (ej: 123/26)// GET: Obtener historial académico de un alumno
app.get('/api/v0/historial/:prefijo/:anio', requireAuthAPI, catchAsync(HistorialController.obtener));

// Endpoint: Obtener lista de carreras
app.get('/api/v0/carreras', requireAuthAPI, catchAsync(async (req: Request, res: Response) => {
    const carreras = await CarrerasRepository.obtenerCarreras();
    res.json(carreras);
}));

// ----Endpoints para Funcionalidad de cursada----

// Añadir cursada
app.post('/api/v0/cursada', requireAuthAPI, catchAsync(CursadaController.registrar));

// ---- Ednpoints de Autenticación ----

// --- Regla Anti Fuerza Bruta ---
// --- Regla Anti Fuerza Bruta (Rate Limiting) ---
// Solo aplicamos el límite si NO estamos en entorno de testing
const aplicarRateLimit = process.env.NODE_ENV !== 'test';

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: aplicarRateLimit ? 5 : 1000, // Si es test, le damos 1000 intentos para que no moleste
    message: { 
        estado: "error", 
        mensaje: "Demasiados intentos de inicio de sesión. Por favor, intente nuevamente en 15 minutos." 
    },
    standardHeaders: true, 
    legacyHeaders: false,
});


// ---- Endpoints de Autenticación y Usuarios ----
app.post('/api/v0/auth/register', catchAsync(AuthenticationController.registrarAuthController));
app.post('/api/v0/auth/login', loginLimiter, catchAsync(AuthenticationController.loginAuthController));
app.post('/api/v0/auth/logout', AuthenticationController.logoutAuthController);
app.get('/api/v0/auth/verificar', requireAuthAPI, AuthenticationController.verificarAuthController);


// Endpoint: login del usuario (AHORA PROTEGIDO)

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

// Arranque del servidor
async function iniciarServidor() {
    try {
        await conectarBD(); 
        console.log("Conexión a la base de datos establecida.");

        const puerto = process.env.PORT || 3000;

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

