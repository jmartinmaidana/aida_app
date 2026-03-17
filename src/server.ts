import express from 'express';
import { pool, conectarBD, generarCertificadoPorLU, generarCertifadosPorFecha, cargarAlumnosDesdeJson, obtenerCarreras, obtenerAlumnosEnBD , cargarAlumnoEnBD,cargarCursadaAprobada, actualizarAlumnoEnBD, eliminarAlumno , Alumno, verificarCarreraAprobada} from './aida.js';
import path from 'path'; 
import session from 'express-session';
import { Request, Response, NextFunction } from 'express';
import { Usuario, crearUsuario, autenticarUsuario } from './autenticacion.js';


declare module 'express-session' {
    interface SessionData {
        usuario?: Usuario;
    }
}

const app = express();
const puerto = 3000;

// 1. Middleware fundamental: Le dice a Express que procese el body de las peticiones como JSON

//Un Middleware es una función que intercepta la petición antes de que llegue a nuestras rutas. 
// Esta línea actúa como un traductor automático: toma ese texto crudo, 
// verifica si tiene forma de JSON, y si es así, lo convierte en un objeto real de JavaScript para que podamos usarlo directamente.
app.use(express.json());

app.use(express.static('public'));

// Configuración del motor de sesiones
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
app.post('/api/v0/certificados', requireAuthAPI, async (req, res) => {
    try {
        const { lu } = req.body;
        if (!lu) {
            return res.status(400).json({ estado: "error", mensaje: "Falta la LU." });
        }
        
        // 1. Obtenemos la ruta del archivo generado
        const rutaArchivo = await generarCertificadoPorLU(lu);
        res.download(rutaArchivo, `Certificado_${lu.replace('/', '-')}.html`);

    } catch (error: any) {
        res.status(400).json({ estado: "error", mensaje: error.message });
    }
});

// Endpoint: Recibe un lu y simula la solicitud del titulo en tramite (setea el atrib titulo_en_tramite con la fecha actual)
app.post('/api/v0/tramite-titulo', requireAuthAPI, async (req, res) => {
    try {
        const { lu } = req.body;
        if (!lu) {
            return res.status(400).json({ estado: "error", mensaje: "Falta la LU." });
        }

        // Blindaje SQL: Solo actualiza si TIENE egreso y NO TIENE trámite previo
        const query = `
            UPDATE aida.alumnos 
            SET titulo_en_tramite = CURRENT_DATE 
            WHERE lu = $1 AND egreso IS NOT NULL AND titulo_en_tramite IS NULL;
        `;
        const resultado = await pool.query(query, [lu]);

        if (resultado.rowCount === 0) {
            return res.status(400).json({ 
                estado: "error", 
                mensaje: "No se puede iniciar el trámite. Verifique que el alumno haya egresado y no tenga un trámite activo." 
            });
        }

        res.json({ estado: "exito", mensaje: "Trámite de título iniciado con la fecha de hoy." });
    } catch (error: any) {
        res.status(500).json({ estado: "error", mensaje: "Error al registrar el trámite." });
    }
});

// Endpoint: Recibe una fecha de titulo_en_tramite y genera los certificados para todos los alumnos que solicitaron titulo en esa fecha
app.post('/api/v0/fecha', requireAuthAPI, async (req, res) => {
    try {
        const { fecha } = req.body;
        if (!fecha) {
            return res.status(400).json({ estado: "error", mensaje: "Debe ingresar una fecha válida." });
        }

        console.log(`Generando certificados masivos para solicitudes del: ${fecha}`);
        await generarCertifadosPorFecha(fecha);
        
        res.json({ 
            estado: "exito", 
            mensaje: `Proceso finalizado. Certificados solicitados el ${fecha} se generaron exitosamente.` 
        });
    } catch (error: any) {

        res.status(400).json({ estado: "error", mensaje: error.message });
    }
});

// Endpoint: Devuelve todos los alumnos en la base de datos (se llama al carga la pagina de alumnos y cuando esta hace un fetch?)
app.get('/api/alumnos', requireAuthAPI, async (req, res) => {
    try {
        const alumnos = await obtenerAlumnosEnBD();
        res.json({ estado: "exito", datos: alumnos });   
    } catch (error: any) {
        res.status(500).json({ estado: "error", mensaje: error.message });
    }

})

// Endpoint carga a la bdd aida.alumnos el alumno suministrado por req
app.post('/api/alumno', requireAuthAPI, async (req, res) => {
    try {
        const nuevoAlumno = req.body as Alumno
        await cargarAlumnoEnBD(nuevoAlumno);
        res.json({ estado: "exito", mensaje: "Alumno creado correctamente." });
    } catch (error: any) {
        res.status(500).json({ estado: "error", mensaje: error.message });
    }
});

