import { Router } from 'express'
import { z } from 'zod'
import { createClient } from '@supabase/supabase-js'
import { prisma } from '@events-agregator/database'
import { AppError } from '../middleware/errorHandler'
import { authenticate, AuthRequest } from '../middleware/auth'

const router = Router()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// POST /api/auth/register
router.post('/register', async (req, res, next) => {
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

    // Create database user
    const user = await prisma.user.create({
      data: {
        id: authData.user!.id,
        email,
        name,
      }
    })

    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
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
router.post('/login', async (req, res, next) => {
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
    await prisma.user.update({
      where: { id: data.user.id },
      data: { lastLoginAt: new Date() }
    })

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
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: {
        childProfiles: true,
        subscription: true,
      }
    })

    if (!user) {
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