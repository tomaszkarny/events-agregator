import { Queue, Worker, Job } from 'bullmq'
import Redis from 'ioredis'
import { logger } from '../utils/logger'
import { ScraperManager } from '../scrapers/scraper-manager'

// Redis connection
const connection = process.env.REDIS_URL 
  ? new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: null })
  : new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      maxRetriesPerRequest: null,
    })

// Queue for scraping jobs
export const scrapingQueue = new Queue('scraping', {
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

// Worker to process scraping jobs
export const createScrapingWorker = () => {
  const scraperManager = new ScraperManager()
  
  const worker = new Worker(
    'scraping',
    async (job: Job) => {
      const { scraperName, options } = job.data
      logger.info(`Processing scraping job: ${scraperName}`, { jobId: job.id })
      
      try {
        const result = await scraperManager.runScraper(scraperName, options)
        logger.info(`Scraping completed: ${scraperName}`, { 
          jobId: job.id, 
          eventsFound: result.eventsCount 
        })
        return result
      } catch (error) {
        logger.error(`Scraping failed: ${scraperName}`, { 
          jobId: job.id, 
          error: error instanceof Error ? error.message : error 
        })
        throw error
      }
    },
    {
      connection,
      concurrency: 5, // Run max 5 scrapers concurrently
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

// Schedule scrapers
export const scheduleScraping = async () => {
  // Schedule immediate scraping for all scrapers
  const scrapers = ['biblioteki-warszawa', 'centrum-nauki-kopernik', 'example-rss']
  
  for (const scraperName of scrapers) {
    await scrapingQueue.add(
      scraperName,
      { scraperName, options: {} },
      {
        repeat: {
          pattern: '0 */2 * * *', // Run every 2 hours
        },
        jobId: `scheduled-${scraperName}`,
      }
    )
    logger.info(`Scheduled scraper: ${scraperName}`)
  }
}