import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '@events-agregator/database'
import { AppError } from '../middleware/errorHandler'
import { authenticate, AuthRequest } from '../middleware/auth'
import { logger } from '../utils/logger'

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
    
    const where: any = {
      status: { in: ['ACTIVE', 'DRAFT'] }, // Show both active and draft events
    }

    if (query.city) where.city = query.city
    if (query.category) where.category = query.category
    if (query.priceType) where.priceType = query.priceType
    
    if (query.ageMin || query.ageMax) {
      where.AND = []
      if (query.ageMin) where.AND.push({ ageMax: { gte: query.ageMin } })
      if (query.ageMax) where.AND.push({ ageMin: { lte: query.ageMax } })
    }

    if (query.startDate) {
      where.startDate = { gte: new Date(query.startDate) }
    }

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ]
    }

    const events = await prisma.event.findMany({
      where,
      take: query.limit + 1,
      cursor: query.cursor ? { id: query.cursor } : undefined,
      orderBy: { startDate: 'asc' },
      select: {
        id: true,
        title: true,
        description: true,
        ageMin: true,
        ageMax: true,
        priceType: true,
        price: true,
        currency: true,
        locationName: true,
        address: true,
        city: true,
        lat: true,
        lng: true,
        startDate: true,
        endDate: true,
        category: true,
        imageUrls: true,
        tags: true,
        organizerName: true,
        status: true, // Add status to see DRAFT/ACTIVE
      }
    })

    const hasMore = events.length > query.limit
    const items = hasMore ? events.slice(0, -1) : events
    const nextCursor = hasMore ? items[items.length - 1].id : null

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
    const event = await prisma.event.findUnique({
      where: { id: req.params.id },
      include: {
        organizer: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    if (!event) {
      throw new AppError('Event not found', 404)
    }

    // Increment view count
    await prisma.event.update({
      where: { id: req.params.id },
      data: { viewCount: { increment: 1 } }
    })

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

    const event = await prisma.event.create({
      data: {
        ...data,
        organizerId: req.user!.id,
        organizerName: req.user!.name || req.user!.email,
        sourceUrl: `${process.env.NEXT_PUBLIC_APP_URL}/events/user-submitted`,
        status: 'DRAFT', // Requires moderation
      }
    })

    logger.info(`New event created: ${event.id} by temp user`)

    res.status(201).json(event)
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
    await prisma.event.update({
      where: { id: req.params.id },
      data: { clickCount: { increment: 1 } }
    })

    res.json({ success: true })
  } catch (error) {
    next(error)
  }
})

export default router