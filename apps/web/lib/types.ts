// API response types for better type safety

export interface EventApiResponse {
  id: string
  title: string
  description: string
  ageMin: number
  ageMax: number
  priceType: 'FREE' | 'PAID' | 'DONATION'
  price?: number
  currency?: string
  locationName: string
  address: string
  city: string
  lat: number
  lng: number
  startDate: string
  endDate?: string
  category: string
  imageUrls?: string[]
  tags: string[]
  organizerName?: string
  organizerId?: string
  status: string
  viewCount: number
  clickCount: number
}

export interface EventsSearchResponse {
  items: EventApiResponse[]
  nextCursor: string | null
  hasMore: boolean
}

export interface UserProfile {
  id: string
  email: string
  name?: string
  avatarUrl?: string
  role: string
  subscriptionTier: string
  createdAt: string
  updatedAt: string
}