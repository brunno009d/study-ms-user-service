import { Router } from 'express'
import requireAuth from '../middleware/requireAuth.js'
import { getProfile, updateProfile, deleteProfile } from '../controller/userController.js'
import { getContext } from '../controller/aiContextController.js'

const router = Router()

router.use(requireAuth)

router.get('/ai-context', getContext)
router.get('/profile', getProfile)
router.put('/profile', updateProfile)
router.patch('/profile', updateProfile)
router.delete('/profile', deleteProfile)

export default router
