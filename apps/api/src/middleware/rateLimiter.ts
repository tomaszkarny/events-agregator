import rateLimit from 'express-rate-limit'

export const rateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: 'Too many requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
})

export const strictRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 10, // 10 requests per minute for sensitive endpoints
  message: 'Too many requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
})