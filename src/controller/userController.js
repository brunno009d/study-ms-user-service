const userService = require('../service/userService');

const getProfile = async (req, res, next) => {
    try {
        const profile = await userService.getProfile(req.userId);

        res.status(200).json(profile);
    } catch (error) {
        // Perfil no encontrado en Supabase
        if (error.code === 'PGRST116') {
            return res.status(404).json({
                error: 'not_found',
                message: 'Perfil de estudiante no encontrado'
            });
        }
        next(error);
    }
};

const updateProfile = async (req, res, next) => {
    try {
        // Validar que hay datos para actualizar
        if (!req.body || Object.keys(req.body).length === 0) {
            return res.status(400).json({
                error: 'bad_request',
                message: 'Se debe proporcionar al menos un campo para actualizar'
            });
        }

        const profile = await userService.updateProfile(req.userId, req.body);

        res.status(200).json(profile);
    } catch (error) {
        // Manejar errores específicos del servicio
        const statusCode = error.status || error.statusCode || 500;
        if (statusCode === 400) {
            return res.status(400).json({
                error: 'bad_request',
                message: error.message
            });
        }
        if (statusCode === 404) {
            return res.status(404).json({
                error: 'not_found',
                message: error.message || 'Perfil no encontrado'
            });
        }
        next(error);
    }
};

const deleteProfile = async (req, res, next) => {
    try {
        await userService.deleteAccount(req.userId);

        res.status(204).send();
    } catch (error) {
        const statusCode = error.status || error.statusCode || 500;
        if (statusCode === 404) {
            return res.status(404).json({
                error: 'not_found',
                message: error.message || 'Cuenta no encontrada'
            });
        }
        next(error);
    }
};

module.exports = {
    getProfile,
    updateProfile,
    deleteProfile
};
