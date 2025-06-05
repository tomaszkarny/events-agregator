import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { prisma } from '@events-agregator/database'
import { logger } from './utils/logger'
import { errorHandler } from './middleware/errorHandler'
import { standardRateLimiter } from './middleware/rateLimiters'
import eventsRouter from './routes/events'
import authRouter from './routes/auth'
import alertsRouter from './routes/alerts'

dotenv.config()

const app = express()
const PORT = process.env.API_PORT || 4000

// Middleware
app.use(helmet())
app.use(cors({
  origin: function(origin, callback) {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3002',
      process.env.NEXT_PUBLIC_APP_URL
    ].filter(Boolean)
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true
}))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))
app.use(standardRateLimiter)

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  })
})

// Routes
app.use('/api/events', eventsRouter)
app.use('/api/auth', authRouter)
app.use('/api/alerts', alertsRouter)

// Error handling
app.use(errorHandler)

// Start server
app.listen(PORT, () => {
  logger.info(`API Server running on port ${PORT}`)
})

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully')
  await prisma.$disconnect()
  process.exit(0)
})