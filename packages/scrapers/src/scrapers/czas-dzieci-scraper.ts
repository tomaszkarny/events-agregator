import Parser from 'rss-parser'
import { addDays, parseISO } from 'date-fns'
import { BaseScraper, ScrapedEvent } from './base-scraper'
import { logger } from '../utils/logger'

/**
 * Scraper dla CzasDzieci.pl - prawdziwe źródło wydarzeń dla dzieci
 * RSS Feed: https://czasdzieci.pl/wydarzenia/rss/
 */
export class CzasDzieciScraper extends BaseScraper {
  name = 'czas-dzieci'
  sourceUrl = 'https://czasdzieci.pl/wydarzenia/rss/'
  
  private parser = new Parser({
    customFields: {
      item: [
        ['description', 'description'],
        ['content:encoded', 'content'],
        ['dc:creator', 'creator'],
        ['category', 'category', { keepArray: true }]
      ]
    }
  })
  
  protected async scrapeEvents(): Promise<ScrapedEvent[]> {
    try {
      logger.info(`Fetching RSS from: ${this.sourceUrl}`)
      const feed = await this.parser.parseURL(this.sourceUrl)
      const events: ScrapedEvent[] = []
      
      logger.info(`Found ${feed.items?.length || 0} items in RSS`)
      
      for (const item of feed.items || []) {
        try {
          const event = this.parseRssItem(item)
          if (event) {
            events.push(event)
          }
        } catch (error) {
          logger.error(`Failed to parse RSS item: ${item.title}`, { error })
        }
      }
      
      logger.info(`Successfully parsed ${events.length} events from CzasDzieci`)
      return events
    } catch (error) {
      logger.error(`Failed to fetch RSS feed: ${this.sourceUrl}`, { 
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
    
    // Wyciągnij informacje z opisu
    const fullText = `${item.title} ${item.description || ''} ${item.content || ''}`
    const ageRange = this.extractAgeRange(fullText)
    const city = this.extractCity(fullText)
    const price = this.extractPrice(fullText)
    
    // Kategoria na podstawie tagów
    const categories = item.category || []
    const category = this.mapCategoryFromTags(categories)
    
    return {
      title: this.normalizeText(item.title),
      description: this.normalizeText(item.description || item.contentSnippet || ''),
      ageMin: ageRange.min,
      ageMax: ageRange.max,
      priceType: price.type,
      price: price.amount,
      locationName: this.extractLocation(fullText) || 'Do potwierdzenia',
      address: 'Zobacz na stronie wydarzenia',
      city: city,
      organizerName: item.creator || 'CzasDzieci.pl',
      sourceUrl: item.link,
      imageUrls: this.extractImages(item),
      startDate: this.parseDate(item.pubDate) || addDays(new Date(), 7),
      category: category,
      tags: this.extractTags(categories)
    }
  }
  
  private extractCity(text: string): string {
    const cities = [
      'Warszawa', 'Kraków', 'Wrocław', 'Poznań', 'Gdańsk',
      'Szczecin', 'Bydgoszcz', 'Lublin', 'Białystok', 'Katowice'
    ]
    
    for (const city of cities) {
      if (text.toLowerCase().includes(city.toLowerCase())) {
        return city
      }
    }
    
    return 'Warszawa' // Default
  }
  
  private extractPrice(text: string): { type: 'FREE' | 'PAID' | 'DONATION', amount?: number } {
    const lowerText = text.toLowerCase()
    
    if (lowerText.includes('bezpłat') || lowerText.includes('wstęp wolny') || 
        lowerText.includes('darmow') || lowerText.includes('free')) {
      return { type: 'FREE' }
    }
    
    // Szukaj kwot
    const priceMatch = text.match(/(\d+)\s*(zł|PLN|złot)/i)
    if (priceMatch) {
      return { 
        type: 'PAID', 
        amount: parseInt(priceMatch[1]) 
      }
    }
    
    return { type: 'PAID', amount: 20 } // Default
  }
  
  private extractLocation(text: string): string | null {
    // Szukaj wzorców lokalizacji
    const patterns = [
      /w\s+(.+?)(?:\.|,|$)/i,
      /miejsce:\s*(.+?)(?:\.|,|$)/i,
      /lokalizacja:\s*(.+?)(?:\.|,|$)/i,
      /adres:\s*(.+?)(?:\.|,|$)/i
    ]
    
    for (const pattern of patterns) {
      const match = text.match(pattern)
      if (match && match[1]) {
        return this.normalizeText(match[1])
      }
    }
    
    return null
  }
  
  private extractImages(item: any): string[] {
    const images: string[] = []
    
    // Sprawdź content:encoded dla obrazków
    if (item.content) {
      const imgMatches = item.content.match(/<img[^>]+src=["']([^"']+)["']/gi) || []
      for (const match of imgMatches) {
        const srcMatch = match.match(/src=["']([^"']+)["']/)
        if (srcMatch && srcMatch[1]) {
          images.push(srcMatch[1])
        }
      }
    }
    
    // Sprawdź enclosure
    if (item.enclosure && item.enclosure.url) {
      images.push(item.enclosure.url)
    }
    
    return images.slice(0, 3)
  }
  
  private mapCategoryFromTags(tags: string[]): 'WARSZTATY' | 'SPEKTAKLE' | 'SPORT' | 'EDUKACJA' | 'INNE' {
    const tagString = tags.join(' ').toLowerCase()
    
    if (tagString.includes('warsztat') || tagString.includes('zajęcia')) {
      return 'WARSZTATY'
    }
    if (tagString.includes('spektakl') || tagString.includes('teatr')) {
      return 'SPEKTAKLE'
    }
    if (tagString.includes('sport') || tagString.includes('basen')) {
      return 'SPORT'
    }
    if (tagString.includes('nauk') || tagString.includes('eduk')) {
      return 'EDUKACJA'
    }
    
    return 'INNE'
  }
  
  private parseDate(dateStr: string | undefined): Date | null {
    if (!dateStr) return null
    
    try {
      return new Date(dateStr)
    } catch {
      return null
    }
  }
  
  private extractTags(categories: any): string[] {
    if (!categories) return []
    
    const tags = Array.isArray(categories) ? categories : [categories]
    return tags
      .map(tag => this.normalizeText(tag.toString()))
      .filter(tag => tag.length > 0)
      .slice(0, 10)
  }
}