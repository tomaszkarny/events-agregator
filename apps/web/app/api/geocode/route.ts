import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { rateLimit, RateLimitError } from '@/lib/rate-limiter'

// Input validation schema
const geocodeSchema = z.object({
  address: z.string()
    .min(3, 'Address must be at least 3 characters')
    .max(200, 'Address too long')
    .trim()
    .refine(val => val.length > 0, 'Address cannot be empty')
})

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting (10 requests per minute)
    await rateLimit(request, { windowMs: 60000, max: 10 })
    
    // Parse and validate input
    const body = await request.json()
    const { address } = geocodeSchema.parse(body)

    // Use OpenStreetMap Nominatim with better parameters for cleaner results
    const encodedAddress = encodeURIComponent(address)
    const limit = request.nextUrl.searchParams.get('limit') || '5'
    const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=${limit}&countrycodes=pl&addressdetails=1&extratags=1&namedetails=1`
    
    const response = await fetch(nominatimUrl, {
      headers: {
        'User-Agent': 'EventsAggregator/1.0' // Required by Nominatim
      }
    })
    
    if (!response.ok) {
      throw new Error('Geocoding service unavailable')
    }
    
    const data = await response.json()
    
    if (data.length === 0) {
      return NextResponse.json(
        { error: 'Address not found' },
        { status: 404 }
      )
    }
    
    const results = data as NominatimResult[]
    
    // Types for Nominatim response
    interface NominatimResult {
      lat: string
      lon: string
      display_name: string
      name?: string
      namedetails?: { name?: string }
      address?: {
        house_number?: string
        road?: string
        city?: string
        town?: string
        village?: string
        municipality?: string
        country?: string
      }
    }
    
    // Create a cleaner display name
    const createCleanAddress = (result: NominatimResult): string => {
      const addr = result.address || {}
      const parts: string[] = []
      
      // Add building/venue name if it exists
      const venueName = result.namedetails?.name || result.name
      if (venueName) {
        parts.push(venueName)
      }
      
      // Add house number and street
      if (addr.house_number && addr.road) {
        parts.push(`${addr.road} ${addr.house_number}`)
      } else if (addr.road) {
        parts.push(addr.road)
      }
      
      // Add city
      const city = addr.city || addr.town || addr.village || addr.municipality
      if (city) {
        parts.push(city)
      }
      
      return parts.length > 0 ? parts.join(', ') : result.display_name
    }
    
    // Process all results
    const suggestions = results.map(result => {
      const cleanAddress = createCleanAddress(result)
      const locationName = result.namedetails?.name || result.name || cleanAddress.split(',')[0]
      
      return {
        id: `${result.lat}-${result.lon}`, // Unique ID for each suggestion
        latitude: parseFloat(result.lat),
        longitude: parseFloat(result.lon),
        displayName: cleanAddress,
        locationName: locationName,
        address: {
          city: result.address?.city || result.address?.town || result.address?.village || 'Warszawa',
          country: result.address?.country || 'Poland'
        }
      }
    })
    
    return NextResponse.json({
      suggestions: suggestions
    })
    
  } catch (error) {
    console.error('Geocoding error:', error)
    
    // Handle rate limit errors
    if (error instanceof RateLimitError) {
      return NextResponse.json(
        { error: error.message },
        { 
          status: 429,
          headers: {
            'Retry-After': error.retryAfter.toString()
          }
        }
      )
    }
    
    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid input',
          details: error.errors.map(e => e.message)
        },
        { status: 400 }
      )
    }
    
    // Handle other errors
    return NextResponse.json(
      { error: 'Geocoding failed' },
      { status: 500 }
    )
  }
}