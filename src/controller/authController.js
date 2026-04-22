const userService = require('../service/userService');

const register = async (req, res, next) => {
    try {
        const { email, password, full_name } = req.body;
        const result = await userService.register(email, password, full_name);

        res.status(201).json({
            status: 'success',
            message: 'Usuario registrado exitosamente',
            data: result
        });
    } catch (error) {
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
        const result = await userService.login(email, password);

        res.status(200).json({
            status: 'success',
            message: 'Login exitoso',
            data: result
        });
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
