import { addDays, parseISO } from 'date-fns'
import { load } from 'cheerio'
import { BaseScraper, ScrapedEvent } from './base-scraper'
import { logger } from '../utils/logger'
import axios from 'axios'

export class BibliotekiWarszawaScraper extends BaseScraper {
  name = 'biblioteki-warszawa'
  sourceUrl = 'https://www.bibliotekiwarszawy.pl/wydarzenia/lista/'
  
  protected async scrapeEvents(): Promise<ScrapedEvent[]> {
    try {
      logger.info(`Fetching current events from: ${this.sourceUrl}`)
      
      const response = await axios.get(this.sourceUrl, {
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Events-Agregator/1.0)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'pl-PL,pl;q=0.9,en;q=0.8'
        }
      })
      
      const events: ScrapedEvent[] = []
      
      // Parse JSON-LD structured data (primary source)
      const jsonLdEvents = this.parseJsonLdEvents(response.data)
      events.push(...jsonLdEvents)
      
      // Parse HTML content (backup source)
      const htmlEvents = this.parseHtmlEvents(response.data)
      events.push(...htmlEvents)
      
      // Filter to only current events (2025+) and remove duplicates
      const currentEvents = this.filterCurrentEvents(events)
      const uniqueEvents = this.removeDuplicates(currentEvents)
      
