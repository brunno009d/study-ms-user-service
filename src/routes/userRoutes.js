const { Router } = require('express');
const requireAuth = require('../middleware/requireAuth');
const userController = require('../controller/userController');

const router = Router();

// Todas las rutas de usuario requieren autenticación JWT
router.use(requireAuth);

// GET /profile — Obtener perfil del usuario autenticado
router.get('/profile', userController.getProfile);

// PUT /profile — Actualizar perfil
router.put('/profile', userController.updateProfile);

// DELETE /profile — Eliminar cuenta
router.delete('/profile', userController.deleteProfile);

module.exports = router;
