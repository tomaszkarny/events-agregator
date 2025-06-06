import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { z } from 'zod'

// FIX: Add input validation schema
const syncRequestSchema = z.object({
  id: z.string().uuid('Invalid user ID format'),
  email: z.string().email('Invalid email format'),
  name: z.string().min(1).max(100).optional(),
})

// FIX: Simple rate limiting (in production, use Redis)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT_WINDOW = 60 * 1000 // 1 minute
const RATE_LIMIT_MAX = 10 // 10 requests per minute per IP

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const record = rateLimitMap.get(ip)
  
  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW })
    return true
  }
  
  if (record.count >= RATE_LIMIT_MAX) {
    return false
  }
  
  record.count++
  return true
}

export async function POST(req: NextRequest) {
  try {
    // FIX: Check rate limit
    const clientIP = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
    if (!checkRateLimit(clientIP)) {
      console.warn(`Rate limit exceeded for IP: ${clientIP}`)
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      )
    }

    // FIX: Validate request body
    let body
    try {
      body = await req.json()
    } catch (parseError) {
      console.error('Invalid JSON in request body')
      return NextResponse.json(
        { error: 'Invalid request format' },
        { status: 400 }
      )
    }

    // FIX: Validate input data
    const parseResult = syncRequestSchema.safeParse(body)
    if (!parseResult.success) {
      console.error('Validation failed:', parseResult.error.errors)
      return NextResponse.json(
        { 
          error: 'Invalid request data',
          details: parseResult.error.errors.map(e => e.message)
        },
        { status: 400 }
      )
    }

    const { id, email, name } = parseResult.data
    console.log('Sync request for user:', { id, email, name: name || 'undefined' })
    
    // Create server-side Supabase client (uses cookies)
    const supabase = await createClient()
    
    // Verify user with cookies
    let user
    try {
      const { data: { user: authUser }, error } = await supabase.auth.getUser()
      if (error) {
        console.error('Supabase auth error:', error.message)
        return NextResponse.json({ error: 'Unauthorized - authentication failed' }, { status: 401 })
      }
      
      user = authUser
    } catch (authError) {
      console.error('Supabase auth request failed:', authError)
      return NextResponse.json({ error: 'Authentication service unavailable' }, { status: 503 })
    }

    // FIX: More thorough user validation
    if (!user || !user.id || !user.email) {
      console.error('Invalid user data from Supabase:', { userId: user?.id, userEmail: user?.email })
      return NextResponse.json({ error: 'Unauthorized - invalid user data' }, { status: 401 })
    }

    if (user.id !== id) {
      console.error('Token user ID mismatch:', { tokenUserId: user.id, requestUserId: id })
      return NextResponse.json({ error: 'Unauthorized - user ID mismatch' }, { status: 403 })
    }

    if (user.email !== email) {
      console.error('User email mismatch:', { tokenEmail: user.email, requestEmail: email })
      return NextResponse.json({ error: 'Unauthorized - email mismatch' }, { status: 403 })
    }
    
    console.log('User verified successfully:', user.id)
    
    // FIX: Check database connection
    try {
      const { error: testError } = await supabase
        .from('profiles')
        .select('id')
        .limit(1)
      
      if (testError) throw testError
    } catch (dbConnectionError) {
      console.error('Database connection failed:', dbConnectionError)
      return NextResponse.json(
        { error: 'Database service unavailable' },
        { status: 503 }
      )
    }

    try {
      // Check if profile exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      
      let dbUser
      const profileData = {
        email: user.email,
        name: name || user.user_metadata?.name || user.email.split('@')[0] || 'User',
        last_login_at: new Date().toISOString()
      }
      
      if (existingProfile) {
        // Update existing profile
        const { data, error } = await supabase
          .from('profiles')
          .update(profileData)
          .eq('id', user.id)
          .select()
          .single()
        
        if (error) throw error
        dbUser = data
      } else {
        // Create new profile
        const { data, error } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            ...profileData
          })
          .select()
          .single()
        
        if (error) throw error
        dbUser = data
      }
      
      console.log('User synced with database:', dbUser.id)
      
      return NextResponse.json({ 
        success: true, 
        user: { 
          id: dbUser.id, 
          email: dbUser.email, 
          name: dbUser.name,
          synced: true,
          syncedAt: new Date().toISOString()
        }
      })
    } catch (dbError) {
      console.error('Database sync error:', dbError)
      
      // FIX: Don't expose internal database errors
      const errorMessage = dbError instanceof Error && dbError.message.includes('timeout')
        ? 'Database operation timed out'
        : 'Database sync failed'
      
      return NextResponse.json({ 
        success: false,
        error: errorMessage,
        user: { 
          id: user.id, 
          email: user.email, 
          name: name || user.user_metadata?.name,
          synced: false 
        }
      }, { status: 500 })
    }
  } catch (error) {
    console.error('Auth sync error:', error)
    
    // FIX: Don't expose internal errors to client
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}