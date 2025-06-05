import { Request, Response, NextFunction } from 'express'
import { createClient } from '@supabase/supabase-js'
import { AppError } from './errorHandler'
import dotenv from 'dotenv'

dotenv.config()

// IMPORTANT: Using anon key for user operations (security fix)
// Service role key should ONLY be used for admin operations
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
)

export interface AuthRequest extends Request {
  user?: {
    id: string
    email: string
    name?: string
    role: string
  }
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '')

    if (!token) {
      throw new AppError('No token provided', 401)
    }

    const { data: { user }, error } = await supabase.auth.getUser(token)

    if (error || !user) {
      throw new AppError('Invalid token', 401)
    }

    req.user = {
      id: user.id,
      email: user.email!,
      name: user.user_metadata?.name || user.email?.split('@')[0],
      role: user.user_metadata?.role || 'user'
    }

    next()
  } catch (error) {
    next(error)
  }
}

export const requireRole = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('Unauthorized', 401))
    }

    if (!roles.includes(req.user.role)) {
      return next(new AppError('Insufficient permissions', 403))
    }

    next()
  }
}