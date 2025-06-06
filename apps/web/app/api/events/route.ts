import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { searchEvents } from '@/lib/supabase-queries'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    
    const params = {
      city: searchParams.get('city') || undefined,
      category: searchParams.get('category') || undefined,
      ageMin: searchParams.get('ageMin') ? parseInt(searchParams.get('ageMin')!) : undefined,
      ageMax: searchParams.get('ageMax') ? parseInt(searchParams.get('ageMax')!) : undefined,
      priceType: searchParams.get('priceType') || undefined,
      search: searchParams.get('search') || undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 25,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0,
    }

    const result = await searchEvents(params)
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error searching events:', error)
    return NextResponse.json(
      { error: 'Failed to search events' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    // Get request body
    const body = await request.json()
    
    // Transform the data for database
    const eventData = {
      title: body.title,
      description: body.description,
      age_min: body.age_min,
      age_max: body.age_max,
      price_type: body.price_type,
      price: body.price || null,
      location_name: body.location_name,
      address: body.address,
      city: body.city,
      lat: body.lat || null,
      lng: body.lng || null,
      start_date: body.start_date,
      end_date: body.end_date || null,
      category: body.category,
      image_urls: body.image_urls || [],
      tags: body.tags || [],
      currency: body.currency || 'PLN',
      organizer_id: user.id,
      organizer_name: body.organizer_name || user.email,
      source_url: body.source_url || '',
      status: 'DRAFT', // All user-created events start as drafts
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    // Insert into database
    const { data: event, error } = await supabase
      .from('events')
      .insert(eventData)
      .select()
      .single()
    
    if (error) {
      console.error('Error creating event:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }
    
    return NextResponse.json(event)
  } catch (error) {
    console.error('Error in POST /api/events:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}