      logger.info(`Successfully parsed ${uniqueEvents.length} current events from Biblioteki Warszawy`)
      return uniqueEvents
    } catch (error) {
      logger.error(`Failed to fetch current events: ${this.sourceUrl}`, { 
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined
      })
      return []
    }
  }
  
  private parseJsonLdEvents(htmlContent: string): ScrapedEvent[] {
    const events: ScrapedEvent[] = []
    
    try {
      // Extract JSON-LD structured data from HTML
      const jsonLdMatch = htmlContent.match(/<script type="application\/ld\+json">\s*\[(.*?)\]\s*<\/script>/s)
      if (!jsonLdMatch) {
        logger.warn('No JSON-LD data found in HTML')
        return events
      }
      
      const jsonData = JSON.parse(`[${jsonLdMatch[1]}]`)
      logger.info(`Found ${jsonData.length} JSON-LD events`)
      
      for (const eventData of jsonData) {
        try {
          if (eventData['@type'] === 'Event') {
            const event = this.parseJsonLdEvent(eventData)
            if (event) {
              events.push(event)
            }
          }
        } catch (error) {
          logger.error('Failed to parse JSON-LD event', { error })
        }
      }
    } catch (error) {
      logger.error('Failed to parse JSON-LD events', { error })
    }
    
    return events
  }
  
  private parseJsonLdEvent(eventData: any): ScrapedEvent | null {
    try {
      const title = eventData.name
      const description = this.cleanHtmlContent(eventData.description || '')
      const startDate = new Date(eventData.startDate)
      const endDate = eventData.endDate ? new Date(eventData.endDate) : null
      const url = eventData.url
      const image = eventData.image
      
      if (!title || !startDate || isNaN(startDate.getTime())) {
        return null
      }
      
      // Only accept events from 2025 onwards
      if (startDate.getFullYear() < 2025) {
        return null
      }
      
      // Filter for children/family events
      const fullText = `${title} ${description}`.toLowerCase()
      if (!this.isChildrenEvent(fullText)) {
        return null
      }
      
      // Extract location information
      let locationName = 'Biblioteka Publiczna'
      let address = 'Warszawa'
      
      if (eventData.location) {
        locationName = eventData.location.name || locationName
        if (eventData.location.address) {
          const addr = eventData.location.address
          address = `${addr.streetAddress || ''} ${addr.addressLocality || 'Warszawa'}`.trim()
        }
      }
      
      // Extract age range and category
      const ageRange = this.extractAgeRange(fullText)
      const category = this.mapCategory(fullText)
      
      // Get coordinates for Warsaw
      const coordinates = { lat: 52.2297, lng: 21.0122 } // Warsaw center
      
      return {
        title: this.normalizeText(title),
        description: description || 'Wydarzenie biblioteczne w Warszawie',
        ageMin: ageRange.min || 3,
        ageMax: ageRange.max || 16,
        priceType: 'FREE', // Library events are free
        locationName: this.normalizeText(locationName),
        address,
        city: 'Warszawa',
        lat: coordinates.lat,
        lng: coordinates.lng,
        organizerName: 'Biblioteka Publiczna m.st. Warszawy',
        sourceUrl: url || this.sourceUrl,
        imageUrls: image ? [image] : [],
        startDate,
        category,
        tags: ['biblioteka', 'kultura', 'edukacja', 'warszawa', '2025']
      }
    } catch (error) {
      logger.error('Error parsing JSON-LD event', { error })
      return null
    }
  }
  
  private parseHtmlEvents(htmlContent: string): ScrapedEvent[] {
    const events: ScrapedEvent[] = []
    
    try {
      const $ = load(htmlContent)
      
      // Find event rows in the HTML
      $('.tribe-events-calendar-list__event-row').each((index, element) => {
        try {
          const event = this.parseHtmlEvent($, $(element))
          if (event) {
            events.push(event)
          }
        } catch (error) {
          logger.error(`Failed to parse HTML event ${index}`, { error })
        }
      })
    } catch (error) {
      logger.error('Failed to parse HTML events', { error })
    }
    
    return events
  }
  
  private parseHtmlEvent($: any, element: any): ScrapedEvent | null {
    try {
      // Extract title
      const titleElement = element.find('.tribe-events-calendar-list__event-title a')
      const title = titleElement.text().trim()
      const url = titleElement.attr('href')
      
      if (!title || title.length < 3) {
        return null
      }
      
      // Extract date
      const dateElement = element.find('.tribe-events-calendar-list__event-datetime')
      const dateAttr = dateElement.attr('datetime')
      const startDate = dateAttr ? new Date(dateAttr) : new Date()
      
      // Only accept events from 2025 onwards
      if (startDate.getFullYear() < 2025) {
        return null
      }
      
      // Extract description
      const descElement = element.find('.tribe-events-calendar-list__event-description')
      const description = descElement.text().trim() || 'Wydarzenie biblioteczne w Warszawie'
      
      // Filter for children/family events
      const fullText = `${title} ${description}`.toLowerCase()
      if (!this.isChildrenEvent(fullText)) {
        return null
      }
      
      // Extract age range and category
      const ageRange = this.extractAgeRange(fullText)
      const category = this.mapCategory(fullText)
      
      return {
        title: this.normalizeText(title),
        description: this.normalizeText(description),
        ageMin: ageRange.min || 3,
        ageMax: ageRange.max || 16,
        priceType: 'FREE',
        locationName: 'Biblioteka Publiczna',
        address: 'Warszawa',
        city: 'Warszawa',
        lat: 52.2297,
        lng: 21.0122,
        organizerName: 'Biblioteka Publiczna m.st. Warszawy',
        sourceUrl: url || this.sourceUrl,
        imageUrls: [],
        startDate,
        category,
        tags: ['biblioteka', 'kultura', 'edukacja', 'warszawa', '2025']
      }
    } catch (error) {
      return null
    }
  }

  private filterCurrentEvents(events: ScrapedEvent[]): ScrapedEvent[] {
    return events.filter(event => {
      // Only accept events from 2025 onwards
      const eventYear = event.startDate.getFullYear()
      return eventYear >= 2025
    })
  }

  private removeDuplicates(events: ScrapedEvent[]): ScrapedEvent[] {
    const seen = new Set<string>()
    return events.filter(event => {
      const key = `${event.title.toLowerCase().trim()}_${event.startDate.getTime()}`
      if (seen.has(key)) {
        return false
      }
      seen.add(key)
      return true
    })
  }

  private cleanHtmlContent(htmlContent: string): string {
    if (!htmlContent) return ''
    
    // Remove HTML tags
    let cleaned = htmlContent.replace(/<[^>]*>/g, ' ')
    
    // Decode HTML entities
    cleaned = cleaned.replace(/&#8222;/g, '"')
                    .replace(/&#8221;/g, '"')
                    .replace(/&quot;/g, '"')
                    .replace(/&amp;/g, '&')
                    .replace(/&lt;/g, '<')
                    .replace(/&gt;/g, '>')
                    .replace(/&#8211;/g, '-')
                    .replace(/&#8217;/g, "'")
    
    // Remove boilerplate text patterns
    cleaned = cleaned.replace(/The post .+ appeared first on .+\./g, '')
                    .replace(/BIBLIOTEKI PUBLICZNE M\.ST\. WARSZAWY/g, '')
                    .replace(/Read the full article\.\.\./g, '')
                    .replace(/\\n/g, ' ')
    
    // Clean whitespace
    cleaned = cleaned.replace(/\s+/g, ' ').trim()
    
    return cleaned
  }

  private isChildrenEvent(text: string): boolean {
    const childrenKeywords = [
      'dzieci', 'dziecko', 'dziecięce', 'rodzina', 'rodzinne', 'młodzież',
      'przedszkolaki', 'maluch', 'najmłodsi', 'warsztat', 'puzzle',
      'edukacja', 'nauka', 'spektakl', 'teatr', 'czytanie', 'bajka',
      'gry', 'zabawa', 'animacje', 'kreatywn', 'plastyczn'
    ]
    
    // Must contain at least one children-related keyword
    const hasChildrenKeyword = childrenKeywords.some(keyword => text.includes(keyword))
    
    // Exclude clearly adult-only content
    const adultKeywords = ['18+', 'dorośli tylko', 'seniorzy', 'emeryt', 'uniwersytet trzeciego wieku']
    const isAdultOnly = adultKeywords.some(keyword => text.includes(keyword))
    
    return hasChildrenKeyword && !isAdultOnly
  }

  protected mapCategory(text: string): 'WARSZTATY' | 'SPEKTAKLE' | 'SPORT' | 'EDUKACJA' | 'INNE' {
    const lowerText = text.toLowerCase()
    
    if (lowerText.match(/warsztat|puzzle|kreatywn|plastyczn|rękodzieł/)) {
      return 'WARSZTATY'
    }
    if (lowerText.match(/spektakl|teatr|koncert|przedstawienie|muzyk/)) {
      return 'SPEKTAKLE'
    }
    if (lowerText.match(/sport|gry ruchowe|aktywność fizyczna/)) {
      return 'SPORT'
    }
    if (lowerText.match(/edukacja|nauka|lekcje|czytanie|książka/)) {
      return 'EDUKACJA'
    }
    
    return 'INNE'
  }

  protected extractAgeRange(text: string): { min: number; max: number } {
    const lowerText = text.toLowerCase()
    
    // Specific age patterns
    const agePatterns = [
      { pattern: /dla dzieci (\d+)-(\d+) lat/i, extract: (m: RegExpMatchArray) => ({ min: parseInt(m[1]), max: parseInt(m[2]) }) },
      { pattern: /(\d+)-(\d+) lat/i, extract: (m: RegExpMatchArray) => ({ min: parseInt(m[1]), max: parseInt(m[2]) }) },
      { pattern: /od (\d+) lat/i, extract: (m: RegExpMatchArray) => ({ min: parseInt(m[1]) }) },
      { pattern: /(\d+)\+/i, extract: (m: RegExpMatchArray) => ({ min: parseInt(m[1]) }) }
    ]
    
    for (const { pattern, extract } of agePatterns) {
      const match = lowerText.match(pattern)
      if (match) {
        const result = extract(match)
        return {
          min: result.min ?? 3,
          max: result.max ?? 16
        }
      }
    }
    
    // Keyword-based age ranges
    if (lowerText.includes('niemowląt') || lowerText.includes('maluch')) {
      return { min: 0, max: 3 }
    }
    if (lowerText.includes('przedszkolak')) {
      return { min: 3, max: 6 }
    }
    if (lowerText.includes('puzzle') || lowerText.includes('klub')) {
      return { min: 6, max: 16 }
    }
    if (lowerText.includes('dzieci')) {
      return { min: 3, max: 12 }
    }
    if (lowerText.includes('młodzież')) {
      return { min: 13, max: 18 }
    }
    if (lowerText.includes('rodzinne')) {
      return { min: 0, max: 18 }
    }
    
    return { min: 3, max: 16 }
  }
  
  protected normalizeText(text: string): string {
    return text
      .replace(/\s+/g, ' ')
      .replace(/[""„"]/g, '"')
      .replace(/['']/g, "'")
      .replace(/[–—]/g, '-')
      .trim()
  }
}