import { prisma } from '@events-agregator/database'
import { EventStatus, PriceType, EventCategory } from '@prisma/client'
import crypto from 'crypto'
import { logger } from '../utils/logger'

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
        const existingEvent = await prisma.event.findUnique({
          where: { sourceHash: hash }
        })
        
        if (existingEvent) {
          // Update existing event
          await prisma.event.update({
            where: { id: existingEvent.id },
            data: {
              ...this.mapEventData(event),
              sourceHash: hash,
              sourceName: this.name,
              updatedAt: new Date()
            }
          })
          updatedEvents++
        } else {
          // Create new event
          await prisma.event.create({
            data: {
              ...this.mapEventData(event),
              sourceHash: hash,
              sourceName: this.name,
              status: EventStatus.ACTIVE
            }
          })
          newEvents++
        }
      }
      
      logger.info(`Scraper ${this.name} completed. New: ${newEvents}, Updated: ${updatedEvents}`)
      
      return {
        eventsCount: scrapedEvents.length,
        newEvents,
        updatedEvents
      }
    } catch (error) {
      logger.error(`Scraper ${this.name} failed`, { error })
      throw error
    }
  }
  
  protected generateHash(event: ScrapedEvent): string {
    const data = `${event.title}-${event.startDate.toISOString()}-${event.locationName}`
    return crypto.createHash('sha256').update(data).digest('hex')
  }
  
  protected mapEventData(event: ScrapedEvent) {
    return {
      title: event.title.substring(0, 200),
      description: event.description.substring(0, 5000),
      ageMin: event.ageMin,
      ageMax: event.ageMax,
      priceType: event.priceType,
      price: event.price,
      currency: event.currency || 'PLN',
      locationName: event.locationName,
      address: event.address,
      city: event.city,
      lat: event.lat || 0,
      lng: event.lng || 0,
      postalCode: event.postalCode,
      organizerName: event.organizerName,
      sourceUrl: event.sourceUrl,
      imageUrls: event.imageUrls.slice(0, 5),
      startDate: event.startDate,
      endDate: event.endDate,
      category: event.category,
      tags: event.tags.slice(0, 10)
    }
  }
  
  protected normalizeText(text: string): string {
    return text
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/\n+/g, ' ')
  }
  
  protected extractAgeRange(text: string): { min: number; max: number } {
    const patterns = [
      /(\d+)\s*-\s*(\d+)\s*lat/i,
      /dla dzieci (\d+)\s*-\s*(\d+)/i,
      /wiek:?\s*(\d+)\s*-\s*(\d+)/i,
      /(\d+)\+/i,
    ]
    
    for (const pattern of patterns) {
      const match = text.match(pattern)
      if (match) {
        if (match[2]) {
          return { min: parseInt(match[1]), max: parseInt(match[2]) }
        } else {
          // For "5+" pattern
          return { min: parseInt(match[1]), max: 18 }
        }
      }
    }
    
    // Default if no age found
    return { min: 0, max: 18 }
  }
  
  protected mapCategory(text: string): EventCategory {
    const lowerText = text.toLowerCase()
    
    if (lowerText.includes('warsztat') || lowerText.includes('zajęcia')) {
      return EventCategory.WARSZTATY
    }
    if (lowerText.includes('spektakl') || lowerText.includes('teatr') || lowerText.includes('przedstawienie')) {
      return EventCategory.SPEKTAKLE
    }
    if (lowerText.includes('sport') || lowerText.includes('ruch') || lowerText.includes('taniec')) {
      return EventCategory.SPORT
    }
    if (lowerText.includes('nauk') || lowerText.includes('eduk') || lowerText.includes('lekcj')) {
      return EventCategory.EDUKACJA
    }
    
    return EventCategory.INNE
  }
}