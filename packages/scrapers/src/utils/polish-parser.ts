import { addDays, addWeeks, addMonths, parseISO, format, isValid } from 'date-fns'
import { pl } from 'date-fns/locale'

export interface AgeRange {
  min?: number
  max?: number
}

export interface PriceInfo {
  type: 'FREE' | 'PAID' | 'DONATION'
  amount?: number
  currency?: string
  description?: string
}

export interface DateRange {
  startDate: Date
  endDate?: Date
  recurring?: boolean
  pattern?: string
}

/**
 * Polish language parser for event data
 * Handles common Polish date formats, age groups, and prices
 */
export class PolishEventParser {
  private static readonly POLISH_MONTHS = {
    'stycznia': 1, 'lutego': 2, 'marca': 3, 'kwietnia': 4, 'maja': 5, 'czerwca': 6,
    'lipca': 7, 'sierpnia': 8, 'września': 9, 'października': 10, 'listopada': 11, 'grudnia': 12,
    'styczeń': 1, 'luty': 2, 'marzec': 3, 'kwiecień': 4, 'maj': 5, 'czerwiec': 6,
    'lipiec': 7, 'sierpień': 8, 'wrzesień': 9, 'październik': 10, 'listopad': 11, 'grudzień': 12
  }

  private static readonly POLISH_WEEKDAYS = {
    'poniedziałek': 1, 'wtorek': 2, 'środa': 3, 'czwartek': 4, 'piątek': 5, 'sobota': 6, 'niedziela': 0,
    'poniedziałki': 1, 'wtorki': 2, 'środy': 3, 'czwartki': 4, 'piątki': 5, 'soboty': 6, 'niedziele': 0
  }

  private static readonly FREE_KEYWORDS = [
    'bezpłatny', 'bezpłatnie', 'darmowy', 'darmowe', 'wstęp wolny', 'wstęp bezpłatny',
    'free', 'gratis', 'za darmo', 'bez opłat', 'nieodpłatny'
  ]

  private static readonly AGE_PATTERNS = [
    /dla dzieci (\d+)-(\d+) lat/i,
    /(\d+)-(\d+) lat/i,
    /od (\d+) lat/i,
    /(\d+)\+/,
    /dzieci (\d+)-(\d+)/i,
    /młodzież (\d+)\+/i,
    /rodzinne \((\d+)\+\)/i,
    /niemowlęta/i,
    /maluch/i,
    /przedszkolak/i,
    /szkolne/i
  ]

  /**
   * Parse Polish date formats
   */
  static parseDate(text: string, baseDate: Date = new Date()): DateRange | null {
    const cleanText = text.toLowerCase().trim()

    // Try ISO format first
    const isoMatch = text.match(/\d{4}-\d{2}-\d{2}/)
    if (isoMatch) {
      const date = parseISO(isoMatch[0])
      if (isValid(date)) {
        return { startDate: date }
      }
    }

    // Polish date format: "17 czerwca 2025"
    const polishDateMatch = cleanText.match(/(\d{1,2})\s+(\w+)\s*(\d{4})?/)
    if (polishDateMatch) {
      const [, day, monthStr, yearStr] = polishDateMatch
      const month = this.POLISH_MONTHS[monthStr as keyof typeof this.POLISH_MONTHS]
      if (month) {
        const year = yearStr ? parseInt(yearStr) : baseDate.getFullYear()
        const date = new Date(year, month - 1, parseInt(day))
        if (isValid(date)) {
          return { startDate: date }
        }
      }
    }

    // Weekday patterns: "soboty i niedziele"
    const weekdayMatch = cleanText.match(/(soboty|niedziele|poniedziałki|wtorki|środy|czwartki|piątki)/i)
    if (weekdayMatch) {
      const weekday = this.POLISH_WEEKDAYS[weekdayMatch[1] as keyof typeof this.POLISH_WEEKDAYS]
      if (weekday !== undefined) {
        const nextWeekday = this.getNextWeekday(baseDate, weekday)
        return { 
          startDate: nextWeekday, 
          recurring: true,
          pattern: weekdayMatch[1]
        }
      }
    }

    // Relative dates
    if (cleanText.includes('dziś') || cleanText.includes('dzisiaj')) {
      return { startDate: new Date() }
    }
    if (cleanText.includes('jutro')) {
      return { startDate: addDays(new Date(), 1) }
    }
    if (cleanText.includes('pojutrze')) {
      return { startDate: addDays(new Date(), 2) }
    }

    // Special periods
    if (cleanText.includes('ferie zimowe')) {
      // Approximate winter break dates
      const winterBreak = new Date(baseDate.getFullYear(), 0, 20) // Jan 20
      return { startDate: winterBreak, endDate: addDays(winterBreak, 14) }
    }
    if (cleanText.includes('ferie letnie')) {
      const summerBreak = new Date(baseDate.getFullYear(), 6, 1) // July 1
      return { startDate: summerBreak, endDate: addDays(summerBreak, 60) }
    }

    return null
  }

