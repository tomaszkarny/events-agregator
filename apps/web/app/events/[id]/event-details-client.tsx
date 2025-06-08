'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import { pl } from 'date-fns/locale'
import { Header } from '@/components/header'
import { ImageGallery } from '@/components/image-gallery'
import { LocationMap } from '@/components/location-map'
import { ShareButtons } from '@/components/share-buttons'
import { trackEventClick } from '@/lib/supabase-queries'
import { toast } from '@/lib/toast'
import { useAuth } from '@/contexts/auth-context-v2'
import { useIsFavorited, useToggleFavorite } from '@/hooks/use-favorites'
import { EventApiResponse } from '@/lib/types'

const categoryColors = {
  WARSZTATY: 'bg-purple-100 text-purple-800',
  SPEKTAKLE: 'bg-pink-100 text-pink-800',
  SPORT: 'bg-green-100 text-green-800',
  EDUKACJA: 'bg-blue-100 text-blue-800',
  INNE: 'bg-gray-100 text-gray-800',
}

const statusBadges = {
  DRAFT: { label: 'Oczekuje na moderację', class: 'bg-yellow-100 text-yellow-800' },
  ACTIVE: { label: 'Aktywne', class: 'bg-green-100 text-green-800' },
  EXPIRED: { label: 'Zakończone', class: 'bg-gray-100 text-gray-800' },
}

interface EventDetailsClientProps {
  event: EventApiResponse
}

