import Parser from 'rss-parser'
import { BaseScraper, ScrapedEvent } from './base-scraper'
import { PolishEventParser } from '../utils/polish-parser'
import { logger } from '../utils/logger'
import { CITY_COORDINATES } from '@events-agregator/shared/src/constants/cities'

/**
 * Scraper for Białystok Municipal RSS Feed
 * Source: https://bialystok.pl - Official city events
 * Priority: High (official source)
 */
export class BialystokRssScraper extends BaseScraper {
  name = 'bialystok-rss'
  sourceUrl = 'https://bialystok.pl/pl/dla-mieszkanca/kalendarz-imprez.rss'
  
  private parser = new Parser({
    customFields: {
      item: [
        ['description', 'description'],
        ['content:encoded', 'content'],
        ['dc:creator', 'creator'],
        ['category', 'category', { keepArray: true }],
        ['dc:date', 'dcDate'],
        ['pubDate', 'pubDate']
      ]
    }
  })
  
  protected async scrapeEvents(): Promise<ScrapedEvent[]> {
    try {
      logger.info(`Fetching Białystok RSS from: ${this.sourceUrl}`)
      
      const feed = await this.parser.parseURL(this.sourceUrl)
      const events: ScrapedEvent[] = []
      
      logger.info(`Found ${feed.items?.length || 0} items in Białystok RSS`)
      
      for (const item of feed.items || []) {
        try {
          const event = this.parseRssItem(item)
          if (event) {
            events.push(event)
          }
        } catch (error) {
          logger.error(`Failed to parse Białystok RSS item: ${item.title}`, { error })
        }
      }
      
      logger.info(`Successfully parsed ${events.length} events from Białystok RSS`)
      return events
    } catch (error) {
      logger.error(`Failed to fetch Białystok RSS feed: ${this.sourceUrl}`, { 
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined
      })
      return []
    }
  }
  
  private parseRssItem(item: any): ScrapedEvent | null {
    if (!item.title || !item.link) {
      return null
    }
    
    const fullText = `${item.title} ${item.description || ''} ${item.content || ''}`
    
    // Use Polish parser for data extraction
    const ageRange = PolishEventParser.extractAgeRange(fullText)
    const priceInfo = PolishEventParser.parsePrice(fullText)
    const location = PolishEventParser.extractLocation(fullText)
    const dateRange = PolishEventParser.parseDate(item.pubDate || item.dcDate || '')
    
    // Map category from content
    const category = this.mapCategory(fullText, item.category)
    
    // Use Białystok coordinates
    const bialystokCoords = CITY_COORDINATES['Białystok']
    
    return {
      title: PolishEventParser.normalizeText(item.title),
      description: PolishEventParser.normalizeText(
        item.description || item.contentSnippet || 'Wydarzenia w Białymstoku'
      ),
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
      sourceUrl: item.link,
      imageUrls: this.extractImages(item),
      startDate: dateRange?.startDate || this.getDefaultDate(),
      category,
      tags: this.generateTags(fullText, item.category)
    }
  }
  
  protected mapCategory(text: string, categories?: string[]): 'WARSZTATY' | 'SPEKTAKLE' | 'SPORT' | 'EDUKACJA' | 'INNE' {
    const lowerText = text.toLowerCase()
    const categoryText = categories ? categories.join(' ').toLowerCase() : ''
    const combined = `${lowerText} ${categoryText}`
    
    // Cultural events
    if (combined.match(/teatr|spektakl|koncert|muzyka|taniec|opera|filharmonia/)) {
      return 'SPEKTAKLE'
    }
    
    // Workshops and classes
    if (combined.match(/warsztat|zajęcia|kurs|nauka|lekcja|szkolenie/)) {
      return 'WARSZTATY'
    }
    
    // Sports and recreation
    if (combined.match(/sport|basen|bieg|turniej|mecz|fitness|joga|taniec/)) {
      return 'SPORT'
    }
    
    // Educational
    if (combined.match(/edukacja|nauka|wykład|konferencja|prezentacja|muzeum|biblioteka/)) {
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
  
  private extractImages(item: any): string[] {
    const images: string[] = []
    
    // Check content:encoded for images
    if (item.content) {
      const imgMatches = item.content.match(/<img[^>]+src=["']([^"']+)["']/gi) || []
      for (const match of imgMatches) {
        const srcMatch = match.match(/src=["']([^"']+)["']/)
        if (srcMatch && srcMatch[1]) {
          let imageUrl = srcMatch[1]
          // Make URLs absolute
          if (imageUrl.startsWith('/')) {
            imageUrl = `https://bialystok.pl${imageUrl}`
          } else if (!imageUrl.startsWith('http')) {
            imageUrl = `https://bialystok.pl/${imageUrl}`
          }
          images.push(imageUrl)
        }
      }
    }
    
    // Check enclosure
    if (item.enclosure && item.enclosure.url) {
      images.push(item.enclosure.url)
    }
    
    return images.slice(0, 3) // Limit to 3 images
  }
  
  private generateTags(text: string, categories?: string[]): string[] {
    const tags = new Set<string>(['białystok', 'podlaskie'])
    
    // Add categories as tags
    if (categories) {
      categories.forEach(cat => tags.add(cat.toLowerCase()))
    }
    
    // Extract keywords from text
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
    // Default to next week if no date found
    const nextWeek = new Date()
    nextWeek.setDate(nextWeek.getDate() + 7)
    return nextWeek
  }
}