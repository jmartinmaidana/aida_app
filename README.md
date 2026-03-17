# 🎓 API REST - Sistema de Gestión Académica (AIDA)

Una API RESTful construida con Node.js y TypeScript para la gestión integral de alumnos, cursadas y emisión de certificados académicos. 

---

## 🛠️ Tecnologías Utilizadas

* **Entorno de Ejecución:** Node.js
* **Lenguaje:** TypeScript
* **Framework Web:** Express.js
* **Base de Datos:** PostgreSQL
* **Validación de Datos:** Zod
* **Seguridad:** Bcrypt (Hasheo de contraseñas)
* **Autenticación:** Sistema basado en Sesiones (`express-session`)

---

## 📁 Estructura del Proyecto

```text
src/
├── middlewares/       # Interceptores (Manejo global de errores, Autenticación)
├── repositories/      # Capa de acceso a datos (Alumnos, Cursadas, Usuarios, etc.)
├── services/          # Lógica de negocio (AcademicoService, AuthService, etc.)
├── database.ts        # Configuración del Pool de PostgreSQL
├── server.ts          # Configuración de Express y definición de rutas
└── migrador.ts        # Sistema automático de migraciones de base de datos
```

---

## 🚀 Instalación y Ejecución Local

### Requisitos Previos
* **Node.js** (v18 o superior)
* **PostgreSQL** (Instancia local o en la nube)

### Pasos de Instalación

1. **Clonar el repositorio:**
   ```bash
   git clone [URL_DE_SU_REPOSITORIO]
   cd [NOMBRE_DE_LA_CARPETA]
   ```

2. **Instalar dependencias:**
   ```bash
   npm install
   ```

3. **Configurar variables de entorno:**
   Crear un archivo `.env` en la raíz del proyecto. Debe contener las credenciales de una base de datos PostgreSQL válida y una clave secreta para las sesiones:
   ```env
   DATABASE_URL=postgresql://usuario:password@host:puerto/basededatos
   SECRET_SESSION=ingrese_una_cadena_de_texto_segura
   PORT=3000
   ```

4. **Compilar y ejecutar:**
   ```bash
   npm run build
   npm run start
   ```
   *(Nota: El comando start ejecutará automáticamente el script `migrador.ts`, el cual creará las tablas necesarias en su base de datos si no existen).*

---

## 📡 Endpoints Principales

### Alumnos
* `GET /api/alumnos` - Obtiene la lista de todos los alumnos.
* `POST /api/alumno` - Registra un nuevo alumno (Validado vía Zod).
* `PUT /api/alumnos/:prefijo/:anio` - Actualiza los datos de un alumno.
* `DELETE /api/alumnos/:prefijo/:anio` - Elimina un registro.

### Cursadas y Gestión Académica
* `POST /api/v0/cursada` - Carga una nota y verifica automáticamente si el alumno cumple requisitos de egreso.
* `PATCH /api/v0/archivo` - Carga masiva de registros de alumnos mediante JSON.

### Certificados y Trámites
* `POST /api/v0/certificados` - Genera y descarga un certificado HTML para una LU específica.
* `POST /api/v0/tramite-titulo` - Inicia el trámite de título validando requisitos de egreso.

### Sistema y Autenticación
* `POST /api/v0/auth/register` - Registro de nuevos usuarios administradores.
* `POST /api/v0/auth/login` - Autenticación de usuarios e inicio de sesión.
* `POST /api/v0/auth/logout` - Cierre de sesión seguro.