export function EventDetailsClient({ event }: EventDetailsClientProps) {
  const router = useRouter()
  const { user } = useAuth()
  const { isFavorited, isLoading: isFavoriteLoading } = useIsFavorited(event.id)
  const toggleFavorite = useToggleFavorite()
  const [isToggling, setIsToggling] = useState(false)

  const handleClick = async () => {
    try {
      await trackEventClick(event.id)
    } catch (error) {
      // Silent fail for analytics
    }
  }

  const handleToggleFavorite = async () => {
    if (!user) {
      toast.error('Musisz być zalogowany aby dodać do ulubionych')
      return
    }
    
    if (isToggling) return
    
    setIsToggling(true)
    try {
      await toggleFavorite.mutateAsync({
        eventId: event.id,
        eventData: event
      })
    } finally {
      setIsToggling(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleToggleFavorite()
    }
  }

  const startDate = new Date(event.startDate)
  const endDate = event.endDate ? new Date(event.endDate) : null
  const isExpired = startDate < new Date()
  const categoryClass = categoryColors[event.category as keyof typeof categoryColors] || categoryColors.INNE
  const statusBadge = statusBadges[event.status as keyof typeof statusBadges]

  return (
    <main className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="mb-6 text-blue-600 hover:text-blue-800 flex items-center"
        >
          ← Wróć
        </button>

        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Status banner for DRAFT */}
          {event.status === 'DRAFT' && (
            <div className="bg-yellow-50 border-b border-yellow-200 px-6 py-3">
              <div className="flex items-center">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusBadge.class}`}>
                  🕐 {statusBadge.label}
                </span>
                <span className="ml-3 text-sm text-yellow-800">
                  To wydarzenie jest widoczne publicznie, ale czeka na weryfikację przez moderatora.
                </span>
              </div>
            </div>
          )}

          {/* Image Gallery */}
          <ImageGallery 
            images={event.imageUrls || []} 
            title={event.title} 
          />

          <div className="p-6 md:p-8">
            {/* Category and Age */}
            <div className="flex flex-wrap gap-2 mb-4">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${categoryClass}`}>
                {event.category.charAt(0) + event.category.slice(1).toLowerCase()}
              </span>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                👶 {event.ageMin}-{event.ageMax} lat
              </span>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                event.priceType === 'FREE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
              }`}>
                💰 {event.priceType === 'FREE' ? 'Bezpłatne' : 
                   event.priceType === 'PAID' ? `${event.price} zł` : 
                   'Darowizna'}
              </span>
            </div>

            {/* Title */}
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {event.title}
            </h1>

            {/* Organizer */}
            {event.organizerName && (
              <p className="text-gray-600 mb-6">
                Organizator: <span className="font-medium">{event.organizerName}</span>
              </p>
            )}

            {/* Date and Time */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="flex items-center text-gray-700 mb-2">
                <svg className="h-5 w-5 mr-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <div>
                  <p className="font-medium">
                    {startDate.toLocaleDateString('pl-PL', { 
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                  <p className="text-sm text-gray-600">
                    {startDate.toLocaleTimeString('pl-PL', { 
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                    {endDate && ` - ${endDate.toLocaleTimeString('pl-PL', { 
                      hour: '2-digit',
                      minute: '2-digit'
                    })}`}
                  </p>
                  {!isExpired && (
                    <p className="text-sm text-blue-600 mt-1">
                      {formatDistanceToNow(startDate, { addSuffix: true, locale: pl })}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Location with Interactive Map */}
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-3">Lokalizacja</h2>
              <div className="bg-white rounded-lg p-4 shadow-sm border">
                <div className="mb-4">
                  <h3 className="font-medium text-gray-900">{event.locationName}</h3>
                  <p className="text-gray-600">{event.address || 'Adres niedostępny'}</p>
                </div>
                {event.lat && event.lng && (
                  <>
                    <LocationMap 
                      latitude={event.lat}
                      longitude={event.lng}
                      title={event.locationName}
                      address={event.address || ''}
                      showGoogleLink={true}
                    />
                  </>
                )}
              </div>
            </div>

            {/* Description */}
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-3">Opis wydarzenia</h2>
              <div className="prose prose-gray max-w-none">
                <p className="whitespace-pre-wrap text-gray-700">
                  {event.description}
                </p>
              </div>
            </div>

            {/* Tags */}
            {event.tags && event.tags.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-medium mb-2">Tagi</h3>
                <div className="flex flex-wrap gap-2">
                  {event.tags.map((tag: string, index: number) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-700"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Share Buttons */}
            <ShareButtons 
              title={event.title}
              description={event.description}
              url={typeof window !== 'undefined' ? window.location.href : `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/events/${event.id}`}
              imageUrl={event.imageUrls?.[0]}
            />

            {/* Action buttons */}
            <div className="flex flex-wrap gap-3 mt-8 pt-6">
              <button
                onClick={() => {
                  handleClick()
                  if (event.sourceUrl) {
                    window.open(event.sourceUrl, '_blank')
                  } else {
                    toast.info('Link do źródła niedostępny')
                  }
                }}
                className="flex-1 sm:flex-none px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                🔗 Przejdź do źródła
              </button>
              <button
                onClick={() => {
                  const url = window.location.href
                  navigator.clipboard.writeText(url)
                  toast.success('Link skopiowany!')
                }}
                className="flex-1 sm:flex-none px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-medium"
              >
                📋 Skopiuj link
              </button>
              {user ? (
                <button
                  onClick={handleToggleFavorite}
                  onKeyDown={handleKeyDown}
                  disabled={isToggling || isFavoriteLoading}
                  className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                    isToggling || isFavoriteLoading ? 'scale-95' : 'hover:scale-105 focus:scale-105'
                  } ${
                    isFavoriteLoading ? 'animate-pulse' : ''
                  } ${
                    isFavorited 
                      ? 'bg-red-100 text-red-700 hover:bg-red-200 focus:bg-red-200 focus:ring-red-500' 
                      : 'bg-gray-200 text-gray-800 hover:bg-gray-300 focus:bg-gray-300 focus:ring-gray-500'
                  }`}
                  aria-label={isFavorited ? 'Usuń z ulubionych' : 'Dodaj do ulubionych'}
                  tabIndex={0}
                >
                  {isToggling ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {isFavorited ? 'Usuwanie...' : 'Dodawanie...'}
                    </span>
                  ) : (
                    <>
                      <svg
                        className="w-5 h-5 inline mr-2"
                        fill={isFavorited ? 'currentColor' : 'none'}
                        stroke="currentColor"
                        strokeWidth={2}
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M21 8.5c0-2.485-2.015-4.5-4.5-4.5-1.74 0-3.25.99-4 2.439A4.487 4.487 0 008.5 4C6.015 4 4 6.015 4 8.5c0 .886.256 1.714.7 2.414L12 21l7.3-10.086A4.486 4.486 0 0021 8.5z"
                        />
                      </svg>
                      {isFavorited ? 'Usuń z ulubionych' : 'Dodaj do ulubionych'}
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={() => {
                    toast.error('Musisz być zalogowany aby dodać do ulubionych')
                  }}
                  className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-medium focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                  aria-label="Zaloguj się aby dodać do ulubionych"
                >
                  <svg
                    className="w-5 h-5 inline mr-2"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M21 8.5c0-2.485-2.015-4.5-4.5-4.5-1.74 0-3.25.99-4 2.439A4.487 4.487 0 008.5 4C6.015 4 4 6.015 4 8.5c0 .886.256 1.714.7 2.414L12 21l7.3-10.086A4.486 4.486 0 0021 8.5z"
                    />
                  </svg>
                  Dodaj do ulubionych
                </button>
              )}
            </div>

            {/* Stats */}
            <div className="mt-6 text-sm text-gray-500 text-center">
              👁️ {event.viewCount} wyświetleń · 🖱️ {event.clickCount} kliknięć
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}