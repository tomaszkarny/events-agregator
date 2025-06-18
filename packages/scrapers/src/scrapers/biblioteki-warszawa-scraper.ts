import Parser from 'rss-parser'
import { addDays, parseISO } from 'date-fns'
import { BaseScraper, ScrapedEvent } from './base-scraper'
import { logger } from '../utils/logger'
import axios from 'axios'

export class BibliotekiWarszawaScraper extends BaseScraper {
  name = 'biblioteki-warszawa'
  sourceUrl = 'https://www.bibliotekiwarszawy.pl/wydarzenia/feed/'
  
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
          const event = await this.parseRssItem(item)
          if (event) {
            events.push(event)
          }
        } catch (error) {
          logger.error(`Failed to parse RSS item: ${item.title}`, { error })
        }
      }
      
      logger.info(`Successfully parsed ${events.length} events from Biblioteki Warszawy`)
      return events
    } catch (error) {
      logger.error(`Failed to fetch RSS feed: ${this.sourceUrl}`, { 
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined
      })
      return []
    }
  }
  
  private async parseRssItem(item: any): Promise<ScrapedEvent | null> {
    if (!item.title || !item.link) {
      return null
    }
    
    // Extract information from description and content
    const fullText = `${item.title} ${item.description || ''} ${item.content || ''}`
    const ageRange = this.extractAgeRange(fullText)
    const category = this.mapCategory(fullText)
    const locationName = this.extractLocation(fullText) || 'Biblioteka Publiczna'
    
    // Get coordinates for Warsaw (default for library events)
    const coordinates = await this.geocodeAddress('Warszawa, Polska')
    
    return {
      title: this.normalizeText(item.title),
      description: this.normalizeText(item.description || item.contentSnippet || 'Zapraszamy na wydarzenie w bibliotece'),
      ageMin: ageRange.min,
      ageMax: ageRange.max,
      priceType: 'FREE', // Library events are usually free
      locationName,
      address: 'Do potwierdzenia - sprawdź na stronie wydarzenia',
      city: 'Warszawa',
      lat: coordinates.lat,
      lng: coordinates.lng,
      organizerName: 'Biblioteka Publiczna m.st. Warszawy',
      sourceUrl: item.link,
      imageUrls: this.extractImages(item),
      startDate: this.parseDate(item.pubDate) || addDays(new Date(), 7),
      category,
      tags: ['biblioteka', 'kultura', 'edukacja', 'warszawa']
    }
  }
  
  private extractLocation(text: string): string | null {
    // Search for library branch names or location patterns
    const patterns = [
      /filia\s+(.+?)(?:\.|,|$)/i,
      /biblioteka\s+(.+?)(?:\.|,|$)/i,
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
    
    // Check content:encoded for images
    if (item.content) {
      const imgMatches = item.content.match(/<img[^>]+src=["']([^"']+)["']/gi) || []
      for (const match of imgMatches) {
        const srcMatch = match.match(/src=["']([^"']+)["']/)
        if (srcMatch && srcMatch[1]) {
          // Make sure URL is absolute
          const imageUrl = srcMatch[1].startsWith('http') 
            ? srcMatch[1] 
            : `https://www.bibliotekiwarszawy.pl${srcMatch[1]}`
          images.push(imageUrl)
        }
      }
    }
    
    // Check enclosure
    if (item.enclosure && item.enclosure.url) {
      images.push(item.enclosure.url)
    }
    
    return images.slice(0, 3)
  }
  
  private parseDate(dateStr: string | undefined): Date | null {
    if (!dateStr) return null
    
    try {
      return new Date(dateStr)
    } catch {
      return null
    }
  }
  
  private async geocodeAddress(address: string): Promise<{ lat: number; lng: number }> {
    try {
      const response = await axios.get('https://nominatim.openstreetmap.org/search', {
        params: {
          q: address,
          format: 'json',
          limit: 1,
          countrycodes: 'pl'
        },
        timeout: 5000,
        headers: {
          'User-Agent': 'Events-Agregator-Scraper/1.0'
        }
      })
      
      if (response.data && response.data.length > 0) {
        const result = response.data[0]
        return {
          lat: parseFloat(result.lat),
          lng: parseFloat(result.lon)
        }
      }
      
      // Fallback to Warsaw center coordinates
      logger.warn(`Failed to geocode address: ${address}, using Warsaw center`)
      return { lat: 52.2297, lng: 21.0122 }
    } catch (error) {
      logger.error(`Geocoding error for address: ${address}`, { error })
      // Fallback to Warsaw center coordinates
      return { lat: 52.2297, lng: 21.0122 }
    }
  }
}