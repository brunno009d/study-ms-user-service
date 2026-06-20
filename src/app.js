import express from 'express'
import cors from 'cors'
import authRoutes from './routes/authRoutes.js'
import userRoutes from './routes/userRoutes.js'
import errorHandler from './middleware/errorHandler.js'

const app = express()

app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'user-service',
        timestamp: new Date().toISOString()
    })
})

app.use('/', authRoutes)
app.use('/', userRoutes)

app.use((req, res) => {
    res.status(404).json({
        error: 'not_found',
        message: `Ruta ${req.method} ${req.path} no encontrada en user-service`
    })
})

app.use(errorHandler)

export default app
