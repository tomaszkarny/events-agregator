import dotenv from 'dotenv'
import path from 'path'
import { createBackgroundWorker, scheduleBackgroundJobs } from './queue/queue'
import { logger } from './utils/logger'

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') })

async function startQueueWorker() {
  try {
    logger.info('Starting background queue worker...')
    
    // Create and start the worker
    const worker = createBackgroundWorker()
    
    // Schedule periodic jobs (scrapers + status updates)
    await scheduleBackgroundJobs()
    
    logger.info('Background queue worker started successfully (scrapers + status management)')
    
    // Graceful shutdown
    process.on('SIGINT', async () => {
      logger.info('Gracefully shutting down background worker...')
      await worker.close()
      process.exit(0)
    })
    
    process.on('SIGTERM', async () => {
      logger.info('Gracefully shutting down background worker...')
      await worker.close()
      process.exit(0)
    })
    
  } catch (error) {
    logger.error('Failed to start background worker:', error)
    process.exit(1)
  }
}

startQueueWorker()