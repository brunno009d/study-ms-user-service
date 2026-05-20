const { Router } = require('express');
const requireAuth = require('../middleware/requireAuth');
const userController = require('../controller/userController');
const aiContextController = require('../controller/aiContextController');

const router = Router();

// Todas las rutas de usuario requieren autenticación JWT
router.use(requireAuth);

// IA: Contexto completo del perfil (solo lectura)
router.get('/ai-context', aiContextController.getContext);

// GET /profile — Obtener perfil del usuario autenticado
router.get('/profile', userController.getProfile);

// PUT /profile — Actualizar perfil completo
router.put('/profile', userController.updateProfile);

// PATCH /profile — Actualización parcial (avatar, tema, etc.)
router.patch('/profile', userController.updateProfile);

// DELETE /profile — Eliminar cuenta
router.delete('/profile', userController.deleteProfile);

module.exports = router;
