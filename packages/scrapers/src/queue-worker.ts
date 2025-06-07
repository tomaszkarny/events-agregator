import dotenv from 'dotenv'
import path from 'path'
import { createScrapingWorker, scheduleScraping } from './queue/queue'
import { logger } from './utils/logger'

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') })

async function startQueueWorker() {
  try {
    logger.info('Starting scraping queue worker...')
    
    // Create and start the worker
    const worker = createScrapingWorker()
    
    // Schedule periodic scraping
    await scheduleScraping()
    
    logger.info('Queue worker started successfully')
    
    // Graceful shutdown
    process.on('SIGINT', async () => {
      logger.info('Gracefully shutting down queue worker...')
      await worker.close()
      process.exit(0)
    })
    
    process.on('SIGTERM', async () => {
      logger.info('Gracefully shutting down queue worker...')
      await worker.close()
      process.exit(0)
    })
    
  } catch (error) {
    logger.error('Failed to start queue worker:', error)
    process.exit(1)
  }
}

startQueueWorker()