import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  try {
    console.log('=== MY EVENTS API CALLED ===')
    
    // Create server-side Supabase client (uses cookies automatically)
    const supabase = await createClient()
    
    console.log('Getting user from server-side Supabase...')
    
    // Use getUser() for server-side authentication (more secure)
    const { data: { user }, error } = await supabase.auth.getUser()
    
    console.log('Supabase verification result:')
    console.log('- Error:', error?.message || 'none')
    console.log('- User:', user?.email || 'none')
    
    if (error || !user) {
      console.log('❌ User not authenticated')
      return NextResponse.json({ error: 'Unauthorized', details: error?.message }, { status: 401 })
    }
    
    console.log('✅ User authenticated:', user.email)
    
    // Get user's events from database
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('*')
      .eq('organizer_id', user.id)
      .order('created_at', { ascending: false })
    
    if (eventsError) {
      console.error('Error fetching events:', eventsError)
      throw eventsError
    }
    
    // Calculate stats
    const safeEvents = events || []
    const stats = {
      total: safeEvents.length,
      draft: safeEvents.filter(e => e.status === 'DRAFT').length,
      active: safeEvents.filter(e => e.status === 'ACTIVE').length,
      expired: safeEvents.filter(e => e.status === 'EXPIRED').length,
      totalViews: safeEvents.reduce((sum, e) => sum + (e.view_count || 0), 0),
      totalClicks: safeEvents.reduce((sum, e) => sum + (e.click_count || 0), 0),
    }
    
    // Transform snake_case to camelCase for frontend compatibility
    const transformedEvents = safeEvents.map(event => ({
      ...event,
      organizerId: event.organizer_id,
      organizerName: event.organizer_name,
      locationName: event.location_name,
      startDate: event.start_date,
      endDate: event.end_date,
      ageMin: event.age_min,
      ageMax: event.age_max,
      priceType: event.price_type,
      imageUrls: event.image_urls || [],
      viewCount: event.view_count,
      clickCount: event.click_count,
      createdAt: event.created_at,
      updatedAt: event.updated_at
    }))
    
    return NextResponse.json({ 
      events: transformedEvents,
      stats,
      user: {
        id: user.id,
        email: user.email
      }
    })
    
  } catch (error) {
    console.error('Error fetching user events:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}