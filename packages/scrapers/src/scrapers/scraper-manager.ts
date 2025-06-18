import { BaseScraper } from './base-scraper'
import { RssScraper } from './rss-scraper'
import { BibliotekiWarszawaScraper } from './biblioteki-warszawa-scraper'
import { CzasDzieciScraper } from './czas-dzieci-scraper'
import { BialystokHtmlScraper } from './bialystok-html-scraper'
import { BokBialystokScraper } from './bok-bialystok-scraper'
import { EpiCentrumScraper } from './epi-centrum-scraper'
import { TestScraper } from './test-scraper'
import { logger } from '../utils/logger'

export class ScraperManager {
  private scrapers: Map<string, BaseScraper> = new Map()
  
  constructor() {
    this.registerScrapers()
  }
  
  private registerScrapers() {
    // Register all available scrapers
    const scrapers = [
      new RssScraper(), // Generic RSS scraper
      new BibliotekiWarszawaScraper(), // Warsaw libraries
      new CzasDzieciScraper(), // CzasDzieci.pl RSS feed
      new BialystokHtmlScraper(), // Białystok municipal events
      new BokBialystokScraper(), // BOK Białystok cultural events
      new EpiCentrumScraper(), // Epi-Centrum science center
      new TestScraper(), // Test scraper for system verification
    ]
    
    for (const scraper of scrapers) {
      this.scrapers.set(scraper.name, scraper)
      logger.info(`Registered scraper: ${scraper.name}`)
    }
  }
  
  async runScraper(name: string, options?: any) {
    const scraper = this.scrapers.get(name)
    
    if (!scraper) {
      throw new Error(`Scraper not found: ${name}`)
    }
    
    return await scraper.run()
  }
  
  async runAllScrapers() {
    const results = []
    
    for (const [name, scraper] of this.scrapers) {
      try {
        logger.info(`Running scraper: ${name}`)
        const result = await scraper.run()
        results.push({ name, ...result })
      } catch (error) {
        logger.error(`Scraper failed: ${name}`, { error })
        results.push({ 
          name, 
          eventsCount: 0, 
          newEvents: 0, 
          updatedEvents: 0, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        })
      }
    }
    
    return results
  }
  
  getScraperNames(): string[] {
    return Array.from(this.scrapers.keys())
  }
}