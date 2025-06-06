import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'
import { logger } from '../utils/logger'

// Initialize Supabase client for scrapers
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export type PriceType = 'FREE' | 'PAID' | 'DONATION'
export type EventCategory = 'WARSZTATY' | 'SPEKTAKLE' | 'SPORT' | 'EDUKACJA' | 'INNE'
export type EventStatus = 'DRAFT' | 'ACTIVE' | 'EXPIRED' | 'ARCHIVED'

export interface ScrapedEvent {
  title: string
  description: string
  ageMin: number
  ageMax: number
  priceType: PriceType
  price?: number
  currency?: string
  locationName: string
  address: string
  city: string
  lat?: number
  lng?: number
  postalCode?: string
  organizerName: string
  sourceUrl: string
  imageUrls: string[]
  startDate: Date
  endDate?: Date
  category: EventCategory
  tags: string[]
}

export abstract class BaseScraper {
  abstract name: string
  abstract sourceUrl: string
  
  protected abstract scrapeEvents(): Promise<ScrapedEvent[]>
  
  async run(): Promise<{ eventsCount: number, newEvents: number, updatedEvents: number }> {
    logger.info(`Starting scraper: ${this.name}`)
    
    try {
      const scrapedEvents = await this.scrapeEvents()
      logger.info(`Scraped ${scrapedEvents.length} events from ${this.name}`)
      
      let newEvents = 0
      let updatedEvents = 0
      
      for (const event of scrapedEvents) {
        const hash = this.generateHash(event)
        
        // Check if event already exists
        const { data: existingEvent } = await supabase
          .from('events')
          .select('id')
          .eq('source_hash', hash)
          .single()
        
        if (existingEvent) {
          // Update existing event
          const { error } = await supabase
            .from('events')
            .update({
              title: event.title,
              description: event.description,
              age_min: event.ageMin,
              age_max: event.ageMax,
              price_type: event.priceType,
              price: event.price,
              currency: event.currency || 'PLN',
              location_name: event.locationName,
              address: event.address,
              city: event.city,
              lat: event.lat,
              lng: event.lng,
              postal_code: event.postalCode,
              organizer_name: event.organizerName,
              source_url: event.sourceUrl,
              image_urls: event.imageUrls,
              start_date: event.startDate.toISOString(),
              end_date: event.endDate?.toISOString(),
              category: event.category,
              tags: event.tags,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingEvent.id)
          
          if (!error) {
            updatedEvents++
            logger.debug(`Updated event: ${event.title}`)
          } else {
            logger.error(`Failed to update event: ${event.title}`, error)
          }
        } else {
          // Create new event
          const { error } = await supabase
            .from('events')
            .insert({
              title: event.title,
              description: event.description,
              age_min: event.ageMin,
              age_max: event.ageMax,
              price_type: event.priceType,
              price: event.price,
              currency: event.currency || 'PLN',
              location_name: event.locationName,
              address: event.address,
              city: event.city,
              lat: event.lat,
              lng: event.lng,
              postal_code: event.postalCode,
              organizer_name: event.organizerName,
              organizer_id: process.env.SCRAPER_USER_ID || '00000000-0000-0000-0000-000000000000',
              source_url: event.sourceUrl,
              source_hash: hash,
              source_name: this.name,
              image_urls: event.imageUrls,
              start_date: event.startDate.toISOString(),
              end_date: event.endDate?.toISOString(),
              category: event.category,
              tags: event.tags,
              status: 'ACTIVE' as EventStatus // Auto-approve scraped events
            })
          
          if (!error) {
            newEvents++
            logger.debug(`Created new event: ${event.title}`)
          } else {
            logger.error(`Failed to create event: ${event.title}`, error)
          }
        }
      }
      
      logger.info(`Scraper ${this.name} completed. New: ${newEvents}, Updated: ${updatedEvents}`)
      
      return {
        eventsCount: scrapedEvents.length,
        newEvents,
        updatedEvents
      }
    } catch (error) {
      logger.error(`Scraper ${this.name} failed:`, error)
      throw error
    }
  }
  
  protected generateHash(event: ScrapedEvent): string {
    const data = `${event.title}-${event.startDate.toISOString()}-${event.locationName}`
    return crypto.createHash('sha256').update(data).digest('hex')
  }
  
  protected normalizeDate(date: Date): Date {
    // Set seconds and milliseconds to 0 for consistency
    date.setSeconds(0)
    date.setMilliseconds(0)
    return date
  }
  
  protected extractAgeRange(text: string): { min: number, max: number } {
    // Common Polish age patterns
    const patterns = [
      /(\d+)\s*-\s*(\d+)\s*lat/i,
      /(\d+)\s*-\s*(\d+)\s*l\./i,
      /od\s*(\d+)\s*do\s*(\d+)\s*lat/i,
      /(\d+)\+/,
      /dla\s+dzieci\s+(\d+)\s*-\s*(\d+)/i,
      /wiek:?\s*(\d+)\s*-\s*(\d+)/i
    ]
    
    for (const pattern of patterns) {
      const match = text.match(pattern)
      if (match) {
        if (match[2]) {
          return { min: parseInt(match[1]), max: parseInt(match[2]) }
        } else {
          // Handle "X+" pattern
          const age = parseInt(match[1])
          return { min: age, max: age + 5 }
        }
      }
    }
    
    // Check for specific age keywords
    const lowerText = text.toLowerCase()
    if (lowerText.includes('niemowl') || lowerText.includes('maluch')) {
      return { min: 0, max: 3 }
    }
    if (lowerText.includes('przedszkol')) {
      return { min: 3, max: 6 }
    }
    if (lowerText.includes('szkoln') || lowerText.includes('podstawów')) {
      return { min: 7, max: 14 }
    }
    if (lowerText.includes('młodzie') || lowerText.includes('liceal')) {
      return { min: 14, max: 18 }
    }
    
    // Default age range
    return { min: 5, max: 12 }
  }
  
  protected mapCategory(text: string): EventCategory {
    const lowerText = text.toLowerCase()
    
    if (lowerText.includes('warsztat') || lowerText.includes('zajęcia') || 
        lowerText.includes('kurs') || lowerText.includes('lekcj')) {
      return 'WARSZTATY'
    }
    if (lowerText.includes('spektakl') || lowerText.includes('teatr') || 
        lowerText.includes('przedstawieni') || lowerText.includes('musical')) {
      return 'SPEKTAKLE'
    }
    if (lowerText.includes('sport') || lowerText.includes('basen') || 
        lowerText.includes('taniec') || lowerText.includes('joga') ||
        lowerText.includes('gimnastyk') || lowerText.includes('piłk')) {
      return 'SPORT'
    }
    if (lowerText.includes('nauk') || lowerText.includes('eduk') || 
        lowerText.includes('szkoł') || lowerText.includes('akademi') ||
        lowerText.includes('robot') || lowerText.includes('programow')) {
      return 'EDUKACJA'
    }
    
    return 'INNE'
  }
  
  protected normalizeText(text: string): string {
    return text
      .trim()
      .replace(/\s+/g, ' ') // Multiple spaces to single space
      .replace(/\n+/g, ' ') // Newlines to spaces
      .replace(/\t+/g, ' ') // Tabs to spaces
      .replace(/\s*\.\s*$/, '') // Remove trailing period
      .substring(0, 5000) // Limit length
  }
}