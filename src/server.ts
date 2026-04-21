import express from 'express';
import { pool, conectarBD } from './database.js';
import path from 'path'; 
import session from 'express-session';
import { Usuario } from './repositories/usuariosRepository.js';
import { manejadorDeErrores } from './middlewares/errorHandler.js';
import helmet from 'helmet';
import connectPgSimple from 'connect-pg-simple';
import apiRoutes from './routes/index.js';

declare module 'express-session' {
    interface SessionData {
        usuario?: Usuario;
    }
}

const app = express();

app.set('trust proxy', 1); // Confiar en el proxy de Render para las cookies seguras

// ------ Middlewares ------
// 1. Middleware fundamental: Le dice a Express que procese el body de las peticiones como JSON

//Un Middleware es una función que intercepta la petición antes de que llegue a nuestras rutas. 
// Esta línea actúa como un traductor automático: toma ese texto crudo, 
// verifica si tiene forma de JSON, y si es así, lo convierte en un objeto real de JavaScript para que podamos usarlo directamente.
app.use(express.json());

app.use(express.static(path.resolve('./frontend/dist'))); // <-- Ahora servimos los archivos compilados de React

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

const PgStore = connectPgSimple(session);

app.use(session({
    store: new PgStore({
        pool: pool,
        schemaName: 'aida',
        tableName: 'sesiones',
        createTableIfMissing: true
    }),
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


// ---------------- ENDPOINTS (RUTAS CONSOLIDADAS) ----------------
app.use('/api', apiRoutes);

// --- RUTA CATCH-ALL PARA REACT (SPA) ---
// Cualquier petición de URL que no haya coincidido con la API, caerá aquí.
// Se devuelve el index.html principal y React Router dibuja la pantalla que corresponda.
app.get(/.*/, (req, res) => {
    res.sendFile(path.resolve('./frontend/dist/index.html'));
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
