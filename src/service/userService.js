import * as userRepository from '../repository/userRepository.js'

export const register = async (email, password, fullName) => {
    if (!email || !password) {
        const error = new Error('Email y contraseña son requeridos')
        error.status = 400
        throw error
    }

    if (password.length < 6) {
        const error = new Error('La contraseña debe tener al menos 6 caracteres')
        error.status = 400
        throw error
    }

    if (!fullName || fullName.trim().length === 0) {
        const error = new Error('El nombre completo es requerido')
        error.status = 400
        throw error
    }

    const authUser = await userRepository.createAuthUser(email, password, fullName.trim())

    return {
        id: authUser.id,
        email: authUser.email,
        full_name: fullName.trim()
    }
}

export const login = async (email, password) => {
    if (!email || !password) {
        const error = new Error('Email y contraseña son requeridos')
        error.status = 400
        throw error
    }

    const data = await userRepository.loginUser(email, password)

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
    }
}

export const getProfile = async (userId) => {
    return await userRepository.getStudentProfile(userId)
}

export const updateProfile = async (userId, updates) => {
    const allowedFields = ['full_name', 'avatar_url', 'theme_color']
    const filteredUpdates = {}

    for (const key of allowedFields) {
        if (updates[key] !== undefined) {
            filteredUpdates[key] = updates[key]
        }
    }

    if (Object.keys(filteredUpdates).length === 0) {
        const error = new Error('No se proporcionaron campos válidos para actualizar')
        error.status = 400
        throw error
    }

    return await userRepository.updateStudentProfile(userId, filteredUpdates)
}

export const deleteAccount = async (userId) => {
    await userRepository.deleteAuthUser(userId)
    return { message: 'Cuenta eliminada exitosamente' }
}