// Endpoint: actualiza los datos pasados del alumno segun la lu
app.put('/api/alumnos/:prefijo/:anio', requireAuthAPI, async (req, res) => {
    try {
        const lu = `${req.params.prefijo}/${req.params.anio}`
        await actualizarAlumnoEnBD(lu, req.body);
        res.json({ estado: "exito", mensaje: "Alumno actualizado correctamente." });
    } catch (error: any) {
        res.status(500).json({ estado: "error", mensaje: error.message });
    }
});

//Endpoint elimina de la bdd aida.alumnos el alumno suministrado por req
app.delete('/api/alumnos/:prefijo/:anio',requireAuthAPI, async (req, res) => {
    try {
        const lu = `${req.params.prefijo}/${req.params.anio}`
        await eliminarAlumno(lu);
        res.json({ estado: "exito", mensaje: "Alumno eliminado correctamente." });
    } catch (error: any) {
        res.status(500).json({ estado: "error", mensaje: error.message });
    }
});

// Endpoint: Obtener lista de carreras
app.get('/api/v0/carreras', requireAuthAPI, async (req, res) => {
    try {
        const carreras = await obtenerCarreras();
        res.json(carreras);
    } catch (error: any) {
        res.status(500).json({ estado: "error", mensaje: error.message });
    }
});

// Endpoints para Funcionalidad de cursada

// Añadir aprobado
app.post('/api/v0/cursada', requireAuthAPI, async (req,res) =>{
    try {
        const cursadaDeAlumno = req.body; 
        if(!cursadaDeAlumno.lu || !cursadaDeAlumno.idMateria || !cursadaDeAlumno.año || !cursadaDeAlumno.cuatrimestre){
            return res.status(400).json({ estado: "error", mensaje: "Falta completar datos." });
        }
        await cargarCursadaAprobada(cursadaDeAlumno.lu,cursadaDeAlumno.idMateria, cursadaDeAlumno.año, cursadaDeAlumno.cuatrimestre); 
        await verificarCarreraAprobada(cursadaDeAlumno.lu);
        res.json({ estado: "exito", mensaje: "Cursada Aprobada cargadas correctamente." });
    } catch (error: any) {
        res.status(500).json({ estado: "error", mensaje: error.message });
    } 

})

// ---- Ednpoints de Autenticación ----

//Endpoint: creacion de usuario
app.post('/api/v0/auth/register', async (req, res) => {
    try {
        
        const { username, password, nombre, email } = req.body;
        if (!username || !password || !nombre || !email) {
            return res.status(400).json({ estado: 'error', mensaje: 'No se ingresaron todos los datos necesario' });
        }
        
        await crearUsuario(pool, username, password, nombre, email)
        res.json({ estado: "exito", mensaje: "Usuario registrado correctamente." });
    } catch (error: any) {
        res.status(500).json({ estado: "error", mensaje: error.message });
    }
});

//Endpoint: login del usuario
app.post('/api/v0/auth/login', express.json(), async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ estado: "error", mensaje: "Usuario y contraseña son obligatorios." });
        }

        const usuarioValidado = await autenticarUsuario(pool, username, password);

        if (!usuarioValidado) {
            return res.status(401).json({ estado: "error", mensaje: "Credenciales incorrectas." });
        }

        req.session.usuario = usuarioValidado;
        /* Esto es la estructura que  tiene req.session.usuario{
        "id": 1,
        "username": "admin",
        "nombre": "Administrador",
        "email": "admin@aida.com"
        }*/

        res.json({ estado: "exito", mensaje: "Usuario logueado correctamente." });

    } catch (error: any) {
        res.status(500).json({ estado: "error", mensaje: error.message });
    }
});

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

app.get('/app/login', (req, res) => {
    if (req.session.usuario) {
        return res.redirect('/menu');
    }
    
    res.sendFile(path.resolve('./public/login.html'));
});

// Endpoint: Carga multiples alumnos desde JSON
app.patch('/api/v0/archivo',requireAuthAPI, async (req, res) => {
    const datosAlumnos = req.body; // Aquí llega el JSON
    
    if (!Array.isArray(datosAlumnos)) {
        res.status(400).json({ estado: "error", mensaje: "El formato debe ser un arreglo JSON." });
        return;
    }

    try {
        const insertados = await cargarAlumnosDesdeJson(datosAlumnos);
        res.json({ estado: "exito", mensaje: `Se insertaron ${insertados} alumnos en la base de datos.` });
    } catch (error: any) {
        res.status(500).json({ estado: "error", mensaje: "Error al procesar el JSON", detalle: error.message });
    }
});

// Arranque del servidor
async function iniciarServidor() {
    try {
        // A diferencia del CLI, en un servidor web nos conectamos a la BD UNA sola vez al arrancar
        await conectarBD(); 
        console.log("Conexión a la base de datos establecida.");

        const puerto = process.env.PORT || 3000;

        app.listen(puerto, () => {
            console.log(`Servidor API REST escuchando en el puerto ${puerto}`);
        });
    } catch (error) {
        console.error("Error fatal al arrancar el servidor:", error);
    }
}

iniciarServidor();

