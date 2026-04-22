const userRepository = require('../repository/userRepository');

/**
 * Registra un nuevo usuario: crea en Auth (el trigger crea el perfil en student)
 */
const register = async (email, password, fullName) => {
    // Validaciones básicas
    if (!email || !password) {
        const error = new Error('Email y contraseña son requeridos');
        error.status = 400;
        throw error;
    }

    if (password.length < 6) {
        const error = new Error('La contraseña debe tener al menos 6 caracteres');
        error.status = 400;
        throw error;
    }

    if (!fullName || fullName.trim().length === 0) {
        const error = new Error('El nombre completo es requerido');
        error.status = 400;
        throw error;
    }

    // Crear usuario en Auth (el trigger inserta automáticamente en student)
    const authUser = await userRepository.createAuthUser(email, password, fullName.trim());

    return {
        id: authUser.id,
        email: authUser.email,
        full_name: fullName.trim()
    };
};

/**
 * Login con email y contraseña
 */
const login = async (email, password) => {
    if (!email || !password) {
        const error = new Error('Email y contraseña son requeridos');
        error.status = 400;
        throw error;
    }

    const data = await userRepository.loginUser(email, password);

    return {
        user: {
            id: data.user.id,
            email: data.user.email
        },
        session: {
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
            expires_at: data.session.expires_at
        }
    };
};

/**
 * Obtiene el perfil del usuario autenticado
 */
const getProfile = async (userId) => {
    const profile = await userRepository.getStudentProfile(userId);
    return profile;
};

/**
 * Actualiza el perfil del usuario autenticado
 */
const updateProfile = async (userId, updates) => {
    // Solo permitir campos válidos
    const allowedFields = ['full_name'];
    const filteredUpdates = {};

    for (const key of allowedFields) {
        if (updates[key] !== undefined) {
            filteredUpdates[key] = updates[key];
        }
    }

    if (Object.keys(filteredUpdates).length === 0) {
        const error = new Error('No se proporcionaron campos válidos para actualizar');
        error.status = 400;
        throw error;
    }

    const profile = await userRepository.updateStudentProfile(userId, filteredUpdates);
    return profile;
};

/**
 * Elimina la cuenta del usuario
 */
const deleteAccount = async (userId) => {
    await userRepository.deleteAuthUser(userId);
    return { message: 'Cuenta eliminada exitosamente' };
};

module.exports = {
    register,
    login,
    getProfile,
    updateProfile,
    deleteAccount
};
