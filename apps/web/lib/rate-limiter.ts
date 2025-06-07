import { NextRequest } from 'next/server'

interface RateLimitOptions {
  windowMs?: number // Time window in milliseconds
  max?: number // Max requests per window
}

// Simple in-memory rate limiter (for production, use Redis)
const requestCounts = new Map<string, { count: number; resetTime: number }>()

export async function rateLimit(
  request: NextRequest,
  options: RateLimitOptions = {}
) {
  const { windowMs = 60000, max = 10 } = options // Default: 10 requests per minute
  
  // Get client identifier (IP or user ID)
  const clientId = request.headers.get('x-forwarded-for') || 
                   request.headers.get('x-real-ip') || 
                   'anonymous'
  
  const now = Date.now()
  const windowStart = now - windowMs
  
  // Clean up old entries
  for (const [key, value] of requestCounts.entries()) {
    if (value.resetTime < now) {
      requestCounts.delete(key)
    }
  }
  
  // Get or create client record
  let clientRecord = requestCounts.get(clientId)
  
  if (!clientRecord || clientRecord.resetTime < now) {
    clientRecord = {
      count: 0,
      resetTime: now + windowMs
    }
    requestCounts.set(clientId, clientRecord)
  }
  
  // Check if limit exceeded
  if (clientRecord.count >= max) {
    const retryAfter = Math.ceil((clientRecord.resetTime - now) / 1000)
    throw new RateLimitError(`Too many requests. Please try again in ${retryAfter} seconds.`, retryAfter)
  }
  
  // Increment count
  clientRecord.count++
}

export class RateLimitError extends Error {
  constructor(message: string, public retryAfter: number) {
    super(message)
    this.name = 'RateLimitError'
  }
}