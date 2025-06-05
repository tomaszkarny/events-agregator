import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { prisma } from '@events-agregator/database'

export async function GET(req: NextRequest) {
  try {
    console.log('=== MY EVENTS API CALLED ===')
    
    // Create server-side Supabase client (uses cookies automatically)
    const supabase = await createClient()
    
    console.log('Getting user from server-side Supabase...')
    
    // Use getUser() for server-side authentication (more secure)
    const { data: { user }, error } = await supabase.auth.getUser()
    
    console.log('Supabase verification result:')
    console.log('- Error:', error?.message || 'none')
    console.log('- User:', user?.email || 'none')
    
    if (error || !user) {
      console.log('❌ User not authenticated')
      return NextResponse.json({ error: 'Unauthorized', details: error?.message }, { status: 401 })
    }
    
    console.log('✅ User authenticated:', user.email)
    
    // Get user's events from database
    const events = await prisma.event.findMany({
      where: {
        organizerId: user.id
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
    
    // Calculate stats
    const stats = {
      total: events.length,
      draft: events.filter(e => e.status === 'DRAFT').length,
      active: events.filter(e => e.status === 'ACTIVE').length,
      expired: events.filter(e => e.status === 'EXPIRED').length,
      totalViews: events.reduce((sum, e) => sum + e.viewCount, 0),
      totalClicks: events.reduce((sum, e) => sum + e.clickCount, 0),
    }
    
    return NextResponse.json({ 
      events,
      stats,
      user: {
        id: user.id,
        email: user.email
      }
    })
    
  } catch (error) {
    console.error('Error fetching user events:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}