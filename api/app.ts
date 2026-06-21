import express, {
  type Request,
  type Response,
} from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import projectRoutes from './routes/projects.js'
import configRoutes from './routes/configs.js'
import pullRoutes from './routes/pull.js'
import encryptionRoutes from './routes/encryption.js'
import logRoutes from './routes/logs.js'
import clientRoutes from './routes/clients.js'
import eventRoutes from './routes/events.js'

dotenv.config()

const app: express.Application = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

app.use('/api/projects', projectRoutes)
app.use('/api/projects', configRoutes)
app.use('/api/pull', pullRoutes)
app.use('/api/encryption', encryptionRoutes)
app.use('/api/logs', logRoutes)
app.use('/api/clients', clientRoutes)
app.use('/api/events', eventRoutes)

app.use(
  '/api/health',
  (req: Request, res: Response): void => {
    res.status(200).json({
      success: true,
      message: 'ok',
    })
  },
)

app.use((error: Error, req: Request, res: Response) => {
  res.status(500).json({
    success: false,
    error: 'Server internal error',
  })
})

app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'API not found',
  })
})

export default app
