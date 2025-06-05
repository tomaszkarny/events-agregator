import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { EventDetailsClient } from './event-details-client'
import { getEvent } from '@/lib/supabase-queries'

interface EventPageProps {
  params: Promise<{ id: string }>
}

// Generate metadata for SEO and social sharing
export async function generateMetadata({ params }: EventPageProps): Promise<Metadata> {
  const { id } = await params
  
  try {
    const event = await getEvent(id)
    
    if (!event) {
      return {
        title: 'Wydarzenie nie znalezione',
        description: 'To wydarzenie nie istnieje lub zostało usunięte.'
      }
    }
    
    const title = `${event.title} | Agregator Wydarzeń dla Dzieci`
    const description = event.description.slice(0, 160)
    const imageUrl = event.imageUrls?.[0] || '/og-default.jpg'
    
    return {
      title,
      description,
      openGraph: {
        title: event.title,
        description,
        type: 'website',
        locale: 'pl_PL',
        url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/events/${id}`,
        siteName: 'Agregator Wydarzeń dla Dzieci',
        images: [
          {
            url: imageUrl,
            width: 1200,
            height: 630,
            alt: event.title,
          }
        ],
      },
      twitter: {
        card: 'summary_large_image',
        title: event.title,
        description,
        images: [imageUrl],
      },
    }
  } catch (error) {
    console.error('Error generating metadata:', error)
    return {
      title: 'Wydarzenie',
      description: 'Agregator wydarzeń dla dzieci w Twojej okolicy'
    }
  }
}

// Server Component - fetches data
export default async function EventPage({ params }: EventPageProps) {
  const { id } = await params
  
  let event
  let error
  
  try {
    event = await getEvent(id)
  } catch (e) {
    error = e
    console.error('Error fetching event:', e)
  }
  
  if (error || !event) {
    notFound()
  }
  
  // Pass data to Client Component for interactivity
  return <EventDetailsClient event={event} />
}