const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Middleware global
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'user-service',
        timestamp: new Date().toISOString()
    });
});

// Rutas
// El gateway reescribe: /api/auth/* → /* y /api/users/* → /*
// Por eso montamos auth y users en rutas separadas
app.use('/', authRoutes);   // POST /register, POST /login
app.use('/', userRoutes);   // GET /profile, PUT /profile, DELETE /profile

// Ruta no encontrada
app.use((req, res) => {
    res.status(404).json({
        error: 'not_found',
        message: `Ruta ${req.method} ${req.path} no encontrada en user-service`
    });
});

// Manejo de errores
app.use(errorHandler);

module.exports = app;
