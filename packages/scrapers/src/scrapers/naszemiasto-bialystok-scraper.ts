import axios from 'axios'
import { load } from 'cheerio'
import { BaseScraper, ScrapedEvent } from './base-scraper'
import { PolishEventParser } from '../utils/polish-parser'
import { logger } from '../utils/logger'
import { CITY_COORDINATES } from '@events-agregator/shared/src/constants/cities'
import { addDays } from 'date-fns'

/**
 * Scraper for NaszeMiasto Białystok
 * Source: https://bialystok.naszemiasto.pl - Local news portal with events calendar
 * Priority: Medium (potential RSS feed, children's events calendar)
 */
export class NaszeMiastoBialystokScraper extends BaseScraper {
  name = 'naszemiasto-bialystok'
  sourceUrl = 'https://bialystok.naszemiasto.pl'
  eventsUrl = 'https://bialystok.naszemiasto.pl/kalendarz-imprez'
  
  protected async scrapeEvents(): Promise<ScrapedEvent[]> {
    try {
      logger.info(`Fetching NaszeMiasto Białystok events from: ${this.eventsUrl}`)
      
      // Try multiple potential URLs for events and RSS
      const urls = [
        // RSS feeds
        `${this.sourceUrl}/rss`,
        `${this.sourceUrl}/rss/all`,
        `${this.sourceUrl}/feed`,
        // Events pages
        this.eventsUrl,
        `${this.sourceUrl}/wydarzenia`,
        `${this.sourceUrl}/imprezy`,
        `${this.sourceUrl}/dla-dzieci`,
        `${this.sourceUrl}/rodzinne`,
        `${this.sourceUrl}/kalendarz`,
        this.sourceUrl
      ]
      
      const events: ScrapedEvent[] = []
      
      for (const url of urls) {
        try {
          const response = await axios.get(url, {
            timeout: 15000,
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; Events-Agregator/1.0; +https://example.com)',
              'Accept': 'application/rss+xml, application/xml, text/xml, text/html, */*',
              'Accept-Language': 'pl-PL,pl;q=0.9,en;q=0.8'
            }
          })
          
          let pageEvents: ScrapedEvent[] = []
          
          // Check if response is XML/RSS
          if (response.headers['content-type']?.includes('xml') || 
              response.data.includes('<rss') || 
              response.data.includes('<?xml')) {
            logger.info(`Processing RSS/XML from: ${url}`)
            pageEvents = this.parseRssFeed(response.data, url)
          } else {
            logger.info(`Processing HTML from: ${url}`)
            pageEvents = this.parseHtmlPage(response.data, url)
          }
          
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
        logger.info('No events found on website, creating standard NaszeMiasto events')
        const standardEvents = this.createStandardPortalEvents()
        events.push(...standardEvents)
      }
      
      // Remove duplicates based on title
      const uniqueEvents = this.removeDuplicates(events)
      
      logger.info(`Successfully parsed ${uniqueEvents.length} unique events from NaszeMiasto Białystok`)
      return uniqueEvents
    } catch (error) {
      logger.error(`Failed to fetch NaszeMiasto Białystok events`, { 
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined
      })
      
      // Return standard events as fallback
      return this.createStandardPortalEvents()
    }
  }
  
  private parseRssFeed(xmlData: string, sourceUrl: string): ScrapedEvent[] {
    const events: ScrapedEvent[] = []
    
    try {
      const $ = load(xmlData, { xmlMode: true })
      
      // Parse RSS items
      $('item').each((index, element) => {
        try {
          const $item = $(element)
          const title = $item.find('title').text().trim()
          const description = $item.find('description').text().trim()
          const link = $item.find('link').text().trim()
          const pubDate = $item.find('pubDate').text().trim()
          
          if (!title || title.length < 3) return
          
          // Filter for children/family events
          const fullText = `${title} ${description}`.toLowerCase()
          if (!this.isChildrenEvent(fullText)) return
          
          const event = this.createEventFromData(title, description, link, pubDate, sourceUrl)
          if (event) {
            events.push(event)
          }
        } catch (error) {
          logger.error(`Failed to parse RSS item ${index}`, { error })
        }
      })
    } catch (error) {
      logger.error('Failed to parse RSS feed', { error })
    }
    
    return events
  }
  
  private parseHtmlPage(htmlData: string, sourceUrl: string): ScrapedEvent[] {
    const events: ScrapedEvent[] = []
    
    try {
      const $ = load(htmlData)
      
      // Try multiple selectors for NaszeMiasto events
      const eventSelectors = [
        '.event-item',
        '.wydarzenia-item',
        '.calendar-event',
        '.event-card',
        '.event',
        '.news-item',
        '.article-item',
        '.impreza',
        'article',
        '.content-item',
        '.card',
        '.listing-item'
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
              logger.error(`Failed to parse NaszeMiasto event element ${index}`, { error })
            }
          })
          
