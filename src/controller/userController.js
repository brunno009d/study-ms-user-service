const userService = require('../service/userService');

const getProfile = async (req, res, next) => {
    try {
        const profile = await userService.getProfile(req.userId);

        res.status(200).json({
            status: 'success',
            data: profile
        });
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
        const profile = await userService.updateProfile(req.userId, req.body);

        res.status(200).json({
            status: 'success',
            message: 'Perfil actualizado exitosamente',
            data: profile
        });
    } catch (error) {
        next(error);
    }
};

const deleteProfile = async (req, res, next) => {
    try {
        const result = await userService.deleteAccount(req.userId);

        res.status(200).json({
            status: 'success',
            message: result.message
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getProfile,
    updateProfile,
    deleteProfile
};
