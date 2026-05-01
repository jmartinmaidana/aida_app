# 🎓 Arquitectura y Funcionamiento del Backend (Proyecto AIDA)

## 1. ¿Cómo funciona el Backend?

El proyecto AIDA utiliza un backend robusto construido en **Node.js** utilizando **TypeScript** y el framework **Express**. Su estructura está diseñada siguiendo una **Arquitectura por Capas (Layered Architecture)**, lo cual garantiza que el flujo de información sea unidireccional, seguro y fácil de mantener.

### 🏗️ Flujo de la Arquitectura

1. **Servidor (`src/server.ts`)**: Es el punto de entrada principal. Se encarga de:
   - Configurar la aplicación Express.
   - Establecer los middlewares de seguridad (`helmet`).
   - Inicializar el manejo de sesiones.
   - Exponer las rutas de la API bajo el prefijo `/api`.
   - **SPA (Single Page Application)**: Sirve los archivos estáticos compilados del frontend (React) y delega cualquier ruta web no capturada por la API al archivo `index.html`.
2. **Controladores**: Reciben las peticiones HTTP, validan los datos entrantes (usando **Zod**, como se ve en `src/schemas_validator.ts`) y delegan la lógica al servicio correspondiente.
3. **Servicios (`src/services/`)**: Agrupan la "Lógica de Negocio". Ejecutan validaciones más complejas (ej. `academicoService.ts` calcula si un alumno cumple las condiciones para egresar) e inician transacciones de base de datos.
4. **Repositorios (`src/repositories/`)**: Son la **única** capa con permisos para ejecutar consultas SQL contra **PostgreSQL** usando el pool de conexiones (`pg`). Ejemplos: `alumnosRepository.ts`, `cursadaRepository.ts`.

### 🔒 Características Clave

* **Autenticación Segura**: Utiliza `express-session` con `connect-pg-simple`. Esto significa que las sesiones web se almacenan físicamente en la base de datos de PostgreSQL, resistiendo caídas del servidor.
* **Protección Avanzada**: Integra `helmet` para blindar los encabezados HTTP frente a ataques comunes (Clickjacking, MIME Sniffing) e implementa políticas estrictas de seguridad de contenido (CSP).
* **Motor de Migraciones Automático (`src/migrador.ts`)**: Durante el arranque, el sistema detecta de forma inteligente los scripts SQL nuevos y los aplica sobre la base de datos para mantener todas las tablas siempre actualizadas sin intervención manual.

---

## 2. Guía Paso a Paso para Levantar el Proyecto Localmente

### Requisitos Previos
* **Node.js** (versión 18 o superior).
* **PostgreSQL** instalado y ejecutándose en tu computadora.
* Debes **crear una base de datos vacía** en tu servidor PostgreSQL (por ejemplo, mediante pgAdmin o psql) antes de iniciar.

### 🛠️ Instalación y Configuración

**Paso 1: Instalar dependencias del Backend**
Abre una terminal en la raíz del proyecto y ejecuta:
```bash
npm install
```

**Paso 2: Construir el Frontend (React)**
Como el servidor Express sirve la interfaz, primero necesitamos compilar el frontend. En la misma terminal, ejecuta:
```bash
cd frontend
npm install
npm run build
cd ..
```

**Paso 3: Variables de Entorno**
Crea un archivo llamado `.env` en la raíz del proyecto (a la misma altura que el `package.json`) y agrega la siguiente configuración (ajusta el usuario, contraseña y base de datos a los tuyos):
```env
DATABASE_URL=postgresql://usuario:password@localhost:5432/nombre_de_su_bd_vacia
SESSION_SECRET=escribe_aqui_una_cadena_de_texto_aleatoria_y_segura
PORT=3000
```

**Paso 4: Compilar y Ejecutar el Servidor**
Una vez que todo está configurado, arranca el servidor. El migrador automático se encargará de crear las tablas necesarias en la base de datos:
```bash
npm run build
npm run start
```

### 🚀 Primer Acceso al Sistema

El sistema estará disponible ingresando en tu navegador a:
👉 `http://localhost:3000/app/login`

**⚠️ Creación del Primer Administrador:**
Como se trata de una base de datos recién creada, no existirán usuarios registrados. Antes de poder iniciar sesión en la interfaz web, deberás crear un administrador enviando una solicitud a la API (puedes usar herramientas como Postman, cURL, o ThunderClient):

* **Endpoint:** `POST http://localhost:3000/api/v0/auth/register`
* **Body (JSON):**
  ```json
  {
    "username": "admin",
    "password": "Password123!",
    "nombre": "Administrador",
    "email": "admin@aida.com"
  }
  ```
¡Una vez ejecutada esa petición exitosamente, podrás regresar a la web e iniciar sesión!