  /**
   * Extract age range from Polish text
   */
  static extractAgeRange(text: string): AgeRange {
    const cleanText = text.toLowerCase()

    // Check for specific age patterns
    for (const pattern of this.AGE_PATTERNS) {
      const match = cleanText.match(pattern)
      if (match) {
        if (pattern.toString().includes('niemowlęta')) {
          return { min: 0, max: 1 }
        }
        if (pattern.toString().includes('maluch')) {
          return { min: 1, max: 3 }
        }
        if (pattern.toString().includes('przedszkolak')) {
          return { min: 3, max: 6 }
        }
        if (pattern.toString().includes('szkolne')) {
          return { min: 6, max: 18 }
        }

        // Numeric ranges
        if (match[1] && match[2]) {
          return { min: parseInt(match[1]), max: parseInt(match[2]) }
        }
        if (match[1] && pattern.toString().includes('od')) {
          return { min: parseInt(match[1]) }
        }
        if (match[1] && pattern.toString().includes('\\+')) {
          return { min: parseInt(match[1]) }
        }
      }
    }

    // Default fallback
    if (cleanText.includes('dzieci')) {
      return { min: 3, max: 12 }
    }
    if (cleanText.includes('młodzież')) {
      return { min: 13, max: 18 }
    }
    if (cleanText.includes('rodzinne')) {
      return { min: 0, max: 18 }
    }

    return { min: 0, max: 18 }
  }

  /**
   * Parse price information from Polish text
   */
  static parsePrice(text: string): PriceInfo {
    const cleanText = text.toLowerCase()

    // Check for free keywords
    for (const keyword of this.FREE_KEYWORDS) {
      if (cleanText.includes(keyword)) {
        return { type: 'FREE' }
      }
    }

    // Extract price amounts
    const pricePatterns = [
      /(\d+)\s*zł/i,
      /(\d+)\s*PLN/i,
      /(\d+)\s*złot/i,
      /bilety?\s*:?\s*(\d+)/i,
      /opłata\s*:?\s*(\d+)/i,
      /koszt\s*:?\s*(\d+)/i
    ]

    for (const pattern of pricePatterns) {
      const match = cleanText.match(pattern)
      if (match) {
        const amount = parseInt(match[1])
        return {
          type: 'PAID',
          amount: amount,
          currency: 'PLN'
        }
      }
    }

    // Price ranges
    const rangeMatch = cleanText.match(/(\d+)[-/](\d+)\s*zł/i)
    if (rangeMatch) {
      const minPrice = parseInt(rangeMatch[1])
      const maxPrice = parseInt(rangeMatch[2])
      return {
        type: 'PAID',
        amount: minPrice, // Use minimum price
        currency: 'PLN',
        description: `${minPrice}-${maxPrice} zł`
      }
    }

    // Donation/voluntary payment
    if (cleanText.includes('dobrowolna') || cleanText.includes('wsparcie') || cleanText.includes('darowizna')) {
      return { type: 'DONATION' }
    }

    // Default to paid if no clear indication
    return { type: 'PAID', amount: 20, currency: 'PLN' }
  }

  /**
   * Normalize venue names for Białystok
   */
  static normalizeVenue(text: string): string {
    const venueAliases: Record<string, string> = {
      'bok': 'Białostocki Ośrodek Kultury',
      'clz': 'Centrum im. L. Zamenhofa',
      'mdk': 'Młodzieżowy Dom Kultury',
      'btl': 'Białostocki Teatr Lalek',
      'oifp': 'Opera i Filharmonia Podlaska',
      'knihovna': 'Książnica Podlaska',
      'epi-centrum': 'Epi-Centrum Nauki',
      'pb': 'Politechnika Białostocka',
      'uwb': 'Uniwersytet w Białymstoku'
    }

    const cleanText = text.toLowerCase().trim()
    
    for (const [alias, fullName] of Object.entries(venueAliases)) {
      if (cleanText.includes(alias)) {
        return fullName
      }
    }

    return text.trim()
  }

  /**
   * Extract location from text
   */
  static extractLocation(text: string): string | null {
    const locationPatterns = [
      /w\s+(.+?)(?:\.|,|$)/i,
      /miejsce:\s*(.+?)(?:\.|,|$)/i,
      /lokalizacja:\s*(.+?)(?:\.|,|$)/i,
      /adres:\s*(.+?)(?:\.|,|$)/i,
      /ul\.\s+(.+?)(?:\.|,|$)/i,
      /al\.\s+(.+?)(?:\.|,|$)/i,
      /pl\.\s+(.+?)(?:\.|,|$)/i
    ]

    for (const pattern of locationPatterns) {
      const match = text.match(pattern)
      if (match && match[1]) {
        return this.normalizeVenue(match[1].trim())
      }
    }

    return null
  }

  /**
   * Get next occurrence of a weekday
   */
  private static getNextWeekday(baseDate: Date, weekday: number): Date {
    const currentDay = baseDate.getDay()
    const daysUntilWeekday = (weekday - currentDay + 7) % 7
    return addDays(baseDate, daysUntilWeekday === 0 ? 7 : daysUntilWeekday)
  }

  /**
   * Clean and normalize text
   */
  static normalizeText(text: string): string {
    return text
      .replace(/\s+/g, ' ')
      .replace(/[""„"]/g, '"')
      .replace(/['']/g, "'")
      .trim()
  }
}