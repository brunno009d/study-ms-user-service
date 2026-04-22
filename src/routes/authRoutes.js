const { Router } = require('express');
const authController = require('../controller/authController');

const router = Router();

// POST /register — Registrar nuevo usuario
router.post('/register', authController.register);

// POST /login — Iniciar sesión
router.post('/login', authController.login);

module.exports = router;
