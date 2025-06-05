import { createClient } from './supabase-client'
import type { Database } from '../../../lib/supabase-types'

type Event = Database['public']['Tables']['events']['Row']
type EventInsert = Database['public']['Tables']['events']['Insert']
type Profile = Database['public']['Tables']['profiles']['Row']

// Transform snake_case database fields to camelCase for components
function transformEvent(event: any) {
  if (!event) return null
  
  return {
    ...event,
    locationName: event.location_name,
    startDate: event.start_date,
    endDate: event.end_date,
    ageMin: event.age_min,
    ageMax: event.age_max,
    priceType: event.price_type,
    imageUrls: event.image_urls,
    organizerName: event.organizer_name,
    viewCount: event.view_count,
    clickCount: event.click_count,
    createdAt: event.created_at,
    updatedAt: event.updated_at,
    organizerId: event.organizer_id,
    sourceUrl: event.source_url,
    sourceHash: event.source_hash,
    sourceId: event.source_id,
    sourceName: event.source_name,
    postalCode: event.postal_code,
  }
}

// Events queries
export async function searchEvents(params: {
  city?: string
  category?: string
  ageMin?: number
  ageMax?: number
  priceType?: string
  search?: string
  limit?: number
  offset?: number
}) {
  const supabase = createClient()
  
  let query = supabase
    .from('events')
    .select('*', { count: 'exact' })
    .in('status', ['ACTIVE', 'DRAFT'])
    .order('start_date', { ascending: true })

  if (params.city) {
    query = query.eq('city', params.city)
  }

  if (params.category) {
    query = query.eq('category', params.category)
  }

  if (params.priceType) {
    query = query.eq('price_type', params.priceType)
  }

  if (params.ageMin) {
    query = query.gte('age_max', params.ageMin)
  }

  if (params.ageMax) {
    query = query.lte('age_min', params.ageMax)
  }

  if (params.search) {
    query = query.or(`title.ilike.%${params.search}%,description.ilike.%${params.search}%`)
  }

  const limit = params.limit || 25
  const offset = params.offset || 0

  query = query.range(offset, offset + limit - 1)

  const { data, error, count } = await query

  if (error) throw error

  return {
    items: (data || []).map(transformEvent),
    total: count || 0,
    hasMore: (count || 0) > offset + limit
  }
}

export async function getEvent(id: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('events')
    .select(`
      *,
      organizer:profiles!events_organizer_id_fkey(id, name, email)
    `)
    .eq('id', id)
    .single()

  if (error) throw error
  
  // Increment view count
  await supabase
    .from('events')
    .update({ view_count: (data.view_count || 0) + 1 })
    .eq('id', id)

  return transformEvent(data)
}

export async function createEvent(event: Omit<EventInsert, 'organizer_id'>) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('events')
    .insert({
      ...event,
      organizer_id: user.id,
      status: 'DRAFT' // All user-created events start as drafts
    })
    .select()
    .single()

  if (error) throw error
  return transformEvent(data)
}

export async function updateEvent(id: string, updates: Partial<Event>) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('events')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return transformEvent(data)
}

export async function deleteEvent(id: string) {
  const supabase = createClient()
  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export async function trackEventClick(id: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .rpc('increment', {
      table_name: 'events',
      column_name: 'click_count',
      row_id: id
    })

  if (error) {
    // Fallback to direct update if RPC doesn't exist
    await supabase
      .from('events')
      .update({ click_count: supabase.raw('click_count + 1') })
      .eq('id', id)
  }
}

// User queries
export async function getProfile(userId?: string) {
  const supabase = createClient()
  const id = userId || (await supabase.auth.getUser()).data.user?.id
  
  if (!id) {
    console.log('No user ID provided for profile fetch')
    return null
  }

  const { data, error } = await supabase
    .from('profiles')
    .select(`
      *,
      child_profiles(*),
      subscriptions(*)
    `)
    .eq('id', id)
    .single()

  if (error) {
    // Profile might not exist yet for new users
    if (error.code === 'PGRST116') {
      console.log('Profile not found, will be created on first login')
      return null
    }
    console.error('Error fetching profile:', error)
    return null
  }
  
  return data
}

export async function updateProfile(updates: Partial<Profile>) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id)
    .select()
    .single()

  if (error) throw error
  return transformEvent(data)
}

// Favorites
export async function toggleFavorite(eventId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) throw new Error('Not authenticated')

  // Check if already favorited
  const { data: existing } = await supabase
    .from('user_favorite_events')
    .select('*')
    .eq('user_id', user.id)
    .eq('event_id', eventId)
    .single()

  if (existing) {
    // Remove favorite
    const { error } = await supabase
      .from('user_favorite_events')
      .delete()
      .eq('user_id', user.id)
      .eq('event_id', eventId)
    
    if (error) throw error
    return false
  } else {
    // Add favorite
    const { error } = await supabase
      .from('user_favorite_events')
      .insert({
        user_id: user.id,
        event_id: eventId
      })
    
    if (error) throw error
    return true
  }
}

export async function getUserEvents(userId?: string) {
  const supabase = createClient()
  const id = userId || (await supabase.auth.getUser()).data.user?.id
  
  if (!id) throw new Error('No user ID provided')

  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('organizer_id', id)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data || []).map(transformEvent)
}

export async function getUserFavorites(userId?: string) {
  const supabase = createClient()
  const id = userId || (await supabase.auth.getUser()).data.user?.id
  
  if (!id) throw new Error('No user ID provided')

  const { data, error } = await supabase
    .from('user_favorite_events')
    .select(`
      event_id,
      events(*)
    `)
    .eq('user_id', id)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data?.map(item => transformEvent(item.events)).filter(Boolean) || []
}