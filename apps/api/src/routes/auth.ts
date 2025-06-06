import { Router } from 'express'
import { z } from 'zod'
import { createClient } from '@supabase/supabase-js'
import { AppError } from '../middleware/errorHandler'
import { authenticate, AuthRequest } from '../middleware/auth'
import { authRateLimiter, passwordResetRateLimiter } from '../middleware/rateLimiter'
import dotenv from 'dotenv'

dotenv.config()

const router = Router()

// Using anon key for auth operations (security fix)
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
)

// POST /api/auth/register
router.post('/register', authRateLimiter, async (req, res, next) => {
  try {
    const registerSchema = z.object({
      email: z.string().email(),
      password: z.string().min(8),
      name: z.string().optional(),
    })

    const { email, password, name } = registerSchema.parse(req.body)

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name }
      }
    })

    if (authError) {
      throw new AppError(authError.message, 400)
    }

    // Profile is created automatically by database trigger

    res.status(201).json({
      user: {
        id: authData.user?.id,
        email: authData.user?.email || email,
        name: name || authData.user?.user_metadata?.name,
      },
      session: authData.session
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(new AppError(error.errors[0].message, 400))
    }
    next(error)
  }
})

// POST /api/auth/login
router.post('/login', authRateLimiter, async (req, res, next) => {
  try {
    const loginSchema = z.object({
      email: z.string().email(),
      password: z.string(),
    })

    const { email, password } = loginSchema.parse(req.body)

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      throw new AppError('Invalid credentials', 401)
    }

    // Update last login
    await supabase
      .from('profiles')
      .update({ last_login_at: new Date() })
      .eq('id', data.user.id)

    res.json({
      user: {
        id: data.user.id,
        email: data.user.email,
      },
      session: data.session
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(new AppError(error.errors[0].message, 400))
    }
    next(error)
  }
})

// GET /api/auth/profile
router.get('/profile', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { data: user, error } = await supabase
      .from('profiles')
      .select(`
        *,
        child_profiles(*),
        subscriptions(*)
      `)
      .eq('id', req.user!.id)
      .single()

    if (error || !user) {
      throw new AppError('User not found', 404)
    }

    res.json(user)
  } catch (error) {
    next(error)
  }
})

// POST /api/auth/logout
router.post('/logout', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '')
    
    const { error } = await supabase.auth.signOut()
    
    if (error) {
      throw new AppError(error.message, 400)
    }

    res.json({ success: true })
  } catch (error) {
    next(error)
  }
})

export default router