import { Queue, Worker, Job } from 'bullmq'
import Redis from 'ioredis'
import { logger } from '../utils/logger'
import { ScraperManager } from '../scrapers/scraper-manager'
import { statusManager } from '../jobs/status-manager'

// Redis connection
const connection = process.env.REDIS_URL 
  ? new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: null })
  : new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      maxRetriesPerRequest: null,
    })

// Queue for all background jobs (scraping, status management, etc.)
export const backgroundQueue = new Queue('background-jobs', {
  connection,
  defaultJobOptions: {
    removeOnComplete: {
      age: 24 * 3600, // keep completed jobs for 24 hours
      count: 1000,    // keep max 1000 jobs
    },
    removeOnFail: {
      age: 7 * 24 * 3600, // keep failed jobs for 7 days
    },
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },
})

// Worker to process all background jobs
export const createBackgroundWorker = () => {
  const scraperManager = new ScraperManager()
  
  const worker = new Worker(
    'background-jobs',
    async (job: Job) => {
      const { type } = job.data
      logger.info(`Processing background job: ${type}`, { jobId: job.id })
      
      try {
        switch (type) {
          case 'scraper':
            const { scraperName, options } = job.data
            const result = await scraperManager.runScraper(scraperName, options)
            logger.info(`Scraping completed: ${scraperName}`, { 
              jobId: job.id, 
              eventsFound: result.eventsCount 
            })
            return result
            
          case 'status-update':
            const statusResult = await statusManager.updateExpiredEvents()
            logger.info(`Status update completed`, { 
              jobId: job.id, 
              updatedCount: statusResult.updatedCount 
            })
            return statusResult
            
          default:
            throw new Error(`Unknown job type: ${type}`)
        }
      } catch (error) {
        logger.error(`Background job failed: ${type}`, { 
          jobId: job.id, 
          error: error instanceof Error ? error.message : error 
        })
        throw error
      }
    },
    {
      connection,
      concurrency: 5, // Run max 5 jobs concurrently
    }
  )

  worker.on('completed', (job) => {
    logger.info(`Job completed: ${job.id}`)
  })

  worker.on('failed', (job, err) => {
    logger.error(`Job failed: ${job?.id}`, { error: err.message })
  })

  return worker
}

// Schedule all background jobs
export const scheduleBackgroundJobs = async () => {
  // Schedule status updates (every hour)
  await backgroundQueue.add(
    'status-update',
    { type: 'status-update' },
    {
      repeat: {
        pattern: '0 * * * *', // Run every hour
      },
      jobId: 'scheduled-status-update',
    }
  )
  logger.info('Scheduled status updates (hourly)')
  
  // Schedule scrapers (every 2 hours)
  const scrapers = ['biblioteki-warszawa', 'czas-dzieci'] // Working scrapers with fixed URLs
  
  for (const scraperName of scrapers) {
    await backgroundQueue.add(
      `scraper-${scraperName}`,
      { 
        type: 'scraper',
        scraperName, 
        options: {} 
      },
      {
        repeat: {
          pattern: '0 */2 * * *', // Run every 2 hours
        },
        jobId: `scheduled-scraper-${scraperName}`,
      }
    )
    logger.info(`Scheduled scraper: ${scraperName}`)
  }
}