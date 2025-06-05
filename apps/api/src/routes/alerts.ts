import { Router } from 'express'
import { z } from 'zod'
import { createClient } from '@supabase/supabase-js'
import { AppError } from '../middleware/errorHandler'
import { authenticate, AuthRequest } from '../middleware/auth'

const router = Router()

// All routes require authentication
router.use(authenticate)

// GET /api/alerts - Get user's alerts
router.get('/', async (req: AuthRequest, res, next) => {
  try {
    const alerts = await prisma.alert.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' }
    })

    res.json(alerts)
  } catch (error) {
    next(error)
  }
})

// POST /api/alerts - Create alert
router.post('/', async (req: AuthRequest, res, next) => {
  try {
    const createAlertSchema = z.object({
      name: z.string().min(1).max(100),
      filters: z.object({
        cities: z.array(z.string()).optional(),
        categories: z.array(z.string()).optional(),
        ageMin: z.number().min(0).max(18).optional(),
        ageMax: z.number().min(0).max(18).optional(),
        keywords: z.array(z.string()).optional(),
        priceType: z.enum(['free', 'paid', 'any']).optional(),
      }),
      frequency: z.enum(['IMMEDIATE', 'DAILY', 'WEEKLY']),
      channels: z.array(z.enum(['PUSH', 'EMAIL', 'IN_APP'])).min(1),
    })

    const data = createAlertSchema.parse(req.body)

    // Check if user has PRO subscription for immediate alerts
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { subscriptionTier: true }
    })

    if (data.frequency === 'IMMEDIATE' && user?.subscriptionTier !== 'PRO') {
      throw new AppError('Immediate alerts require PRO subscription', 403)
    }

    // Check alert limit (max 10 per user)
    const alertCount = await prisma.alert.count({
      where: { userId: req.user!.id }
    })

    if (alertCount >= 10) {
      throw new AppError('Alert limit reached (max 10)', 400)
    }

    const alert = await prisma.alert.create({
      data: {
        ...data,
        userId: req.user!.id,
      }
    })

    res.status(201).json(alert)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(new AppError(error.errors[0].message, 400))
    }
    next(error)
  }
})

// PATCH /api/alerts/:id - Update alert
router.patch('/:id', async (req: AuthRequest, res, next) => {
  try {
    const updateAlertSchema = z.object({
      name: z.string().min(1).max(100).optional(),
      filters: z.object({
        cities: z.array(z.string()).optional(),
        categories: z.array(z.string()).optional(),
        ageMin: z.number().min(0).max(18).optional(),
        ageMax: z.number().min(0).max(18).optional(),
        keywords: z.array(z.string()).optional(),
        priceType: z.enum(['free', 'paid', 'any']).optional(),
      }).optional(),
      frequency: z.enum(['IMMEDIATE', 'DAILY', 'WEEKLY']).optional(),
      channels: z.array(z.enum(['PUSH', 'EMAIL', 'IN_APP'])).min(1).optional(),
      isActive: z.boolean().optional(),
    })

    const data = updateAlertSchema.parse(req.body)

    // Check ownership
    const alert = await prisma.alert.findFirst({
      where: {
        id: req.params.id,
        userId: req.user!.id
      }
    })

    if (!alert) {
      throw new AppError('Alert not found', 404)
    }

    const updated = await prisma.alert.update({
      where: { id: req.params.id },
      data
    })

    res.json(updated)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(new AppError(error.errors[0].message, 400))
    }
    next(error)
  }
})

// DELETE /api/alerts/:id - Delete alert
router.delete('/:id', async (req: AuthRequest, res, next) => {
  try {
    const alert = await prisma.alert.findFirst({
      where: {
        id: req.params.id,
        userId: req.user!.id
      }
    })

    if (!alert) {
      throw new AppError('Alert not found', 404)
    }

    await prisma.alert.delete({
      where: { id: req.params.id }
    })

    res.json({ success: true })
  } catch (error) {
    next(error)
  }
})

export default router