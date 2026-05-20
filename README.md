# PopStudy - User Microservice (`ps-ms-user-service`)

Este microservicio forma parte del ecosistema de **PopStudy** y se encarga de la gestión de usuarios, autenticación, perfiles y contexto académico de los estudiantes. Está construido con **Node.js**, **Express** y se integra directamente con **Supabase** para la persistencia de datos y la verificación de la autenticación.

---

## 🛠️ Tecnologías Utilizadas

- **Runtime:** Node.js (v18+)
- **Framework Web:** Express.js (v5)
- **Base de Datos:** PostgreSQL (alojado en Supabase)
- **SDK:** `@supabase/supabase-js` (v2)
- **Autenticación:** Supabase Auth (JWT via Bearer Tokens)
- **Herramientas de Desarrollo:** Nodemon, Dotenv, Cors

---

## 📁 Estructura del Proyecto

El microservicio sigue un diseño limpio estructurado en capas:

```text
ps-ms-user-service/
├── src/
│   ├── config/          # Configuración de clientes (Supabase)
│   ├── controller/      # Controladores que manejan las peticiones HTTP
│   ├── middleware/      # Middlewares (autenticación, manejo de errores)
│   ├── repository/      # Capa de acceso a datos (queries a Supabase)
│   ├── routes/          # Definición de rutas del API
│   ├── service/         # Lógica de negocio
│   └── app.js           # Configuración general del Express App
├── index.js             # Punto de entrada del servidor
├── Dockerfile           # Configuración de Docker para producción
├── .env.example         # Plantilla de variables de entorno
└── package.json         # Dependencias y scripts del proyecto
```

---

## 🗄️ Base de Datos

El servicio interactúa con las siguientes tablas en Supabase:

- **`auth.users`**: Tabla de autenticación manejada por Supabase Auth (registro e inicio de sesión).
- **`student`**: Tabla de perfil del estudiante que almacena información adicional del usuario.
  - **Trigger**: Se asume la existencia de un trigger `on_auth_user_created` que crea automáticamente una entrada en la tabla `student` cuando un usuario se registra en Auth.
  - **Relación**: El `id` en la tabla `student` corresponde al `user_id` de Supabase Auth.

---

## ⚙️ Configuración del Entorno

Para ejecutar el servicio localmente, crea un archivo `.env` en la raíz del proyecto basándote en `.env.example`:

```env
# --- CONFIGURACIÓN GENERAL ---
PORT=3001
NODE_ENV=development

# --- SUPABASE (Secrets) ---
SUPABASE_URL=tu_supabase_url
SUPABASE_SERVICE_ROLE=tu_supabase_service_role
```

### Explicación de Variables:
- **`PORT`**: Puerto local donde se levantará el servidor (por defecto `3001`).
- **`NODE_ENV`**: Entorno de ejecución (`development` o `production`).
- **`SUPABASE_URL`**: URL del proyecto de tu base de datos Supabase.
- **`SUPABASE_SERVICE_ROLE`**: Clave Service Role (Service Key) para interactuar de forma segura con la base de datos saltándose políticas RLS cuando corresponda.

---

## 🚀 Instrucciones de Ejecución

### Ejecución Local

1. Instalar las dependencias:
   ```bash
   npm install
   ```

2. Correr en modo desarrollo (con recarga automática mediante Nodemon):
   ```bash
   npm run dev
   ```

3. Correr en modo producción:
   ```bash
   npm start
   ```

### Ejecución con Docker

Puedes compilar y ejecutar el contenedor usando el `Dockerfile` provisto:

1. Construir la imagen de Docker:
   ```bash
   docker build -t ps-ms-user-service .
   ```

2. Ejecutar el contenedor:
   ```bash
   docker run -p 3001:3001 --env-file .env ps-ms-user-service
   ```

---

## 🛣️ Endpoints de la API

El microservicio está diseñado para trabajar detrás de un API Gateway. Los endpoints principales son:

### Salud del Sistema
- `GET /health` - Verifica el estado del servicio.

### Autenticación
- `POST /register` - Registra un nuevo estudiante en el sistema.
- `POST /login` - Inicia sesión y devuelve un token JWT.

### Perfil de Usuario (Requiere Auth JWT)
- `GET /profile` - Obtiene la información del perfil del usuario autenticado.
- `PUT /profile` - Actualiza los datos del perfil.
- `DELETE /profile` - Elimina la cuenta del usuario.

### Contexto Académico (Requiere Auth JWT)
- `GET /context` - Obtiene el contexto académico del estudiante (información complementaria).

---

## 🔐 Autenticación

Todas las rutas del microservicio (excepto `GET /health`, `POST /register` y `POST /login`) requieren autenticación obligatoria.

El microservicio utiliza el middleware `requireAuth` que valida el token JWT emitido por Supabase Auth. El token debe incluirse en el header `Authorization` con el formato:

```
Authorization: Bearer <token_jwt>
```

---

## 📄 Licencia

ISC
