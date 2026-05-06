# PopStudy - Microservicio de Usuarios (ps-ms-user-service)

Este microservicio se encarga de la gestión de usuarios, autenticación y perfiles dentro del ecosistema PopStudy. Utiliza Supabase Auth y Database para el manejo de identidades y persistencia de datos.

## 🚀 Tecnologías

- **Node.js**: Entorno de ejecución para JavaScript.
- **Express**: Framework web para la API.
- **Supabase**: Backend-as-a-Service para base de datos y autenticación (PostgreSQL).
- **JWT (JSON Web Tokens)**: Para la seguridad y autorización de rutas.
- **Docker**: Para la contenedorización del servicio.

## 🗄️ Base de Datos

El servicio interactúa con la tabla `student` en Supabase.
- **Trigger**: Se asume la existencia de un trigger `on_auth_user_created` en Supabase que crea automáticamente una entrada en la tabla `student` cuando un usuario se registra en Auth.
- **Relación**: El `id` en la tabla `student` corresponde al `user_id` de Supabase Auth.

## 📋 Requisitos Previos

- [Node.js](https://nodejs.org/) (v18 o superior recomendado)
- [Docker](https://www.docker.com/) (opcional, para despliegue)
- Una cuenta en [Supabase](https://supabase.com/) con un proyecto configurado.

## ⚙️ Configuración

1. Clona el repositorio.
2. Instala las dependencias:
   ```bash
   npm install
   ```
3. Crea un archivo `.env` basado en el `.env.example`:
   ```bash
   cp .env.example .env
   ```
4. Configura las variables de entorno en el archivo `.env`:
   - `PORT`: Puerto donde correrá el servicio (ej. 3001).
   - `SUPABASE_URL`: URL de tu proyecto en Supabase.
   - `SUPABASE_SERVICE_ROLE`: Service Role Key para operaciones administrativas.

## 🏃 Ejecución

### Desarrollo
Para iniciar el servicio con recarga automática:
```bash
npm run dev
```

### Producción
Para iniciar el servicio en modo producción:
```bash
npm start
```

## 🐳 Docker

Puedes construir y ejecutar el servicio usando Docker:

```bash
# Construir la imagen
docker build -t ps-ms-user-service .

# Ejecutar el contenedor
docker run -p 3001:3001 --env-file .env ps-ms-user-service
```

## 🛣️ API Endpoints

El microservicio está diseñado para trabajar detrás de un API Gateway. Internamente, las rutas se montan en `/`.

### Salud del Sistema
- `GET /health`: Verifica el estado del servicio.

### Autenticación
- `POST /register`: Registra un nuevo estudiante.
- `POST /login`: Inicia sesión y devuelve un token JWT.

### Perfil de Usuario (Requiere Auth JWT)
- `GET /profile`: Obtiene la información del perfil del usuario autenticado.
- `PUT /profile`: Actualiza los datos del perfil.
- `DELETE /profile`: Elimina la cuenta del usuario.

## 📂 Estructura del Proyecto

```text
ps-ms-user-service/
├── src/
│   ├── config/      # Configuración de clientes (Supabase, etc.)
│   ├── controller/  # Lógica de manejo de peticiones HTTP
│   ├── middleware/  # Middlewares (Auth, Error handling)
│   ├── repository/  # Acceso directo a la base de datos
│   ├── routes/      # Definición de rutas Express
│   ├── service/     # Lógica de negocio
│   └── app.js       # Configuración central de Express
├── index.js         # Punto de entrada del servidor
├── Dockerfile       # Configuración de Docker
└── package.json     # Dependencias y scripts
```

## 📄 Licencia

ISC
