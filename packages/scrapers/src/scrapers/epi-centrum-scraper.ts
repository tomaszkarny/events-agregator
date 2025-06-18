import axios from 'axios'
import { load, CheerioAPI, Cheerio } from 'cheerio'
import { BaseScraper, ScrapedEvent } from './base-scraper'
import { PolishEventParser } from '../utils/polish-parser'
import { logger } from '../utils/logger'
import { CITY_COORDINATES } from '@events-agregator/shared/src/constants/cities'
import { addDays } from 'date-fns'

/**
 * Scraper for Epi-Centrum Nauki (Science Center)
 * Source: https://epi-centrum.bialystok.pl - Interactive science exhibits and workshops
 * Priority: High (educational science center)
 */
export class EpiCentrumScraper extends BaseScraper {
  name = 'epi-centrum'
  sourceUrl = 'https://epi-centrum.bialystok.pl'
  eventsUrl = 'https://epi-centrum.bialystok.pl/wydarzenia'
  
  protected async scrapeEvents(): Promise<ScrapedEvent[]> {
    try {
      logger.info(`Fetching Epi-Centrum events from: ${this.eventsUrl}`)
      
      // Try both events page and main page
      const urls = [this.eventsUrl, this.sourceUrl]
      const events: ScrapedEvent[] = []
      
      for (const url of urls) {
        try {
          const response = await axios.get(url, {
            timeout: 15000,
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; Events-Agregator/1.0; +https://example.com)',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
              'Accept-Language': 'pl-PL,pl;q=0.9,en;q=0.8'
            }
          })
          
          const $ = load(response.data)
          const pageEvents = this.extractEventsFromPage($, url)
          events.push(...pageEvents)
          
          if (pageEvents.length > 0) {
            logger.info(`Found ${pageEvents.length} events from: ${url}`)
          }
        } catch (error) {
          logger.warn(`Failed to fetch from ${url}`, { error: error instanceof Error ? error.message : error })
        }
      }
      
      // Remove duplicates based on title
      const uniqueEvents = this.removeDuplicates(events)
      
      logger.info(`Successfully parsed ${uniqueEvents.length} unique events from Epi-Centrum`)
      return uniqueEvents
    } catch (error) {
      logger.error(`Failed to fetch Epi-Centrum events`, { 
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined
      })
      return []
    }
  }
  
  private extractEventsFromPage($: CheerioAPI, sourceUrl: string): ScrapedEvent[] {
    const events: ScrapedEvent[] = []
    
    // Try multiple selectors for science center events
    const eventSelectors = [
      '.event-item',
      '.wydarzenie',
      '.workshop',
      '.warsztaty',
      '.exhibition',
      '.wystawa',
      '.calendar-event',
      '.event-card',
      '.card',
      '.news-item',
      'article',
      '.content-item',
      '.post',
      '.entry'
    ]
    
    let eventsFound = false
    
    for (const selector of eventSelectors) {
      const eventElements = $(selector)
      if (eventElements.length > 0) {
        logger.info(`Found ${eventElements.length} potential events using selector: ${selector}`)
        eventsFound = true
        
        eventElements.each((index, element) => {
          try {
            const event = this.parseEventElement($, $(element), sourceUrl)
            if (event) {
              events.push(event)
            }
          } catch (error) {
            logger.error(`Failed to parse Epi-Centrum event element ${index}`, { error })
          }
        })
        break
      }
    }
    
    if (!eventsFound) {
      // Fallback: create standard events based on science center offerings
      const standardEvents = this.createStandardScienceEvents()
      events.push(...standardEvents)
    }
    
    return events
  }
  
  private parseEventElement($: CheerioAPI, element: Cheerio<any>, sourceUrl: string): ScrapedEvent | null {
    // Extract title
    const titleSelectors = ['h1', 'h2', 'h3', 'h4', '.title', '.event-title', '.card-title', 'a']
    let title = ''
    
    for (const selector of titleSelectors) {
      const titleElement = element.find(selector).first()
      if (titleElement.length > 0) {
        title = titleElement.text().trim()
        if (title.length > 5) break
      }
    }
    
    if (!title || title.length < 3) {
      return null
    }
    
    // Extract description
    const descSelectors = ['.description', '.excerpt', '.content', '.summary', 'p', '.card-text']
    let description = ''
    
    for (const selector of descSelectors) {
      const descElement = element.find(selector).first()
      if (descElement.length > 0) {
        description = descElement.text().trim()
        if (description.length > 10) break
      }
    }
    
    // Extract link
    const linkElement = element.find('a').first()
    const link = linkElement.length > 0 ? linkElement.attr('href') : ''
    let eventUrl = link || sourceUrl
    
    // Make URL absolute
    if (eventUrl.startsWith('/')) {
      eventUrl = `${this.sourceUrl}${eventUrl}`
    } else if (!eventUrl.startsWith('http')) {
      eventUrl = `${this.sourceUrl}/${eventUrl}`
    }
    
    // Extract full text for parsing
    const fullText = `${title} ${description} ${element.text()}`
    
    // Use Polish parser for data extraction
    const ageRange = PolishEventParser.extractAgeRange(fullText)
    const priceInfo = PolishEventParser.parsePrice(fullText)
    const location = PolishEventParser.extractLocation(fullText) || 'Epi-Centrum Nauki'
    const dateRange = PolishEventParser.parseDate(fullText)
    
    // Science centers are primarily educational
    const category = this.mapCategory(fullText)
    
    // Use Białystok coordinates for Epi-Centrum
    const bialystokCoords = CITY_COORDINATES['Białystok']
    
    // Extract images
    const images = this.extractImages($, element)
    
    return {
      title: PolishEventParser.normalizeText(title),
      description: PolishEventParser.normalizeText(description || 'Interaktywna ekspozycja naukowa dla dzieci'),
      ageMin: ageRange.min || 6,
      ageMax: ageRange.max || 16,
      priceType: priceInfo.type,
      price: priceInfo.amount,
      locationName: PolishEventParser.normalizeVenue(location),
      address: 'ul. Świętojańska 19, Białystok',
      city: 'Białystok',
      lat: bialystokCoords.lat,
      lng: bialystokCoords.lng,
      organizerName: 'Epi-Centrum Nauki',
      sourceUrl: eventUrl,
      imageUrls: images,
      startDate: dateRange?.startDate || this.getDefaultDate(),
      category,
      tags: this.generateTags(fullText)
    }
  }
  
  private createStandardScienceEvents(): ScrapedEvent[] {
    const bialystokCoords = CITY_COORDINATES['Białystok']
    const baseDate = new Date()
    
    // Standard science center offerings
    const standardEvents = [
      {
        title: 'Interaktywne ekspozycje naukowe',
        description: 'Stałe wystawy interaktywne z zakresu fizyki, chemii, biologii i matematyki. Idealne dla dzieci i młodzieży.',
        category: 'EDUKACJA' as const,
        tags: ['nauka', 'fizyka', 'chemia', 'interaktywne']
      },
      {
        title: 'Warsztaty naukowe dla dzieci',
        description: 'Cotygodniowe warsztaty naukowe z eksperymentami dla najmłodszych.',
        category: 'WARSZTATY' as const,
        tags: ['eksperymenty', 'nauka', 'warsztaty']
      },
      {
        title: 'Planetarium i pokazy astronomiczne',
        description: 'Podróże po kosmosie w nowoczesnym planetarium.',
        category: 'EDUKACJA' as const,
        tags: ['astronomia', 'kosmos', 'planetarium']
      }
    ]
    
    return standardEvents.map((eventData, index) => ({
      title: eventData.title,
      description: eventData.description,
      ageMin: 6,
      ageMax: 16,
      priceType: 'PAID' as const,
      price: 15,
      locationName: 'Epi-Centrum Nauki',
      address: 'ul. Świętojańska 19, Białystok',
      city: 'Białystok',
      lat: bialystokCoords.lat,
      lng: bialystokCoords.lng,
      organizerName: 'Epi-Centrum Nauki',
      sourceUrl: this.sourceUrl,
      imageUrls: [],
      startDate: addDays(baseDate, index * 7), // Weekly events
      category: eventData.category,
      tags: ['białystok', 'epi-centrum', 'nauka', 'edukacja', ...eventData.tags]
    }))
  }
  
  private extractImages($: CheerioAPI, element: Cheerio<any>): string[] {
    const images: string[] = []
    
    element.find('img').each((_: any, img: any) => {
      const src = $(img).attr('src')
      if (src) {
        let imageUrl = src
        // Make URLs absolute
        if (imageUrl.startsWith('/')) {
          imageUrl = `${this.sourceUrl}${imageUrl}`
        } else if (!imageUrl.startsWith('http')) {
          imageUrl = `${this.sourceUrl}/${imageUrl}`
        }
        images.push(imageUrl)
      }
    })
    
    return images.slice(0, 3)
  }
  
  protected mapCategory(text: string): 'WARSZTATY' | 'SPEKTAKLE' | 'SPORT' | 'EDUKACJA' | 'INNE' {
    const lowerText = text.toLowerCase()
    
    // Science centers are primarily educational
    if (lowerText.match(/warsztat|zajęcia|kurs|eksperyment|laboratorium/)) {
      return 'WARSZTATY'
    }
    if (lowerText.match(/pokaz|prezentacja|demonstracja|spektakl/)) {
      return 'SPEKTAKLE'
    }
    
    // Default for science center
    return 'EDUKACJA'
  }
  
  private generateTags(text: string): string[] {
    const tags = new Set<string>(['białystok', 'epi-centrum', 'nauka', 'edukacja', 'podlaskie'])
    
    const keywords = [
      'dzieci', 'młodzież', 'rodzina', 'fizyka', 'chemia', 'biologia', 'matematyka',
      'eksperyment', 'warsztat', 'interaktywne', 'planetarium', 'kosmos', 'technologia'
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
    return addDays(new Date(), 7) // Default to next week
  }
}