const userService = require('../service/userService');



// Devuelve el perfil completo del estudiante autenticado.
const getContext = async (req, res, next) => {
    try {
        const profile = await userService.getProfile(req.userId);
        res.status(200).json(profile);
    } catch (error) {
        // Si el perfil no existe, devolvemos null en vez de 404
        if (error.code === 'PGRST116') {
            return res.status(200).json(null);
        }
        next(error);
    }
};

module.exports = { getContext };
