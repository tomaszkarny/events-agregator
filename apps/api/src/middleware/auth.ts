import { Request, Response, NextFunction } from 'express'
import { createClient } from '@supabase/supabase-js'
import { AppError } from './errorHandler'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export interface AuthRequest extends Request {
  user?: {
    id: string
    email: string
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