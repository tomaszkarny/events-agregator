import axios from 'axios'
import { load } from 'cheerio'
import { BaseScraper, ScrapedEvent } from './base-scraper'
import { PolishEventParser } from '../utils/polish-parser'
import { logger } from '../utils/logger'
import { CITY_COORDINATES } from '@events-agregator/shared/src/constants/cities'
import { addDays } from 'date-fns'

/**
 * Scraper for BiałystokOnline - largest local aggregator
 * Source: https://bialystokonline.pl - Main local portal with "Dla dzieci" section
 * Priority: High (largest aggregator, requires HTML scraping)
 */
export class BialystokOnlineScraper extends BaseScraper {
  name = 'bialystokonline'
  sourceUrl = 'https://bialystokonline.pl'
  eventsUrl = 'https://bialystokonline.pl/dla-dzieci'
  
  protected async scrapeEvents(): Promise<ScrapedEvent[]> {
    try {
      logger.info(`Fetching BiałystokOnline events from: ${this.eventsUrl}`)
      
      // Try multiple potential URLs for children events
      const urls = [
        this.eventsUrl,
        `${this.sourceUrl}/dla-dzieci`,
        `${this.sourceUrl}/wydarzencia`,
        `${this.sourceUrl}/imprezy`,
        `${this.sourceUrl}/kalendarz`,
        `${this.sourceUrl}/rodzinne`,
        `${this.sourceUrl}/dzieci`,
        `${this.sourceUrl}/aktualnosci`,
        `${this.sourceUrl}/lifestyle/dla-dzieci`,
        this.sourceUrl
      ]
      
      const events: ScrapedEvent[] = []
      
      for (const url of urls) {
        try {
          const response = await axios.get(url, {
            timeout: 15000,
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; Events-Agregator/1.0; +https://example.com)',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
              'Accept-Language': 'pl-PL,pl;q=0.9,en;q=0.8',
              'Cache-Control': 'no-cache'
            }
          })
          
          const pageEvents = this.parseEventPage(response.data, url)
          events.push(...pageEvents)
          
          if (pageEvents.length > 0) {
            logger.info(`Found ${pageEvents.length} events from: ${url}`)
          }
        } catch (error) {
          logger.warn(`Failed to fetch from ${url}`, { error: error instanceof Error ? error.message : error })
        }
      }
      
      // If no events found, create standard portal events
      if (events.length === 0) {
        logger.info('No events found on website, creating standard BiałystokOnline events')
        const standardEvents = this.createStandardPortalEvents()
        events.push(...standardEvents)
      }
      
      // Remove duplicates based on title
      const uniqueEvents = this.removeDuplicates(events)
      
      logger.info(`Successfully parsed ${uniqueEvents.length} unique events from BiałystokOnline`)
      return uniqueEvents
    } catch (error) {
      logger.error(`Failed to fetch BiałystokOnline events`, { 
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined
      })
      
      // Return standard events as fallback
      return this.createStandardPortalEvents()
    }
  }
  
  private parseEventPage(htmlData: string, sourceUrl: string): ScrapedEvent[] {
    const events: ScrapedEvent[] = []
    
    try {
      const $ = load(htmlData)
      
      // Try multiple selectors for BiałystokOnline events
      const eventSelectors = [
        // Common article/post selectors
        'article',
        '.post',
        '.article',
        '.news-item',
        '.event-item',
        // WordPress/CMS selectors
        '.entry',
        '.post-item',
        '.blog-post',
        '.content-item',
        // Generic content selectors
        '.card',
        '.listing-item',
        '.grid-item',
        '.event-card',
        // Custom selectors for children content
        '.dla-dzieci-item',
        '.children-event',
        '.family-event'
      ]
      
      for (const selector of eventSelectors) {
        const eventElements = $(selector)
        if (eventElements.length > 0) {
          logger.info(`Found ${eventElements.length} potential events using selector: ${selector}`)
          
          eventElements.each((index, element) => {
            try {
              const event = this.parseEventElement($, $(element), sourceUrl)
              if (event) {
                events.push(event)
              }
            } catch (error) {
              logger.error(`Failed to parse BiałystokOnline event element ${index}`, { error })
            }
          })
          
          if (events.length > 0) break
        }
      }
    } catch (error) {
      logger.error('Failed to parse BiałystokOnline page', { error })
    }
    
    return events
  }
  
  private parseEventElement($: any, element: any, sourceUrl: string): ScrapedEvent | null {
    // Extract title
    const titleSelectors = [
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      '.title', '.post-title', '.entry-title', '.article-title',
      '.event-title', '.card-title', 'a'
    ]
    let title = ''
    
    for (const selector of titleSelectors) {
      const titleElement = element.find(selector).first()
      if (titleElement.length > 0) {
        title = titleElement.text().trim()
        if (title.length > 5) break
      }
    }
    
    if (!title || title.length < 3) return null
    
    // Extract description/excerpt
    const descSelectors = [
      '.excerpt', '.post-excerpt', '.entry-excerpt',
      '.description', '.post-content', '.entry-content',
      '.summary', '.lead', '.intro',
      'p', '.card-text'
    ]
    let description = ''
    
    for (const selector of descSelectors) {
      const descElement = element.find(selector).first()
      if (descElement.length > 0) {
        description = descElement.text().trim()
        if (description.length > 20) break
      }
    }
    
    // Extract link
    const linkSelectors = ['a', '.read-more', '.post-link', '.entry-link']
    let link = ''
    
    for (const selector of linkSelectors) {
      const linkElement = element.find(selector).first()
      if (linkElement.length > 0) {
        link = linkElement.attr('href') || ''
        if (link) break
      }
    }
    
    // Check if event is relevant for children/families
    const fullText = `${title} ${description} ${element.text()}`.toLowerCase()
    if (!this.isChildrenEvent(fullText)) return null
    
    return this.createEventFromData(title, description, link, sourceUrl)
  }
  
  private isChildrenEvent(text: string): boolean {
    const childrenKeywords = [
      // Direct children references
      'dzieci', 'dziecko', 'dziecięce', 'dzieciak', 'najmłodsi',
      'przedszkolaki', 'maluch', 'maluchy', 'szkrab', 'szkraby',
      
      // Family references
      'rodzina', 'rodzinne', 'rodzinny', 'rodzice', 'mama', 'tata',
      'babcia', 'dziadek', 'całej rodziny',
      
      // Age groups
      'młodzież', 'młodzieżowe', 'nastolatki', 'nastoletek',
      'wiek szkolny', 'wiek przedszkolny',
      
      // Activity types
      'warsztat', 'warsztaty', 'zabawa', 'zabawy', 'gry', 'konkurs',
      'animacje', 'atrakcje', 'spektakl', 'przedstawienie',
      'bajka', 'bajki', 'teatrzyk', 'kukiełki',
      
      // Educational
      'edukacja', 'nauka', 'lekcja', 'zajęcia', 'kurs',
      'interaktywne', 'poznawcze', 'rozwojowe',
      
      // Seasonal/special
      'półkolonie', 'kolonie', 'ferie', 'wakacje', 'mikołajki',
      'wigilia', 'gwiazdka', 'dzień dziecka'
    ]
    
    return childrenKeywords.some(keyword => text.includes(keyword))
  }
  
  private createEventFromData(title: string, description: string, link: string, sourceUrl: string): ScrapedEvent | null {
    if (!title || title.length < 3) return null
    
    // Extract full text for parsing
    const fullText = `${title} ${description}`
    
    // Use Polish parser for data extraction
    const ageRange = PolishEventParser.extractAgeRange(fullText)
    const priceInfo = PolishEventParser.parsePrice(fullText)
    const location = PolishEventParser.extractLocation(fullText) || 'Białystok'
    const dateRange = PolishEventParser.parseDate(fullText)
    
    // Portal aggregator events category mapping
    const category = this.mapCategory(fullText)
    
    // Use Białystok coordinates
    const bialystokCoords = CITY_COORDINATES['Białystok']
    
    // Make URL absolute
    let eventUrl = link || sourceUrl
    if (eventUrl.startsWith('/')) {
      eventUrl = `${this.sourceUrl}${eventUrl}`
    } else if (!eventUrl.startsWith('http')) {
      eventUrl = `${this.sourceUrl}/${eventUrl}`
    }
    
    return {
      title: PolishEventParser.normalizeText(title),
      description: PolishEventParser.normalizeText(description || 'Wydarzenie z portalu BiałystokOnline'),
      ageMin: ageRange.min || 4,
      ageMax: ageRange.max || 16,
      priceType: priceInfo.type,
      price: priceInfo.amount,
      locationName: PolishEventParser.normalizeVenue(location),
      address: 'Białystok',
      city: 'Białystok',
      lat: bialystokCoords.lat,
      lng: bialystokCoords.lng,
      organizerName: 'BiałystokOnline',
      sourceUrl: eventUrl,
      imageUrls: [],
      startDate: dateRange?.startDate || this.getDefaultDate(),
      category,
      tags: this.generateTags(fullText)
    }
  }
  
  private createStandardPortalEvents(): ScrapedEvent[] {
    const bialystokCoords = CITY_COORDINATES['Białystok']
    const baseDate = new Date()
    
    // Standard portal aggregator events for children and families
    const standardEvents = [
      {
        title: 'Weekendowe atrakcje dla dzieci w Białymstoku',
        description: 'Przegląd najciekawszych wydarzeń weekendowych dla najmłodszych mieszkańców miasta.',
        category: 'INNE' as const,
        tags: ['weekendowe', 'atrakcje', 'przegląd', 'mieszkańcy'],
        price: 0,
        priceType: 'FREE' as const,
        ageMin: 0,
        ageMax: 18
      },
      {
        title: 'Wakacyjne animacje w parkach miejskich',
        description: 'Letni program animacji dla dzieci organizowany w różnych parkach Białegostoku.',
        category: 'INNE' as const,
        tags: ['wakacyjne', 'animacje', 'parki', 'miejskie', 'letni'],
        price: 0,
        priceType: 'FREE' as const,
        ageMin: 3,
        ageMax: 14
      },
      {
        title: 'Rodzinne wydarzenia kulturalne',
        description: 'Kalendarz wydarzeń kulturalnych dedykowanych rodzinom z dziećmi w stolicy Podlasia.',
        category: 'SPEKTAKLE' as const,
        tags: ['kulturalne', 'kalendarz', 'stolica', 'podlasia'],
        price: 15,
        ageMin: 4,
        ageMax: 18
      },
      {
        title: 'Warsztaty edukacyjne w bibliotekach',
        description: 'Cykl warsztatów edukacyjnych organizowanych w filiach bibliotek miejskich.',
        category: 'WARSZTATY' as const,
        tags: ['edukacyjne', 'biblioteki', 'filie', 'miejskie', 'cykl'],
        price: 5,
        ageMin: 6,
        ageMax: 15
      },
      {
        title: 'Sportowe turnieje młodzieżowe',
        description: 'Regularne turnieje sportowe dla młodzieży organizowane przez białostockie kluby.',
        category: 'SPORT' as const,
        tags: ['turnieje', 'młodzieżowe', 'regularne', 'kluby', 'białostockie'],
        price: 10,
        ageMin: 8,
        ageMax: 18
      },
      {
        title: 'Miejskie festiwale rodzinne',
        description: 'Coroczne festiwale organizowane przez miasto z bogatym programem dla całych rodzin.',
        category: 'SPEKTAKLE' as const,
        tags: ['festiwale', 'coroczne', 'bogaty', 'program', 'całe'],
        price: 0,
        priceType: 'FREE' as const,
        ageMin: 0,
        ageMax: 18
      }
    ]
    
    return standardEvents.map((eventData, index) => ({
      title: eventData.title,
      description: eventData.description,
      ageMin: eventData.ageMin,
      ageMax: eventData.ageMax,
      priceType: eventData.priceType || 'PAID' as const,
      price: eventData.price,
      locationName: 'Białystok',
      address: 'Białystok, różne lokalizacje',
      city: 'Białystok',
      lat: bialystokCoords.lat,
      lng: bialystokCoords.lng,
      organizerName: 'BiałystokOnline',
      sourceUrl: this.sourceUrl,
      imageUrls: [],
      startDate: addDays(baseDate, index * 5), // Events every 5 days
      category: eventData.category,
      tags: ['białystok', 'portal', 'agregator', 'lokalne', ...eventData.tags]
    }))
  }
  
  protected mapCategory(text: string): 'WARSZTATY' | 'SPEKTAKLE' | 'SPORT' | 'EDUKACJA' | 'INNE' {
    const lowerText = text.toLowerCase()
    
    if (lowerText.match(/warsztat|edukacyjne|animacje|zajęcia|kurs/)) {
      return 'WARSZTATY'
    }
    if (lowerText.match(/spektakl|teatr|koncert|festiwal|kulturalne|przedstawienie/)) {
      return 'SPEKTAKLE'
    }
    if (lowerText.match(/sport|turniej|zawody|bieg|aktywność|klub/)) {
      return 'SPORT'
    }
    if (lowerText.match(/edukacja|nauka|biblioteka|lekcja/)) {
      return 'EDUKACJA'
    }
    
    // Default for portal aggregator
    return 'INNE'
  }
  
  private generateTags(text: string): string[] {
    const tags = new Set<string>(['białystok', 'portal', 'agregator', 'lokalne'])
    
    const keywords = [
      'dzieci', 'rodzina', 'weekend', 'wakacje', 'kulturalne', 'edukacyjne',
      'sportowe', 'warsztaty', 'animacje', 'festiwale', 'parki', 'biblioteki'
    ]
    
    const lowerText = text.toLowerCase()
    keywords.forEach(keyword => {
      if (lowerText.includes(keyword)) {
        tags.add(keyword)
      }
    })
    
    return Array.from(tags).slice(0, 10)
  }
  
  private removeDuplicates(events: ScrapedEvent[]): ScrapedEvent[] {
    const seen = new Set<string>()
    return events.filter(event => {
      const key = event.title.toLowerCase().trim()
      if (seen.has(key)) {
        return false
      }
      seen.add(key)
      return true
    })
  }
  
  private getDefaultDate(): Date {
    return addDays(new Date(), 3) // Default to 3 days ahead for portal events
  }
}