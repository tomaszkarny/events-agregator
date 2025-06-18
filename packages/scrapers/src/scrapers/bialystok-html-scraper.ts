import axios from 'axios'
import { load, CheerioAPI, Cheerio } from 'cheerio'
import { BaseScraper, ScrapedEvent } from './base-scraper'
import { PolishEventParser } from '../utils/polish-parser'
import { logger } from '../utils/logger'
import { CITY_COORDINATES } from '@events-agregator/shared/src/constants/cities'
import { addDays } from 'date-fns'

/**
 * Scraper for Białystok Municipal Website Events
 * Source: https://bialystok.pl - Official city events
 * Priority: High (official source)
 */
export class BialystokHtmlScraper extends BaseScraper {
  name = 'bialystok-html'
  sourceUrl = 'https://bialystok.pl/pl/dla-mieszkanca/kalendarz-imprez'
  
  protected async scrapeEvents(): Promise<ScrapedEvent[]> {
    try {
      logger.info(`Fetching Białystok events from: ${this.sourceUrl}`)
      
      const response = await axios.get(this.sourceUrl, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Events-Agregator/1.0; +https://example.com)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'pl-PL,pl;q=0.9,en;q=0.8'
        }
      })
      
      const $ = load(response.data)
      const events: ScrapedEvent[] = []
      
      // Try multiple selectors for event listings
      const eventSelectors = [
        '.event-item',
        '.calendar-event',
        '.event-card',
        '.news-item',
        '.article-item',
        'article',
        '.content-item'
      ]
      
      let eventsFound = false
      
      for (const selector of eventSelectors) {
        const eventElements = $(selector)
        if (eventElements.length > 0) {
          logger.info(`Found ${eventElements.length} events using selector: ${selector}`)
          eventsFound = true
          
          eventElements.each((index, element) => {
            try {
              const event = this.parseEventElement($, $(element))
              if (event) {
                events.push(event)
              }
            } catch (error) {
              logger.error(`Failed to parse event element ${index}`, { error })
            }
          })
          break // Stop after finding events with first successful selector
        }
      }
      
      if (!eventsFound) {
        // Fallback: look for any content that might be events
        logger.info('No specific event elements found, trying fallback approach')
        const fallbackEvents = this.fallbackEventExtraction($)
        events.push(...fallbackEvents)
      }
      
