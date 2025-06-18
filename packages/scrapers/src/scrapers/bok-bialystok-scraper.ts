import axios from 'axios'
import { load, CheerioAPI, Cheerio } from 'cheerio'
import { BaseScraper, ScrapedEvent } from './base-scraper'
import { PolishEventParser } from '../utils/polish-parser'
import { logger } from '../utils/logger'
import { CITY_COORDINATES } from '@events-agregator/shared/src/constants/cities'
import { addDays } from 'date-fns'

/**
 * Scraper for Białostocki Ośrodek Kultury (BOK)
 * Source: https://bok.bialystok.pl - Cultural events in Białystok
 * Priority: High (official cultural institution)
 */
export class BokBialystokScraper extends BaseScraper {
  name = 'bok-bialystok'
  sourceUrl = 'https://bok.bialystok.pl'
  eventsUrl = 'https://bok.bialystok.pl/wydarzenia'
  
  protected async scrapeEvents(): Promise<ScrapedEvent[]> {
    try {
      logger.info(`Fetching BOK Białystok events from: ${this.eventsUrl}`)
      
      const response = await axios.get(this.eventsUrl, {
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Events-Agregator/1.0; +https://example.com)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'pl-PL,pl;q=0.9,en;q=0.8'
        }
      })
      
      const $ = load(response.data)
      const events: ScrapedEvent[] = []
      
      // Try multiple selectors for BOK events
      const eventSelectors = [
        '.event-item',
        '.wydarzenie',
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
          logger.info(`Found ${eventElements.length} events using selector: ${selector}`)
          eventsFound = true
          
          eventElements.each((index, element) => {
            try {
              const event = this.parseEventElement($, $(element))
              if (event) {
                events.push(event)
              }
            } catch (error) {
              logger.error(`Failed to parse BOK event element ${index}`, { error })
            }
          })
          break // Stop after finding events with first successful selector
        }
      }
      
      if (!eventsFound) {
        // Fallback: look for links that might be events
        logger.info('No specific event elements found, trying link-based approach')
        const eventLinks = this.extractEventLinks($)
        
        // Limit to avoid overwhelming the server
        const limitedLinks = eventLinks.slice(0, 10)
        
        for (const link of limitedLinks) {
          try {
            const event = await this.scrapeEventFromLink(link)
            if (event) {
              events.push(event)
            }
          } catch (error) {
            logger.error(`Failed to scrape event from link: ${link}`, { error })
          }
        }
      }
      
