# 🎓 API REST - Sistema de Gestión Académica (AIDA)

Una API RESTful construida con Node.js y TypeScript para la gestión integral de alumnos, cursadas y emisión de certificados académicos. 
Esta aplicacion es funcional y se encuentra desplegada utilizando Render y Supabase en: 
https://aida-app-safp.onrender.com

---

## 🛠️ Tecnologías Utilizadas

* **Entorno de Ejecución:** Node.js
* **Lenguaje:** TypeScript
* **Framework Web:** Express.js
* **Base de Datos:** PostgreSQL
* **Validación de Datos:** Zod
* **Seguridad:** Bcrypt (Hasheo de contraseñas)
* **Autenticación:** Sistema basado en Sesiones (`express-session`)

## 🧪 Pruebas Automatizadas y CI/CD
* **Jest (Test Runner):** Framework principal utilizado para testing.
* **Supertest:** Para la simulacion en testing de peticiones HTTP
* **GitHub Actions (CI/CD):** Pipeline configurado para interceptar cada `push` o `pull_request` a la rama `main`. El robot levanta un entorno Linux con Node.js, inicializa un contenedor temporal de PostgreSQL, y ejecuta todas las pruebas. El código solo se despliega a producción en Render si el 100% de la suite pasa con éxito y con la verificaicon de los colaboradores que correspondan.
---

## 🏗️ Arquitectura del Proyecto (Layered Architecture)

Sistema diseñado con una arquitectura por capas donde las 3 principales son: controladores, servicios y respositorios.

El flujo de información de la API está estrictamente unidireccional, dividido de la siguiente manera:
```text
src/
├── controllers/   # Capa de Presentación (HTTP): Extrae y formatea los datos del 'req', llama al servicio y devuelve el JSON 'res'.
├── services/      # Capa de Lógica de Negocio: Contiene las reglas del sistema, cálculos matemáticos y validaciones.
├── repositories/  # Capa de Acceso a Datos: Los únicos autorizados a comunicarse con PostgreSQL mediante sentencias SQL.
├── middlewares/   # Interceptores: Manejo global de errores (catchAsync), validación de sesiones y Rate Limiting.
├── database.ts    # Configuración del Pool de conexiones a la base de datos.
├── server.ts      # Enrutador principal e inicializador de la aplicación.
```
---

## 🚀 Instalación y Ejecución Local

### Requisitos Previos
* **Node.js** (v18 o superior)
* **PostgreSQL** (Debe estar instalado y ejecutándose. Deberá crear una base de datos vacía antes de iniciar la app).

### Pasos de Instalación

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
   Crear un archivo `.env` en la raíz del proyecto.
   \`\`\`env
   DATABASE_URL=postgresql://usuario:password@localhost:5432/nombre_de_su_bd_vacia
   SECRET_SESSION=ingrese_una_cadena_de_texto_segura
   PORT=3000
   \`\`\`

4. **Compilar y ejecutar:**
   \`\`\`bash
   npm run build
   npm run start
   \`\`\`
   *(Nota: El sistema incluye un migrador automático. Al iniciar por primera vez, creará todas las tablas necesarias en su base de datos).*

---

## 🖥️ Acceso a la Interfaz de Usuario (Frontend)

Una vez que el servidor esté corriendo, puede acceder a la aplicación visual desde su navegador:

* **URL de Acceso:** `http://localhost:3000/app/login`

**⚠️ Importante - Primer Inicio de Sesión:**
Al ser una instalación nueva, la base de datos no tendrá usuarios. Antes de iniciar sesión, deberá enviar una petición `POST` al endpoint `/api/v0/auth/register` (vía Postman, cURL o ThunderClient) con el siguiente formato JSON para crear su primer administrador:
\`\`\`json
{
  "username": "admin",
  "password": "Password123!",
  "nombre": "Administrador",
  "email": "admin@aida.com"
}
\`\`\`

---

## 🧪 Pruebas Automatizadas (Testing)

Este proyecto cuenta con una suite de pruebas de integración robusta construida con **Jest** y **Supertest**, garantizando la fiabilidad de las rutas, la lógica de negocio y los bloqueos de seguridad.

Para ejecutar el laboratorio de pruebas (creará una base de datos temporal en memoria o transaccional):
\`\`\`bash
npm test
\`\`\`