'use client'

import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { pl } from 'date-fns/locale'
import { sanitizeText } from '@/lib/sanitize'
import { useAuth } from '@/contexts/auth-context-v2'
import { useIsFavorited, useToggleFavorite } from '@/hooks/use-favorites'
import { useState } from 'react'

interface EventCardProps {
  event: {
    id: string
    title: string
    description: string
    locationName: string
    city: string
    startDate: string
    endDate?: string
    ageMin: number
    ageMax: number
    priceType: 'FREE' | 'PAID' | 'DONATION'
    price?: number
    category: string
    imageUrls?: string[]
    status: string
    organizerName?: string
  }
  favoriteTheme?: 'red' | 'blue' // Optional theme configuration
}

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
  REJECTED: { label: 'Odrzucone', class: 'bg-red-100 text-red-800' },
}

// Favorite theme configurations
const favoriteThemes = {
  red: {
    favoritedColors: 'text-red-500 hover:text-red-600 focus:text-red-600 bg-red-50 hover:bg-red-100 focus:bg-red-100',
    unfavoritedColors: 'text-gray-400 hover:text-red-500 focus:text-red-500 bg-white hover:bg-red-50 focus:bg-red-50',
    focusRing: 'focus:ring-red-500',
    countColor: 'text-red-600'
  },
  blue: {
    favoritedColors: 'text-blue-500 hover:text-blue-600 focus:text-blue-600 bg-blue-50 hover:bg-blue-100 focus:bg-blue-100',
    unfavoritedColors: 'text-gray-400 hover:text-blue-500 focus:text-blue-500 bg-white hover:bg-blue-50 focus:bg-blue-50',
    focusRing: 'focus:ring-blue-500',
    countColor: 'text-blue-600'
  }
}

export function EventCard({ event, favoriteTheme = 'red' }: EventCardProps) {
  const startDate = new Date(event.startDate)
  const { user } = useAuth()
  const { isFavorited, isLoading: isFavoriteLoading } = useIsFavorited(event.id)
  const toggleFavorite = useToggleFavorite()
  const [isToggling, setIsToggling] = useState(false)
  
  // Status-based approach (consistent with filtering)
  const isExpired = event.status === 'EXPIRED'
  
  const categoryClass = categoryColors[event.category as keyof typeof categoryColors] || categoryColors.INNE
  const statusBadge = statusBadges[event.status as keyof typeof statusBadges]
  const theme = favoriteThemes[favoriteTheme]

  const handleToggleFavorite = async (e: React.MouseEvent | React.KeyboardEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!user || isToggling) return
    
    setIsToggling(true)
    try {
      await toggleFavorite.mutateAsync({
        eventId: event.id,
        eventData: event // Pass full event data for complete optimistic updates
      })
    } finally {
      setIsToggling(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Handle Enter and Space keys for accessibility
    if (e.key === 'Enter' || e.key === ' ') {
      handleToggleFavorite(e)
    }
  }

  return (
    <Link href={`/events/${event.id}`} className="block">
      <div className={`bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6 h-full cursor-pointer relative ${isExpired ? 'opacity-60' : ''}`}>
        {/* Favorite Heart Icon - Only for authenticated users */}
        {user && (
          <button
            onClick={handleToggleFavorite}
            onKeyDown={handleKeyDown}
            disabled={isToggling || isFavoriteLoading}
            className={`absolute top-4 right-4 z-10 p-2 rounded-full transition-all duration-200 focus:outline-none focus:ring-2 ${theme.focusRing} focus:ring-offset-2 ${
              isToggling || isFavoriteLoading ? 'scale-75' : 'hover:scale-110 focus:scale-110'
            } ${
              isFavoriteLoading ? 'animate-pulse' : ''
            } ${
              isFavorited 
                ? theme.favoritedColors
                : `${theme.unfavoritedColors} shadow-sm`
            }`}
            aria-label={isFavorited ? 'Usuń z ulubionych' : 'Dodaj do ulubionych'}
            tabIndex={0}
          >
            <svg
              className="w-5 h-5"
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
          </button>
        )}

        {/* Status badges */}
        {(event.status === 'DRAFT' || isExpired) && (
          <div className="mb-3 flex gap-2 flex-wrap">
            {event.status === 'DRAFT' && (
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusBadge.class}`}>
                🕐 {statusBadge.label}
              </span>
            )}
            {isExpired && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                ⏰ Zakończone
              </span>
            )}
          </div>
        )}

        {/* Image */}
        {event.imageUrls && event.imageUrls.length > 0 && (
          <img 
            src={event.imageUrls[0]} 
            alt={event.title}
            className="w-full h-48 object-cover rounded-md mb-4"
          />
        )}

        {/* Category & Age */}
        <div className="flex justify-between items-start mb-3">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${categoryClass}`}>
            {event.category.charAt(0) + event.category.slice(1).toLowerCase()}
          </span>
          <span className="text-sm text-gray-600">
            {event.ageMin}-{event.ageMax} lat
          </span>
        </div>

        {/* Title */}
        <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
          {sanitizeText(event.title)}
        </h3>

        {/* Description */}
        <p className="text-gray-600 text-sm mb-4 line-clamp-3">
          {sanitizeText(event.description)}
        </p>

        {/* Location & Date */}
        <div className="space-y-2 text-sm text-gray-500">
          <div className="flex items-center">
            <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {sanitizeText(event.locationName)}, {sanitizeText(event.city)}
          </div>
          <div className="flex items-center">
            <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {startDate.toLocaleDateString('pl-PL', { 
              weekday: 'short',
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </div>
        </div>

        {/* Price */}
        <div className="mt-4 flex justify-between items-center">
          <span className={`font-medium ${
            event.priceType === 'FREE' ? 'text-green-600' : 'text-gray-900'
          }`}>
            {event.priceType === 'FREE' ? 'Bezpłatne' : 
             event.priceType === 'PAID' ? `${event.price} zł` : 
             'Darowizna'}
          </span>
          {event.organizerName && (
            <span className="text-xs text-gray-500">
              przez {sanitizeText(event.organizerName)}
            </span>
          )}
        </div>

      </div>
    </Link>
  )
}