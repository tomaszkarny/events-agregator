import axios from 'axios'
import * as cheerio from 'cheerio'
import { addDays, parse } from 'date-fns'
import { pl } from 'date-fns/locale'
import { BaseScraper, ScrapedEvent } from './base-scraper'
import { PriceType } from '@prisma/client'
import { logger } from '../utils/logger'

export class BibliotekiWarszawaScraper extends BaseScraper {
  name = 'biblioteki-warszawa'
  sourceUrl = 'https://biblioteki.warszawa.pl/wydarzenia'
  
  protected async scrapeEvents(): Promise<ScrapedEvent[]> {
    try {
      const response = await axios.get(this.sourceUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      })
      
      const $ = cheerio.load(response.data)
      const events: ScrapedEvent[] = []
      
      // Example scraping logic - adjust based on actual HTML structure
      $('.event-item, .wydarzenie').each((index, element) => {
        try {
          const $el = $(element)
          
          const title = $el.find('.event-title, h3, .tytul').text().trim()
          if (!title) return
          
          const description = $el.find('.event-description, .opis').text().trim()
          const location = $el.find('.event-location, .miejsce').text().trim()
          const dateText = $el.find('.event-date, .data').text().trim()
          const link = $el.find('a').attr('href')
          
          // Extract age from description or title
          const ageRange = this.extractAgeRange(title + ' ' + description)
          const category = this.mapCategory(title + ' ' + description)
          
          const event: ScrapedEvent = {
            title: this.normalizeText(title),
            description: this.normalizeText(description || 'Zapraszamy na wydarzenie w bibliotece'),
            ageMin: ageRange.min,
            ageMax: ageRange.max,
            priceType: PriceType.FREE, // Library events are usually free
            locationName: location || 'Biblioteka Publiczna',
            address: 'Do potwierdzenia',
            city: 'Warszawa',
            organizerName: 'Biblioteka Publiczna m.st. Warszawy',
            sourceUrl: link ? `https://biblioteki.warszawa.pl${link}` : this.sourceUrl,
            imageUrls: this.extractImageUrls($el, $),
            startDate: this.parsePolishDate(dateText) || addDays(new Date(), 7),
            category,
            tags: ['biblioteka', 'kultura', 'edukacja']
          }
          
          events.push(event)
        } catch (error) {
          logger.error('Failed to parse event element', { error })
        }
      })
      
      return events
    } catch (error) {
      logger.error(`Failed to scrape ${this.name}`, { error })
      return []
    }
  }
  
  private extractImageUrls($element: cheerio.Cheerio<any>, $: cheerio.CheerioAPI): string[] {
    const images: string[] = []
    
    $element.find('img').each((i, img) => {
      const src = $(img).attr('src')
      if (src) {
        const fullUrl = src.startsWith('http') ? src : `https://biblioteki.warszawa.pl${src}`
        images.push(fullUrl)
      }
    })
    
    return images.slice(0, 3)
  }
  
  private parsePolishDate(dateText: string): Date | null {
    if (!dateText) return null
    
    // Try different date formats
    const formats = [
      'dd MMMM yyyy',
      'dd.MM.yyyy',
      'd MMMM yyyy',
      'd.M.yyyy'
    ]
    
    for (const format of formats) {
      try {
        return parse(dateText, format, new Date(), { locale: pl })
      } catch {
        continue
      }
    }
    
    // Try to extract date parts
    const dateMatch = dateText.match(/(\d{1,2})[\.\s]+(\d{1,2})[\.\s]+(\d{4})/)
    if (dateMatch) {
      const [, day, month, year] = dateMatch
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
    }
    
    return null
  }
}