import { Router } from 'express'
import { z } from 'zod'
import { createClient } from '@supabase/supabase-js'
import { AppError } from '../middleware/errorHandler'
import { authenticate, AuthRequest } from '../middleware/auth'
import dotenv from 'dotenv'

dotenv.config()

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const router = Router()

// All routes require authentication
router.use(authenticate)

// GET /api/alerts - Get user's alerts
router.get('/', async (req: AuthRequest, res, next) => {
  try {
    const { data: alerts, error } = await supabase
      .from('alerts')
      .select('*')
      .eq('user_id', req.user!.id)
      .order('created_at', { ascending: false })

    if (error) throw error
    res.json(alerts || [])
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
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', req.user!.id)
      .single()

    if (data.frequency === 'IMMEDIATE' && profile?.subscription_tier !== 'PRO') {
      throw new AppError('Immediate alerts require PRO subscription', 403)
    }

    // Check alert limit (max 10 per user)
    const { count } = await supabase
      .from('alerts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.user!.id)

    if ((count || 0) >= 10) {
      throw new AppError('Alert limit reached (max 10)', 400)
    }

    const { data: alert, error } = await supabase
      .from('alerts')
      .insert({
        name: data.name,
        filters: data.filters,
        frequency: data.frequency,
        channels: data.channels,
        user_id: req.user!.id,
        is_active: true
      })
      .select()
      .single()
    
    if (error) throw error

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

    // Check ownership and update
    const { data: alert } = await supabase
      .from('alerts')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', req.user!.id)
      .single()

    if (!alert) {
      throw new AppError('Alert not found', 404)
    }

    const { data: updated, error } = await supabase
      .from('alerts')
      .update({
        name: data.name || alert.name,
        filters: data.filters || alert.filters,
        frequency: data.frequency || alert.frequency,
        channels: data.channels || alert.channels,
        is_active: data.isActive !== undefined ? data.isActive : alert.is_active
      })
      .eq('id', req.params.id)
      .select()
      .single()
    
    if (error) throw error

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
    const { data: alert } = await supabase
      .from('alerts')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', req.user!.id)
      .single()

    if (!alert) {
      throw new AppError('Alert not found', 404)
    }

    const { error } = await supabase
      .from('alerts')
      .delete()
      .eq('id', req.params.id)
    
    if (error) throw error

    res.json({ success: true })
  } catch (error) {
    next(error)
  }
})

export default router