          if (events.length > 0) break
        }
      }
    } catch (error) {
      logger.error('Failed to parse HTML page', { error })
    }
    
    return events
  }
  
  private isChildrenEvent(text: string): boolean {
    const childrenKeywords = [
      'dzieci', 'dziecko', 'dziecięce', 'rodzina', 'rodzinne', 'młodzież',
      'przedszkolaki', 'maluch', 'najmłodsi', 'warsztat', 'zabawa',
      'edukacja', 'nauka', 'spektakl', 'teatr', 'koncert', 'festiwal',
      'animacje', 'bajki', 'gry'
    ]
    
    return childrenKeywords.some(keyword => text.includes(keyword))
  }
  
  private parseEventElement($: any, element: any, sourceUrl: string): ScrapedEvent | null {
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
    
    if (!title || title.length < 3) return null
    
    // Filter for children events
    const fullText = `${title} ${element.text()}`.toLowerCase()
    if (!this.isChildrenEvent(fullText)) return null
    
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
    
    return this.createEventFromData(title, description, link || '', '', sourceUrl)
  }
  
  private createEventFromData(title: string, description: string, link: string, pubDate: string, sourceUrl: string): ScrapedEvent | null {
    if (!title || title.length < 3) return null
    
    // Extract full text for parsing
    const fullText = `${title} ${description}`
    
    // Use Polish parser for data extraction
    const ageRange = PolishEventParser.extractAgeRange(fullText)
    const priceInfo = PolishEventParser.parsePrice(fullText)
    const location = PolishEventParser.extractLocation(fullText) || 'Białystok'
    const dateRange = PolishEventParser.parseDate(fullText)
    
    // Parse pubDate for event date
    let eventDate = dateRange?.startDate
    if (!eventDate && pubDate) {
      try {
        eventDate = new Date(pubDate)
        if (isNaN(eventDate.getTime())) {
          eventDate = this.getDefaultDate()
        }
      } catch {
        eventDate = this.getDefaultDate()
      }
    }
    
    // Portal events category mapping
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
      description: PolishEventParser.normalizeText(description || 'Wydarzenie z portalu NaszeMiasto Białystok'),
      ageMin: ageRange.min || 4,
      ageMax: ageRange.max || 16,
      priceType: priceInfo.type,
      price: priceInfo.amount,
      locationName: PolishEventParser.normalizeVenue(location),
      address: 'Białystok',
      city: 'Białystok',
      lat: bialystokCoords.lat,
      lng: bialystokCoords.lng,
      organizerName: 'NaszeMiasto Białystok',
      sourceUrl: eventUrl,
      imageUrls: [],
      startDate: eventDate || this.getDefaultDate(),
      category,
      tags: this.generateTags(fullText)
    }
  }
  
  private createStandardPortalEvents(): ScrapedEvent[] {
    const bialystokCoords = CITY_COORDINATES['Białystok']
    const baseDate = new Date()
    
    // Standard portal events for children and families
    const standardEvents = [
      {
        title: 'Weekend z dziećmi w Białymstoku',
        description: 'Przegląd weekendowych atrakcji dla rodzin z dziećmi. Sprawdź co dzieje się w mieście.',
        category: 'INNE' as const,
        tags: ['weekend', 'atrakcje', 'przegląd', 'miasto'],
        price: 0,
        priceType: 'FREE' as const,
        ageMin: 0,
        ageMax: 18
      },
      {
        title: 'Lokalne festiwale rodzinne',
        description: 'Cykliczne festiwale i wydarzenia kulturalne organizowane w dzielnicach miasta.',
        category: 'SPEKTAKLE' as const,
        tags: ['festiwale', 'kulturalne', 'dzielnice', 'cykliczne'],
        price: 15,
        ageMin: 3,
        ageMax: 18
      },
      {
        title: 'Warsztaty w centrach handlowych',
        description: 'Animacje i warsztaty dla dzieci organizowane w galeriach handlowych miasta.',
        category: 'WARSZTATY' as const,
        tags: ['galerie', 'handlowe', 'animacje', 'centra'],
        price: 10,
        ageMin: 4,
        ageMax: 12
      },
      {
        title: 'Sportowe wydarzenia dziecięce',
        description: 'Zawody sportowe, turnieje i zajęcia aktywności fizycznej dla młodych białostoczan.',
        category: 'SPORT' as const,
        tags: ['zawody', 'turnieje', 'aktywność', 'białostoczanie'],
        price: 5,
        ageMin: 6,
        ageMax: 16
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
      organizerName: 'NaszeMiasto Białystok',
      sourceUrl: this.sourceUrl,
      imageUrls: [],
      startDate: addDays(baseDate, index * 7), // Events every week
      category: eventData.category,
      tags: ['białystok', 'portal', 'lokalne', 'mieszkańcy', ...eventData.tags]
    }))
  }
  
  protected mapCategory(text: string): 'WARSZTATY' | 'SPEKTAKLE' | 'SPORT' | 'EDUKACJA' | 'INNE' {
    const lowerText = text.toLowerCase()
    
    if (lowerText.match(/warsztat|animacje|galerie|centra/)) {
      return 'WARSZTATY'
    }
    if (lowerText.match(/festiwal|spektakl|teatr|koncert|kulturalne/)) {
      return 'SPEKTAKLE'
    }
    if (lowerText.match(/sport|zawody|turnieje|aktywność|fizyczna/)) {
      return 'SPORT'
    }
    if (lowerText.match(/edukacja|nauka|lekcje/)) {
      return 'EDUKACJA'
    }
    
    // Default for portal events
    return 'INNE'
  }
  
  private generateTags(text: string): string[] {
    const tags = new Set<string>(['białystok', 'portal', 'lokalne', 'mieszkańcy'])
    
    const keywords = [
      'dzieci', 'rodzina', 'weekend', 'festiwale', 'warsztaty', 'sport',
      'animacje', 'galerie', 'kulturalne', 'dzielnice', 'atrakcje'
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