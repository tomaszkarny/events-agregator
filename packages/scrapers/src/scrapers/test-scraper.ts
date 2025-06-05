import { addDays, addHours } from 'date-fns'
import { BaseScraper, ScrapedEvent } from './base-scraper'
import { PriceType, EventCategory } from '@prisma/client'
import { logger } from '../utils/logger'

/**
 * Test scraper - generuje przykładowe wydarzenia
 * Używany do testowania systemu scraperów
 */
export class TestScraper extends BaseScraper {
  name = 'test-scraper'
  sourceUrl = 'https://test.example.com'
  
  protected async scrapeEvents(): Promise<ScrapedEvent[]> {
    logger.info('Test scraper: Generating test events')
    
    // Symuluj opóźnienie jak przy prawdziwym scrapowaniu
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    const testEvents: ScrapedEvent[] = [
      {
        title: `[TEST] Warsztaty robotyki - ${new Date().toISOString().split('T')[0]}`,
        description: 'Testowe wydarzenie wygenerowane przez scraper. Warsztaty robotyki dla dzieci z wykorzystaniem klocków LEGO.',
        ageMin: 7,
        ageMax: 12,
        priceType: PriceType.PAID,
        price: 50,
        locationName: 'Centrum Testowe',
        address: 'ul. Testowa 123',
        city: 'Warszawa',
        lat: 52.2297,
        lng: 21.0122,
        organizerName: 'Test Organizer',
        sourceUrl: `https://test.example.com/event-${Date.now()}`,
        imageUrls: ['https://picsum.photos/800/600?random=1'],
        startDate: addDays(new Date(), 3),
        endDate: addHours(addDays(new Date(), 3), 2),
        category: EventCategory.EDUKACJA,
        tags: ['test', 'robotyka', 'LEGO']
      },
      {
        title: `[TEST] Spektakl dla maluchów - ${new Date().toISOString().split('T')[0]}`,
        description: 'Testowy spektakl teatralny dla najmłodszych widzów.',
        ageMin: 3,
        ageMax: 6,
        priceType: PriceType.FREE,
        locationName: 'Teatr Testowy',
        address: 'ul. Sceniczna 456',
        city: 'Kraków',
        lat: 50.0647,
        lng: 19.9450,
        organizerName: 'Teatr Test',
        sourceUrl: `https://test.example.com/event-${Date.now()}-2`,
        imageUrls: ['https://picsum.photos/800/600?random=2'],
        startDate: addDays(new Date(), 5),
        endDate: addHours(addDays(new Date(), 5), 1.5),
        category: EventCategory.SPEKTAKLE,
        tags: ['test', 'teatr', 'bajka']
      }
    ]
    
    logger.info(`Test scraper: Generated ${testEvents.length} test events`)
    return testEvents
  }
}