      logger.info(`Successfully parsed ${events.length} events from BOK Białystok`)
      return events
    } catch (error) {
      logger.error(`Failed to fetch BOK Białystok events: ${this.eventsUrl}`, { 
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined
      })
      return []
    }
  }
  
  private parseEventElement($: CheerioAPI, element: Cheerio<any>): ScrapedEvent | null {
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
    let sourceUrl = link || this.sourceUrl
    
    // Make URL absolute
    if (sourceUrl.startsWith('/')) {
      sourceUrl = `${this.sourceUrl}${sourceUrl}`
    } else if (!sourceUrl.startsWith('http')) {
      sourceUrl = `${this.sourceUrl}/${sourceUrl}`
    }
    
    // Extract date from various possible formats
    const dateText = this.extractDateText(element)
    
    // Extract full text for parsing
    const fullText = `${title} ${description} ${element.text()} ${dateText}`
    
    // Use Polish parser for data extraction
    const ageRange = PolishEventParser.extractAgeRange(fullText)
    const priceInfo = PolishEventParser.parsePrice(fullText)
    const location = PolishEventParser.extractLocation(fullText) || 'BOK Białystok'
    const dateRange = PolishEventParser.parseDate(dateText) || PolishEventParser.parseDate(fullText)
    
    // Map category - BOK focuses on cultural events
    const category = this.mapCategory(fullText)
    
    // Use Białystok coordinates
    const bialystokCoords = CITY_COORDINATES['Białystok']
    
    // Extract images
    const images = this.extractImages($, element)
    
    return {
      title: PolishEventParser.normalizeText(title),
      description: PolishEventParser.normalizeText(description || 'Wydarzenie kulturalne w BOK Białystok'),
      ageMin: ageRange.min || 0,
      ageMax: ageRange.max || 18,
      priceType: priceInfo.type,
      price: priceInfo.amount,
      locationName: PolishEventParser.normalizeVenue(location),
      address: 'ul. Legionowa 16, Białystok',
      city: 'Białystok',
      lat: bialystokCoords.lat,
      lng: bialystokCoords.lng,
      organizerName: 'Białostocki Ośrodek Kultury',
      sourceUrl,
      imageUrls: images,
      startDate: dateRange?.startDate || this.getDefaultDate(),
      category,
      tags: this.generateTags(fullText)
    }
  }
  
  private extractDateText(element: Cheerio<any>): string {
    // Look for date patterns in common locations
    const dateSelectors = [
      '.date', '.event-date', '.datetime', '.time',
      '.calendar', '.when', '.termin', '.data'
    ]
    
    for (const selector of dateSelectors) {
      const dateElement = element.find(selector).first()
      if (dateElement.length > 0) {
        const dateText = dateElement.text().trim()
        if (dateText.length > 0) {
          return dateText
        }
      }
    }
    
    return ''
  }
  
  private extractEventLinks($: CheerioAPI): string[] {
    const links: string[] = []
    
    // Look for links that might be events
    $('a[href*="wydarzen"], a[href*="event"], a[href*="spektakl"], a[href*="koncert"]').each((_, link) => {
      const href = $(link).attr('href')
      if (href) {
        let fullUrl = href
        if (href.startsWith('/')) {
          fullUrl = `${this.sourceUrl}${href}`
        } else if (!href.startsWith('http')) {
          fullUrl = `${this.sourceUrl}/${href}`
        }
        
        // Avoid duplicates
        if (!links.includes(fullUrl)) {
          links.push(fullUrl)
        }
      }
    })
    
    return links
  }
  
  private async scrapeEventFromLink(url: string): Promise<ScrapedEvent | null> {
    try {
      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Events-Agregator/1.0)',
          'Accept': 'text/html,application/xhtml+xml'
        }
      })
      
      const $ = load(response.data)
      
      // Extract title
      const title = $('h1').first().text().trim() || 
                   $('title').text().trim() ||
                   $('h2').first().text().trim()
      
      if (!title || title.length < 3) {
        return null
      }
      
      // Extract content
      const content = $('.content, .entry-content, .post-content, main, article').first().text().trim()
      
      // Use Polish parser
      const ageRange = PolishEventParser.extractAgeRange(content)
      const priceInfo = PolishEventParser.parsePrice(content)
      const location = PolishEventParser.extractLocation(content) || 'BOK Białystok'
      const dateRange = PolishEventParser.parseDate(content)
      
      const bialystokCoords = CITY_COORDINATES['Białystok']
      
      return {
        title: PolishEventParser.normalizeText(title),
        description: PolishEventParser.normalizeText(content.substring(0, 300)),
        ageMin: ageRange.min || 0,
        ageMax: ageRange.max || 18,
        priceType: priceInfo.type,
        price: priceInfo.amount,
        locationName: PolishEventParser.normalizeVenue(location),
        address: 'ul. Legionowa 16, Białystok',
        city: 'Białystok',
        lat: bialystokCoords.lat,
        lng: bialystokCoords.lng,
        organizerName: 'Białostocki Ośrodek Kultury',
        sourceUrl: url,
        imageUrls: this.extractImagesFromPage($),
        startDate: dateRange?.startDate || this.getDefaultDate(),
        category: this.mapCategory(content),
        tags: this.generateTags(content)
      }
    } catch (error) {
      logger.error(`Failed to scrape event from URL: ${url}`, { error })
      return null
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
          imageUrl = `${this.sourceUrl}${imageUrl}`
        } else if (!imageUrl.startsWith('http')) {
          imageUrl = `${this.sourceUrl}/${imageUrl}`
        }
        images.push(imageUrl)
      }
    })
    
    return images.slice(0, 3)
  }
  
  private extractImagesFromPage($: CheerioAPI): string[] {
    const images: string[] = []
    
    $('img').each((_: any, img: any) => {
      const src = $(img).attr('src')
      if (src && !src.includes('logo') && !src.includes('icon')) {
        let imageUrl = src
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
    
    // BOK specializes in cultural events
    if (lowerText.match(/teatr|spektakl|koncert|muzyka|taniec|opera|filharmonia|performance/)) {
      return 'SPEKTAKLE'
    }
    if (lowerText.match(/warsztat|zajęcia|kurs|nauka|lekcja|szkolenie|masterclass/)) {
      return 'WARSZTATY'
    }
    if (lowerText.match(/edukacja|nauka|wykład|konferencja|prezentacja|spotkanie/)) {
      return 'EDUKACJA'
    }
    if (lowerText.match(/sport|taniec|fitness|joga/)) {
      return 'SPORT'
    }
    
    // Default for cultural institution
    return 'SPEKTAKLE'
  }
  
  private generateTags(text: string): string[] {
    const tags = new Set<string>(['białystok', 'bok', 'kultura', 'podlaskie'])
    
    const keywords = [
      'dzieci', 'rodzina', 'teatr', 'koncert', 'warsztat', 'spektakl',
      'muzyka', 'taniec', 'wystawa', 'festival', 'konkurs', 'edukacja'
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
    return addDays(new Date(), 14) // Default to 2 weeks from now
  }
}