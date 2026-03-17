# 🎓 API REST - Sistema de Gestión Académica (AIDA)

Una API RESTful robusta construida con Node.js y TypeScript para la gestión integral de alumnos, cursadas y emisión de certificados académicos. 

Este proyecto destaca por su enfoque en la **Arquitectura Limpia (Clean Architecture)**, la seguridad de los datos y el manejo profesional de errores, preparado para entornos de producción.

---

## 🏗️ Arquitectura y Patrones de Diseño

El sistema está diseñado para ser escalable y mantenible, separando estrictamente las responsabilidades:

* **Arquitectura en Capas:** * **Controladores (Rutas):** Interceptan las peticiones HTTP y delegan el trabajo.
    * **Capa de Servicios (`/services`):** Encapsula las reglas de negocio complejas (ej. validación y generación de certificados).
    * **Patrón Repositorio (`/repositories`):** Aísla la lógica de acceso a la base de datos, permitiendo consultas limpias y reutilizables.
* **Validación Estricta (Zod):** Implementación de esquemas de validación en la capa de entrada para garantizar que la base de datos solo reciba información estructurada y segura, actuando como un escudo contra datos maliciosos o incompletos.
* **Manejo Global de Errores:** Uso de un *Middleware* centralizado e interceptores asíncronos (`catchAsync`) para capturar excepciones de forma unificada, garantizando que el cliente siempre reciba respuestas JSON estandarizadas sin riesgo de colapsar el servidor.
* **Gestión de Conexiones:** Implementación de un `Pool` de conexiones a PostgreSQL para soportar concurrencia real y optimizar el uso de recursos en la nube.

---

## 🛠️ Tecnologías Utilizadas

* **Entorno de Ejecución:** Node.js
* **Lenguaje:** TypeScript
* **Framework Web:** Express.js
* **Base de Datos:** PostgreSQL (alojada en Supabase)
* **Validación de Datos:** Zod
* **Autenticación:** Sistema basado en Sesiones (`express-session`)

---

## 📁 Estructura del Proyecto

\`\`\`text
src/
├── middlewares/       # Interceptores (Manejo de errores, Autenticación)
├── repositories/      # Capa de acceso a datos (Patrón Repositorio)
├── services/          # Lógica de negocio (Generación de certificados, etc.)
├── aida.ts            # Configuración del Pool de PostgreSQL
├── server.ts          # Configuración de Express y definición de rutas
└── migrador.ts        # Sistema automático de migraciones de base de datos
\`\`\`

---

## 🚀 Instalación y Ejecución Local

1. **Clonar el repositorio:**
   \`\`\`bash
   git clone [URL_DE_SU_REPOSITORIO]
   cd [NOMBRE_DE_LA_CARPETA]
   \`\`\`

2. **Instalar dependencias:**
   \`\`\`bash
   npm install
   \`\`\`

3. **Configurar variables de entorno:**
   Crear un archivo `.env` en la raíz del proyecto con las siguientes credenciales:
   \`\`\`env
   DATABASE_URL=postgresql://usuario:password@host:puerto/basededatos
   SECRET_SESSION=su_secreto_para_sesiones
   PORT=3000
   \`\`\`

4. **Compilar TypeScript y arrancar el servidor:**
   \`\`\`bash
   npm run build
   npm run start
   \`\`\`
   *(Nota: El comando start ejecutará automáticamente las migraciones pendientes antes de iniciar el servidor).*

---

## 📡 Endpoints Principales

### Alumnos
* \`GET /api/alumnos\` - Obtiene la lista de todos los alumnos.
* \`POST /api/alumno\` - Registra un nuevo alumno (Validado vía Zod).
* \`PUT /api/alumnos/:prefijo/:anio\` - Actualiza los datos de un alumno.
* \`DELETE /api/alumnos/:prefijo/:anio\` - Elimina un registro.

### Certificados y Trámites
* \`POST /api/v0/certificados\` - Genera y descarga un certificado HTML para una LU específica.
* \`POST /api/v0/tramite-titulo\` - Inicia el trámite de título validando requisitos de egreso.

### Sistema
* \`POST /api/v0/auth/login\` - Autenticación de usuarios.
* \`PATCH /api/v0/archivo\` - Carga masiva de registros mediante JSON.