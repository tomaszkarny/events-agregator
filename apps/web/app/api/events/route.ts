import { NextRequest, NextResponse } from 'next/server'
import { searchEvents } from '@/lib/supabase-queries'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    
    const params = {
      city: searchParams.get('city') || undefined,
      category: searchParams.get('category') || undefined,
      ageMin: searchParams.get('ageMin') ? parseInt(searchParams.get('ageMin')!) : undefined,
      ageMax: searchParams.get('ageMax') ? parseInt(searchParams.get('ageMax')!) : undefined,
      priceType: searchParams.get('priceType') || undefined,
      search: searchParams.get('search') || undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 25,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0,
    }

    const result = await searchEvents(params)
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error searching events:', error)
    return NextResponse.json(
      { error: 'Failed to search events' },
      { status: 500 }
    )
  }
}