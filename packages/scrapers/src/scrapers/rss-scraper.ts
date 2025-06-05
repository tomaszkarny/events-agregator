import Parser from 'rss-parser'
import { addDays, parseISO } from 'date-fns'
import { BaseScraper, ScrapedEvent } from './base-scraper'
import { PriceType } from '@prisma/client'
import { logger } from '../utils/logger'

export class RssScraper extends BaseScraper {
  name = 'example-rss'
  sourceUrl = 'https://example.com/events.rss'
  
  private parser = new Parser({
    customFields: {
      item: [
        ['event:location', 'eventLocation'],
        ['event:date', 'eventDate'],
        ['event:age', 'eventAge'],
        ['event:price', 'eventPrice']
      ]
    }
  })
  
  protected async scrapeEvents(): Promise<ScrapedEvent[]> {
    try {
      const feed = await this.parser.parseURL(this.sourceUrl)
      const events: ScrapedEvent[] = []
      
      for (const item of feed.items || []) {
        try {
          const event = this.parseRssItem(item, feed)
          if (event) {
            events.push(event)
          }
        } catch (error) {
          logger.error(`Failed to parse RSS item: ${item.title}`, { error })
        }
      }
      
      return events
    } catch (error) {
      logger.error(`Failed to fetch RSS feed: ${this.sourceUrl}`, { error })
      return []
    }
  }
  
  private parseRssItem(item: any, feed: any): ScrapedEvent | null {
    if (!item.title || !item.link) {
      return null
    }
    
    const ageRange = this.extractAgeRange(item.contentSnippet || item.title)
    const category = this.mapCategory(item.title + ' ' + (item.contentSnippet || ''))
    
    return {
      title: this.normalizeText(item.title),
      description: this.normalizeText(item.contentSnippet || item.content || ''),
      ageMin: ageRange.min,
      ageMax: ageRange.max,
      priceType: PriceType.FREE, // Assume free for RSS events
      locationName: item.eventLocation || 'Miejsce do potwierdzenia',
      address: 'Do potwierdzenia',
      city: 'Warszawa', // Default city
      organizerName: item.creator || feed.title || 'Organizator',
      sourceUrl: item.link,
      imageUrls: this.extractImages(item),
      startDate: this.parseDate(item.eventDate || item.pubDate) || addDays(new Date(), 7),
      category,
      tags: this.extractTags(item)
    }
  }
  
  private extractImages(item: any): string[] {
    const images: string[] = []
    
    // Check for enclosure images
    if (item.enclosure && item.enclosure.url && item.enclosure.type?.startsWith('image/')) {
      images.push(item.enclosure.url)
    }
    
    // Check for media content
    if (item['media:content'] && item['media:content'].$ && item['media:content'].$.url) {
      images.push(item['media:content'].$.url)
    }
    
    return images
  }
  
  private parseDate(dateStr: string | undefined): Date | null {
    if (!dateStr) return null
    
    try {
      return parseISO(dateStr)
    } catch {
      try {
        return new Date(dateStr)
      } catch {
        return null
      }
    }
  }
  
  private extractTags(item: any): string[] {
    const tags: string[] = []
    
    if (item.categories) {
      tags.push(...item.categories)
    }
    
    return tags.slice(0, 10)
  }
}