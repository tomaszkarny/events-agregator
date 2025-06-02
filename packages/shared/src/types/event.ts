export type EventStatus = 'draft' | 'active' | 'expired' | 'archived'
export type PriceType = 'free' | 'paid' | 'donation'
export type EventCategory = 'warsztaty' | 'spektakle' | 'sport' | 'edukacja' | 'inne'

export interface Location {
  name: string
  address: string
  lat: number
  lng: number
  city?: string
  postalCode?: string
}

export interface AgeRange {
  min: number
  max: number
}

export interface Event {
  id: string
  title: string
  description: string
  ageRange: AgeRange
  priceType: PriceType
  price?: number
  currency?: string
  location: Location
  organizer: string
  organizerId?: string
  sourceUrl: string
  imageUrls: string[]
  startDate: Date
  endDate?: Date
  category: EventCategory
  tags: string[]
  status: EventStatus
  viewCount: number
  clickCount: number
  createdAt: Date
  updatedAt: Date
  sourceHash?: string
  sourceId?: string
  sourceName?: string
}