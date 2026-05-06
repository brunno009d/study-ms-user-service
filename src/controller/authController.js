const userService = require('../service/userService');

const register = async (req, res, next) => {
    try {
        const { email, password, full_name } = req.body;

        // Validar campos requeridos
        if (!email || !password || !full_name) {
            return res.status(400).json({
                error: 'bad_request',
                message: 'Campos requeridos faltantes: email, password y full_name'
            });
        }

        const result = await userService.register(email, password, full_name);

        res.status(201).json(result);
    } catch (error) {
        // Validación de email/contraseña del servicio
        if (error.status === 400) {
            return res.status(400).json({
                error: 'bad_request',
                message: error.message
            });
        }
        // Errores de Supabase Auth
        if (error.message?.includes('already registered')) {
            return res.status(409).json({
                error: 'conflict',
                message: 'Este email ya está registrado'
            });
        }
        next(error);
    }
};

const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        // Validar campos requeridos
        if (!email || !password) {
            return res.status(400).json({
                error: 'bad_request',
                message: 'Campos requeridos faltantes: email y password'
            });
        }

        const result = await userService.login(email, password);

        res.status(200).json(result);
    } catch (error) {
        // Credenciales inválidas de Supabase
        if (error.message?.includes('Invalid login credentials')) {
            return res.status(401).json({
                error: 'unauthorized',
                message: 'Email o contraseña incorrectos'
            });
        }
        next(error);
    }
};

module.exports = {
    register,
    login
};
