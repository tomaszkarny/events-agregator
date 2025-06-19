import { BaseScraper } from './base-scraper'
import { RssScraper } from './rss-scraper'
import { BibliotekiWarszawaScraper } from './biblioteki-warszawa-scraper'
import { CzasDzieciScraper } from './czas-dzieci-scraper'
import { BialystokHtmlScraper } from './bialystok-html-scraper'
import { BokBialystokScraper } from './bok-bialystok-scraper'
import { EpiCentrumScraper } from './epi-centrum-scraper'
import { BibliotekaBialystokScraper } from './biblioteka-bialystok-scraper'
import { OperaBialystokScraper } from './opera-bialystok-scraper'
import { MuzeumPodlaskieScraper } from './muzeum-podlaskie-scraper'
import { TeatrDramatycznyBialystokScraper } from './teatr-dramatyczny-bialystok-scraper'
import { BialystokMiastoRssScraper } from './bialystok-miasto-rss-scraper'
import { NaszeMiastoBialystokScraper } from './naszemiasto-bialystok-scraper'
import { EventaBialystokScraper } from './evenea-bialystok-scraper'
import { BialystokOnlineScraper } from './bialystokonline-scraper'
import { CentrumNaukiKopernikScraper } from './centrum-nauki-kopernik-scraper'
import { ZooWarszawaScraper } from './zoo-warszawa-scraper'
import { MuzeumNarodoweWarszawaScraper } from './muzeum-narodowe-warszawa-scraper'
import { PolinMuseumScraper } from './polin-museum-scraper'
import { TestScraper } from './test-scraper'
import { logger } from '../utils/logger'

export class ScraperManager {
  private scrapers: Map<string, BaseScraper> = new Map()
  
  constructor() {
    this.registerScrapers()
  }
  
  private registerScrapers() {
    // Register all available scrapers - COMPREHENSIVE BIAŁYSTOK COVERAGE
    const scrapers = [
      new RssScraper(), // Generic RSS scraper
      new CzasDzieciScraper(), // CzasDzieci.pl RSS feed
      
      // BIAŁYSTOK INSTITUTIONAL SCRAPERS (cultural venues - 25+ events)
      new BialystokHtmlScraper(), // Białystok municipal events
      new BokBialystokScraper(), // BOK Białystok cultural events
      new EpiCentrumScraper(), // Epi-Centrum science center
      new BibliotekaBialystokScraper(), // Public Library - 7 events
      new OperaBialystokScraper(), // Opera & Philharmonic - 50+ events!  
      new MuzeumPodlaskieScraper(), // Regional Museum - 6 events
      new TeatrDramatycznyBialystokScraper(), // Drama Theater - 6 events

      // BIAŁYSTOK RSS/API SOURCES (municipal + portals - 20+ events)
      new BialystokMiastoRssScraper(), // Municipal RSS/events - 5 events
      new NaszeMiastoBialystokScraper(), // NaszeMiasto portal RSS - 4 events
      new EventaBialystokScraper(), // Evenea workshops/camps - 5 events
      new BialystokOnlineScraper(), // Largest local aggregator - 6 events

      // WARSAW SCRAPERS (secondary priority)
      new BibliotekiWarszawaScraper(), // Warsaw libraries
      new CentrumNaukiKopernikScraper(), // Kopernik Science Centre - 5 events
      new ZooWarszawaScraper(), // Warsaw Zoo - 5 events  
      new MuzeumNarodoweWarszawaScraper(), // National Museum - 6 events
      new PolinMuseumScraper(), // POLIN Jewish Museum - 6 events
      
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