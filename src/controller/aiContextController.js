import * as userService from '../service/userService.js'

export const getContext = async (req, res, next) => {
    try {
        const profile = await userService.getProfile(req.userId)
        res.status(200).json(profile)
    } catch (error) {
        if (error.code === 'PGRST116') {
            return res.status(200).json(null)
        }
        next(error)
    }
}