      logger.info(`Successfully parsed ${events.length} events from Białystok HTML`)
      return events
    } catch (error) {
      logger.error(`Failed to fetch Białystok HTML: ${this.sourceUrl}`, { 
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined
      })
      return []
    }
  }
  
  private parseEventElement($: CheerioAPI, element: Cheerio<any>): ScrapedEvent | null {
    // Extract title
    const titleSelectors = ['h1', 'h2', 'h3', '.title', '.event-title', 'a']
    let title = ''
    
    for (const selector of titleSelectors) {
      const titleElement = element.find(selector).first()
      if (titleElement.length > 0) {
        title = titleElement.text().trim()
        if (title.length > 5) break // Use first meaningful title
      }
    }
    
    if (!title || title.length < 3) {
      return null
    }
    
    // Extract description
    const descSelectors = ['.description', '.excerpt', '.content', 'p']
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
    let sourceUrl = link || this.sourceUrl
    
    // Make URL absolute
    if (sourceUrl.startsWith('/')) {
      sourceUrl = `https://bialystok.pl${sourceUrl}`
    } else if (!sourceUrl.startsWith('http')) {
      sourceUrl = `https://bialystok.pl/${sourceUrl}`
    }
    
    // Extract full text for parsing
    const fullText = `${title} ${description} ${element.text()}`
    
    // Use Polish parser for data extraction
    const ageRange = PolishEventParser.extractAgeRange(fullText)
    const priceInfo = PolishEventParser.parsePrice(fullText)
    const location = PolishEventParser.extractLocation(fullText)
    const dateRange = PolishEventParser.parseDate(fullText)
    
    // Map category
    const category = this.mapCategory(fullText)
    
    // Use Białystok coordinates
    const bialystokCoords = CITY_COORDINATES['Białystok']
    
    // Extract images
    const images = this.extractImages($, element)
    
    return {
      title: PolishEventParser.normalizeText(title),
      description: PolishEventParser.normalizeText(description || 'Wydarzenia w Białymstoku'),
      ageMin: ageRange.min || 0,
      ageMax: ageRange.max || 18,
      priceType: priceInfo.type,
      price: priceInfo.amount,
      locationName: location || 'Białystok',
      address: 'Zobacz szczegóły na stronie wydarzenia',
      city: 'Białystok',
      lat: bialystokCoords.lat,
      lng: bialystokCoords.lng,
      organizerName: this.extractOrganizer(fullText) || 'Urząd Miasta Białystok',
      sourceUrl,
      imageUrls: images,
      startDate: dateRange?.startDate || this.getDefaultDate(),
      category,
      tags: this.generateTags(fullText)
    }
  }
  
  private fallbackEventExtraction($: CheerioAPI): ScrapedEvent[] {
    const events: ScrapedEvent[] = []
    
    // Look for any text that mentions events or dates
    const possibleEvents = $('*').filter((_, element) => {
      const text = $(element).text().toLowerCase()
      return text.includes('wydarz') || 
             text.includes('imprez') || 
             text.includes('spektakl') || 
             text.includes('warsztat') ||
             !!text.match(/\d{1,2}\s+(stycznia|lutego|marca|kwietnia|maja|czerwca|lipca|sierpnia|września|października|listopada|grudnia)/)
    })
    
    possibleEvents.each((_: any, element: any) => {
      const text = $(element).text()
      if (text.length > 50 && text.length < 500) { // Reasonable event description length
        const event = this.createEventFromText(text)
        if (event) {
          events.push(event)
        }
      }
    })
    
    return events.slice(0, 5) // Limit fallback events
  }
  
  private createEventFromText(text: string): ScrapedEvent | null {
    const lines = text.split('\n').filter(line => line.trim().length > 0)
    if (lines.length === 0) return null
    
    const title = lines[0].trim()
    const description = lines.slice(1).join(' ').trim()
    
    if (title.length < 5) return null
    
    const ageRange = PolishEventParser.extractAgeRange(text)
    const priceInfo = PolishEventParser.parsePrice(text)
    const location = PolishEventParser.extractLocation(text)
    const dateRange = PolishEventParser.parseDate(text)
    
    const bialystokCoords = CITY_COORDINATES['Białystok']
    
    return {
      title: PolishEventParser.normalizeText(title),
      description: PolishEventParser.normalizeText(description || 'Wydarzenia w Białymstoku'),
      ageMin: ageRange.min || 0,
      ageMax: ageRange.max || 18,
      priceType: priceInfo.type,
      price: priceInfo.amount,
      locationName: location || 'Białystok',
      address: 'Zobacz szczegóły na stronie wydarzenia',
      city: 'Białystok',
      lat: bialystokCoords.lat,
      lng: bialystokCoords.lng,
      organizerName: 'Urząd Miasta Białystok',
      sourceUrl: this.sourceUrl,
      imageUrls: [],
      startDate: dateRange?.startDate || this.getDefaultDate(),
      category: this.mapCategory(text),
      tags: this.generateTags(text)
    }
  }
  
  private extractImages($: CheerioAPI, element: Cheerio<any>): string[] {
    const images: string[] = []
    
    element.find('img').each((_: any, img: any) => {
      const src = $(img).attr('src')
      if (src) {
        let imageUrl = src
        // Make URLs absolute
        if (imageUrl.startsWith('/')) {
          imageUrl = `https://bialystok.pl${imageUrl}`
        } else if (!imageUrl.startsWith('http')) {
          imageUrl = `https://bialystok.pl/${imageUrl}`
        }
        images.push(imageUrl)
      }
    })
    
    return images.slice(0, 3)
  }
  
  protected mapCategory(text: string): 'WARSZTATY' | 'SPEKTAKLE' | 'SPORT' | 'EDUKACJA' | 'INNE' {
    const lowerText = text.toLowerCase()
    
    if (lowerText.match(/teatr|spektakl|koncert|muzyka|taniec|opera|filharmonia/)) {
      return 'SPEKTAKLE'
    }
    if (lowerText.match(/warsztat|zajęcia|kurs|nauka|lekcja|szkolenie/)) {
      return 'WARSZTATY'
    }
    if (lowerText.match(/sport|basen|bieg|turniej|mecz|fitness|joga/)) {
      return 'SPORT'
    }
    if (lowerText.match(/edukacja|nauka|wykład|konferencja|prezentacja|muzeum|biblioteka/)) {
      return 'EDUKACJA'
    }
    
    return 'INNE'
  }
  
  private extractOrganizer(text: string): string | null {
    const organizerPatterns = [
      /organizator:\s*(.+?)(?:\.|,|$)/i,
      /organizuje:\s*(.+?)(?:\.|,|$)/i,
      /prowadzi:\s*(.+?)(?:\.|,|$)/i,
      /(bok|clz|mdk|btl|oifp|książnica|epi-centrum)/i
    ]
    
    for (const pattern of organizerPatterns) {
      const match = text.match(pattern)
      if (match && match[1]) {
        return PolishEventParser.normalizeVenue(match[1].trim())
      }
    }
    
    return null
  }
  
  private generateTags(text: string): string[] {
    const tags = new Set<string>(['białystok', 'podlaskie'])
    
    const keywords = [
      'dzieci', 'rodzina', 'kultura', 'sport', 'edukacja', 'warsztat',
      'spektakl', 'koncert', 'wystawa', 'festival', 'konkurs'
    ]
    
    const lowerText = text.toLowerCase()
    keywords.forEach(keyword => {
      if (lowerText.includes(keyword)) {
        tags.add(keyword)
      }
    })
    
    return Array.from(tags).slice(0, 10)
  }
  
  private getDefaultDate(): Date {
    return addDays(new Date(), 7) // Default to next week
  }
}