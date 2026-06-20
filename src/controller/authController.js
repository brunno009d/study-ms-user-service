import * as userService from '../service/userService.js'

export const register = async (req, res, next) => {
    try {
        const { email, password, full_name } = req.body

        if (!email || !password || !full_name) {
            return res.status(400).json({
                error: 'bad_request',
                message: 'Campos requeridos faltantes: email, password y full_name'
            })
        }

        const result = await userService.register(email, password, full_name)
        res.status(201).json(result)
    } catch (error) {
        if (error.status === 400) {
            return res.status(400).json({ error: 'bad_request', message: error.message })
        }
        if (error.message?.includes('already registered')) {
            return res.status(409).json({ error: 'conflict', message: 'Este email ya está registrado' })
        }
        next(error)
    }
}

export const login = async (req, res, next) => {
    try {
        const { email, password } = req.body

        if (!email || !password) {
            return res.status(400).json({
                error: 'bad_request',
                message: 'Campos requeridos faltantes: email y password'
            })
        }

        const result = await userService.login(email, password)
        res.status(200).json(result)
    } catch (error) {
        if (error.message?.includes('Invalid login credentials')) {
            return res.status(401).json({ error: 'unauthorized', message: 'Email o contraseña incorrectos' })
        }
        next(error)
    }
}
