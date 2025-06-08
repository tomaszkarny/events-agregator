// API response types for better type safety

// Raw database event type (snake_case)
export interface EventDbRow {
  id: string
  title: string
  description: string
  age_min: number
  age_max: number
  price_type: 'FREE' | 'PAID' | 'DONATION'
  price?: number
  currency?: string
  location_name: string
  address: string
  city: string
  lat: number
  lng: number
  start_date: string
  end_date?: string
  category: string
  image_urls?: string[]
  tags: string[]
  organizer_name?: string
  organizer_id?: string
  status: string
  view_count: number
  click_count: number
  created_at: string
  updated_at: string
  source_url?: string
  source_hash?: string
  source_id?: string
  source_name?: string
  postal_code?: string
}

// Transformed event type (camelCase) - used by components
export interface EventApiResponse {
  id: string
  title: string
  description: string
  locationName: string
  city: string
  startDate: string
  endDate?: string
  ageMin: number
  ageMax: number
  priceType: 'FREE' | 'PAID' | 'DONATION'
  price?: number
  category: string
  imageUrls?: string[]
  status: string
  organizerName?: string
  // Additional properties from transformation
  address?: string
  lat?: number
  lng?: number
  tags?: string[]
  organizerId?: string
  viewCount?: number
  clickCount?: number
  createdAt?: string
  updatedAt?: string
  sourceUrl?: string
  sourceHash?: string
  sourceId?: string
  sourceName?: string
  postalCode?: string
  currency?: string
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

export interface ChildProfile {
  id: string
  userId: string
  name: string
  age: number
  interests: string[]
  createdAt: string
  updatedAt: string
}