import dotenv from 'dotenv'
import path from 'path'
import { ScraperManager } from './scrapers/scraper-manager'
import { logger } from './utils/logger'

// Load environment variables from the scrapers package .env file
dotenv.config({ path: path.join(__dirname, '..', '.env') })

async function main() {
  // Parse command line arguments properly
  let scraperName = process.argv[2]
  
  // Handle --name=scraper format
  if (scraperName && scraperName.startsWith('--name=')) {
    scraperName = scraperName.replace('--name=', '')
  }
  
  const manager = new ScraperManager()
  
  try {
    if (scraperName) {
      // Run specific scraper
      logger.info(`Running scraper: ${scraperName}`)
      const result = await manager.runScraper(scraperName)
      logger.info('Scraping completed', result)
    } else {
      // Run all scrapers
      logger.info('Running all scrapers')
      const results = await manager.runAllScrapers()
      
      logger.info('All scrapers completed', {
        total: results.length,
        successful: results.filter(r => !r.error).length,
        failed: results.filter(r => r.error).length
      })
      
      results.forEach(result => {
        if (result.error) {
          logger.error(`${result.name}: Failed - ${result.error}`)
        } else {
          logger.info(`${result.name}: ${result.eventsCount} events (${result.newEvents} new, ${result.updatedEvents} updated)`)
        }
      })
    }
  } catch (error) {
    logger.error('Scraper execution failed', { error })
    process.exit(1)
  }
}

main()