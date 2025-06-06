import { Router } from 'express'
import { z } from 'zod'
import { createClient } from '@supabase/supabase-js'
import { AppError } from '../middleware/errorHandler'
import { authenticate, AuthRequest } from '../middleware/auth'
import { logger } from '../utils/logger'
import dotenv from 'dotenv'

dotenv.config()

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Use service role for server-side operations
)

const router = Router()

// Validation schemas
const searchEventsSchema = z.object({
  city: z.string().optional().transform(val => val === '' ? undefined : val),
  category: z.enum(['WARSZTATY', 'SPEKTAKLE', 'SPORT', 'EDUKACJA', 'INNE']).optional()
    .or(z.literal('').transform(() => undefined)),
  ageMin: z.string().transform(Number).optional(),
  ageMax: z.string().transform(Number).optional(),
  priceType: z.enum(['FREE', 'PAID', 'DONATION']).optional()
    .or(z.literal('').transform(() => undefined)),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  search: z.string().optional(),
  limit: z.string().transform(Number).default('25'),
  cursor: z.string().optional(),
})

// GET /api/events - Search events
router.get('/', async (req, res, next) => {
  try {
    const query = searchEventsSchema.parse(req.query)
    
    // Query parameters will be handled in Supabase query builder

    // Build Supabase query
    let supabaseQuery = supabase
      .from('events')
      .select('*')
      .in('status', ['ACTIVE', 'DRAFT'])
    
    if (query.city) {
      supabaseQuery = supabaseQuery.eq('city', query.city)
    }
    
    if (query.category) {
      supabaseQuery = supabaseQuery.eq('category', query.category)
    }
    
    if (query.priceType) {
      supabaseQuery = supabaseQuery.eq('price_type', query.priceType)
    }
    
    if (query.ageMin) {
      supabaseQuery = supabaseQuery.gte('age_max', query.ageMin)
    }
    
    if (query.ageMax) {
      supabaseQuery = supabaseQuery.lte('age_min', query.ageMax)
    }
    
    if (query.search) {
      supabaseQuery = supabaseQuery.or(`title.ilike.%${query.search}%,description.ilike.%${query.search}%`)
    }
    
    if (query.startDate) {
      supabaseQuery = supabaseQuery.gte('start_date', query.startDate)
    }
    
    // Add pagination
    const offset = query.cursor ? 1 : 0 // Skip cursor if provided
    supabaseQuery = supabaseQuery
      .order('start_date', { ascending: true })
      .range(offset, offset + query.limit)
    
    const { data: events, error } = await supabaseQuery
    
    if (error) throw error

    const hasMore = events && events.length > query.limit
    const items = hasMore ? events.slice(0, -1) : events || []
    const nextCursor = hasMore && items.length > 0 ? items[items.length - 1].id : null

    res.json({
      items,
      nextCursor,
      hasMore
    })
  } catch (error) {
    next(error)
  }
})

// GET /api/events/:id - Get single event
router.get('/:id', async (req, res, next) => {
  try {
    const { data: event, error } = await supabase
      .from('events')
      .select(`
        *,
        organizer:profiles!events_organizer_id_fkey(
          id,
          name,
          email
        )
      `)
      .eq('id', req.params.id)
      .single()

    if (error || !event) {
      throw new AppError('Event not found', 404)
    }

    // Increment view count
    await supabase
      .from('events')
      .update({ view_count: (event.view_count || 0) + 1 })
      .eq('id', req.params.id)

    res.json(event)
  } catch (error) {
    next(error)
  }
})

// POST /api/events - Create event
router.post('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const createEventSchema = z.object({
      title: z.string().min(3).max(200),
      description: z.string().min(10).max(5000),
      ageMin: z.number().min(0).max(18),
      ageMax: z.number().min(0).max(18),
      priceType: z.enum(['FREE', 'PAID', 'DONATION']),
      price: z.number().optional(),
      currency: z.string().default('PLN'),
      locationName: z.string(),
      address: z.string(),
      city: z.string(),
      lat: z.number(),
      lng: z.number(),
      startDate: z.string().transform(str => new Date(str)),
      endDate: z.string().transform(str => new Date(str)).optional(),
      category: z.enum(['WARSZTATY', 'SPEKTAKLE', 'SPORT', 'EDUKACJA', 'INNE']),
      imageUrls: z.array(z.string().url()).max(5),
      tags: z.array(z.string()).max(10),
    })

    const data = createEventSchema.parse(req.body)

    // Transform camelCase to snake_case for database
    const dbData = {
      title: data.title,
      description: data.description,
      age_min: data.ageMin,
      age_max: data.ageMax,
      price_type: data.priceType,
      price: data.price,
      currency: data.currency,
      location_name: data.locationName,
      address: data.address,
      city: data.city,
      lat: data.lat,
      lng: data.lng,
      start_date: data.startDate,
      end_date: data.endDate,
      category: data.category,
      image_urls: data.imageUrls,
      tags: data.tags,
      organizer_id: req.user!.id,
      organizer_name: req.user!.name || req.user!.email,
      source_url: `${process.env.NEXT_PUBLIC_APP_URL}/events/user-submitted`,
      status: 'DRAFT', // Requires moderation
    }

    const { data: event, error } = await supabase
      .from('events')
      .insert(dbData)
      .select()
      .single()
    
    if (error) throw error

    logger.info(`New event created: ${event.id} by temp user`)

    res.status(201).json(event)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(new AppError(error.errors[0].message, 400))
    }
    next(error)
  }
})

