import { supabase } from './supabase-client'

// Define types locally for now
interface Event {
  id: string
  title: string
  description: string
  location_name: string
  address: string
  city: string
  lat?: number
  lng?: number
  age_min: number
  age_max: number
  price_type: 'FREE' | 'PAID' | 'DONATION'
  price?: number
  currency?: string
  category: string
  tags: string[]
  image_urls?: string[]
  organizer_id: string
  organizer_name: string
  start_date: string
  end_date?: string
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

interface Profile {
  id: string
  email: string
  name?: string
  avatar_url?: string
  role: string
  subscription_tier?: string
  last_login_at?: string
}

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
  const hostname = typeof window !== 'undefined' ? window.location.hostname : 'server'
  console.log('searchEvents called with params:', params)
  console.log('Running on hostname:', hostname, 'href:', typeof window !== 'undefined' ? window.location.href : 'server')
  
  try {
    console.log('Starting events query with full filtering...')
    
    // Start with base query - select all fields for complete event data
    let query = supabase
      .from('events')
      .select('*', { count: 'exact' })
    
    // CRITICAL: Only show ACTIVE events to public users
    console.log('Applying status filter: ACTIVE only')
    query = query.eq('status', 'ACTIVE')
    
    // Apply filters conditionally
    if (params.city && params.city.trim()) {
      console.log('Applying city filter:', params.city.trim())
      query = query.eq('city', params.city.trim())
    }
    
    if (params.category && params.category.trim()) {
      console.log('Applying category filter:', params.category.trim().toUpperCase())
      query = query.eq('category', params.category.trim().toUpperCase())
    }
    
    if (params.priceType && params.priceType.trim()) {
      console.log('Applying price type filter:', params.priceType.trim().toUpperCase())
      query = query.eq('price_type', params.priceType.trim().toUpperCase())
    }
    
    // Text search across multiple fields
    if (params.search && params.search.trim()) {
      const searchTerm = params.search.trim()
      console.log('Applying text search:', searchTerm)
      query = query.or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,location_name.ilike.%${searchTerm}%`)
    }
    
    // Age range filtering (overlapping ranges)
    if (params.ageMin !== undefined) {
      console.log('Applying age min filter:', params.ageMin)
      query = query.lte('age_min', params.ageMin)
    }
    if (params.ageMax !== undefined) {
      console.log('Applying age max filter:', params.ageMax)
      query = query.gte('age_max', params.ageMax)
    }
    
    // Ordering: upcoming events first, then by creation date
    console.log('Applying ordering: start_date ASC, created_at DESC')
    query = query.order('start_date', { ascending: true })
    query = query.order('created_at', { ascending: false })
    
    // Pagination
    const limit = params.limit || 25
    const offset = params.offset || 0
    console.log('Applying pagination:', { limit, offset, range: [offset, offset + limit - 1] })
    query = query.range(offset, offset + limit - 1)
    
    console.log('Executing complete query with all filters...')
    const { data, error, count } = await query
    
    console.log('Raw query result:', { 
      hasData: !!data, 
      dataLength: data?.length, 
      hasError: !!error, 
      errorDetails: error,
      totalCount: count,
      hasMore: (offset + limit) < (count || 0)
    })
    
    if (error) {
      console.error('Supabase query error:', error)
      return {
        items: [],
        total: 0,
        hasMore: false
      }
    }
    
    console.log('Query succeeded, processing data...')
    const transformedItems = (data || []).map(transformEvent)
    console.log('Transformed items count:', transformedItems.length)
    
    return {
      items: transformedItems,
      total: count || 0,
      hasMore: (offset + limit) < (count || 0)
    }
    
  } catch (err: any) {
    console.error('searchEvents error:', err)
    return {
      items: [],
      total: 0,
      hasMore: false
    }
  }
}

export async function getEvent(id: string) {
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

export async function createEvent(event: Partial<Event>) {
  try {
    const response = await fetch('/api/events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to create event')
    }

    const data = await response.json()
    return transformEvent(data)
  } catch (error) {
    console.error('Error creating event:', error)
    throw error
  }
}

export async function updateEvent(id: string, updates: Partial<Event>) {
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
  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export async function trackEventClick(id: string) {
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
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id)
    .select()
    .single()

  if (error) throw error
  return data
}

// Favorites
export async function toggleFavorite(eventId: string) {
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
  return data?.map((item: any) => transformEvent(item.events)).filter(Boolean) || []
}

// Child Profiles
export async function getChildProfiles(userId?: string) {
  const id = userId || (await supabase.auth.getUser()).data.user?.id
  
  if (!id) throw new Error('No user ID provided')

  const { data, error } = await supabase
    .from('child_profiles')
    .select('*')
    .eq('parent_id', id)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

export async function createChildProfile(childData: {
  name: string
  age: number
  interests?: string[]
}) {
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('child_profiles')
    .insert({
      ...childData,
      parent_id: user.id
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateChildProfile(id: string, updates: {
  name?: string
  age?: number
  interests?: string[]
}) {
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('child_profiles')
    .update(updates)
    .eq('id', id)
    .eq('parent_id', user.id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteChildProfile(id: string) {
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('child_profiles')
    .delete()
    .eq('id', id)
    .eq('parent_id', user.id)

  if (error) throw error
}