// PUT /api/events/:id - Update event
router.put('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const updateEventSchema = z.object({
      title: z.string().min(3).max(200).optional(),
      description: z.string().min(10).max(5000).optional(),
      ageMin: z.number().min(0).max(18).optional(),
      ageMax: z.number().min(0).max(18).optional(),
      priceType: z.enum(['FREE', 'PAID', 'DONATION']).optional(),
      price: z.number().optional(),
      currency: z.string().optional(),
      locationName: z.string().optional(),
      address: z.string().optional(),
      city: z.string().optional(),
      lat: z.number().optional(),
      lng: z.number().optional(),
      startDate: z.string().transform(str => new Date(str)).optional(),
      endDate: z.string().transform(str => new Date(str)).optional(),
      category: z.enum(['WARSZTATY', 'SPEKTAKLE', 'SPORT', 'EDUKACJA', 'INNE']).optional(),
      imageUrls: z.array(z.string().url()).max(5).optional(),
      tags: z.array(z.string()).max(10).optional(),
    })

    // First, verify ownership
    const { data: existingEvent, error: fetchError } = await supabase
      .from('events')
      .select('organizer_id, status')
      .eq('id', req.params.id)
      .single()

    if (fetchError || !existingEvent) {
      throw new AppError('Event not found', 404)
    }

    if (existingEvent.organizer_id !== req.user!.id) {
      throw new AppError('Not authorized to update this event', 403)
    }

    const data = updateEventSchema.parse(req.body)

    // Transform camelCase to snake_case for database
    const dbUpdates: any = {}
    
    if (data.title !== undefined) dbUpdates.title = data.title
    if (data.description !== undefined) dbUpdates.description = data.description
    if (data.ageMin !== undefined) dbUpdates.age_min = data.ageMin
    if (data.ageMax !== undefined) dbUpdates.age_max = data.ageMax
    if (data.priceType !== undefined) dbUpdates.price_type = data.priceType
    if (data.price !== undefined) dbUpdates.price = data.price
    if (data.currency !== undefined) dbUpdates.currency = data.currency
    if (data.locationName !== undefined) dbUpdates.location_name = data.locationName
    if (data.address !== undefined) dbUpdates.address = data.address
    if (data.city !== undefined) dbUpdates.city = data.city
    if (data.lat !== undefined) dbUpdates.lat = data.lat
    if (data.lng !== undefined) dbUpdates.lng = data.lng
    if (data.startDate !== undefined) dbUpdates.start_date = data.startDate
    if (data.endDate !== undefined) dbUpdates.end_date = data.endDate
    if (data.category !== undefined) dbUpdates.category = data.category
    if (data.imageUrls !== undefined) dbUpdates.image_urls = data.imageUrls
    if (data.tags !== undefined) dbUpdates.tags = data.tags

    // Add updated timestamp
    dbUpdates.updated_at = new Date()

    // If event was previously ACTIVE and has been modified, set back to DRAFT for re-moderation
    if (existingEvent.status === 'ACTIVE') {
      dbUpdates.status = 'DRAFT'
    }

    const { data: updatedEvent, error } = await supabase
      .from('events')
      .update(dbUpdates)
      .eq('id', req.params.id)
      .select()
      .single()
    
    if (error) throw error

    logger.info(`Event updated: ${updatedEvent.id} by user ${req.user!.id}`)

    res.json(updatedEvent)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(new AppError(error.errors[0].message, 400))
    }
    next(error)
  }
})

// POST /api/events/:id/click - Track click
router.post('/:id/click', async (req, res, next) => {
  try {
    // Get current click count
    const { data: event } = await supabase
      .from('events')
      .select('click_count')
      .eq('id', req.params.id)
      .single()
    
    // Update with incremented value
    await supabase
      .from('events')
      .update({ click_count: (event?.click_count || 0) + 1 })
      .eq('id', req.params.id)

    res.json({ success: true })
  } catch (error) {
    next(error)
  }
})

export default router