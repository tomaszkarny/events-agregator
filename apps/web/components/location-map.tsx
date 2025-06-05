'use client'

import { useState } from 'react'

interface LocationMapProps {
  locationName: string
  address: string
  city: string
  lat: number | string
  lng: number | string
  postalCode?: string
}

export function LocationMap({ 
  locationName, 
  address, 
  city, 
  lat, 
  lng, 
  postalCode 
}: LocationMapProps) {
  const [mapLoaded, setMapLoaded] = useState(false)
  const [mapError, setMapError] = useState(false)

  // Convert to numbers and validate coordinates
  const latitude = typeof lat === 'string' ? parseFloat(lat) : lat
  const longitude = typeof lng === 'string' ? parseFloat(lng) : lng

  // Check if coordinates are valid
  const hasValidCoords = 
    !isNaN(latitude) && 
    !isNaN(longitude) && 
    latitude >= -90 && 
    latitude <= 90 && 
    longitude >= -180 && 
    longitude <= 180

  if (!hasValidCoords) {
    return (
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-start text-gray-700">
          <svg className="h-5 w-5 mr-3 text-gray-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <div className="flex-1">
            <p className="font-medium">{locationName}</p>
            <p className="text-sm text-gray-600">{address}</p>
            <p className="text-sm text-gray-600">
              {city}{postalCode && `, ${postalCode}`}
            </p>
            <a 
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${locationName} ${address} ${city}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:text-blue-800 mt-2 inline-flex items-center"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Zobacz na Google Maps
            </a>
          </div>
        </div>
      </div>
    )
  }

  // Generate map URL for embedded iframe
  const mapUrl = `https://www.google.com/maps/embed/v1/place?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || 'demo'}&q=${latitude},${longitude}&zoom=15&maptype=roadmap`
  
  // Fallback URL if no API key
  const fallbackUrl = `https://maps.google.com/maps?q=${latitude},${longitude}&t=&z=15&ie=UTF8&iwloc=&output=embed`

  const iframeUrl = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ? mapUrl : fallbackUrl

  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <div className="flex items-start text-gray-700 mb-4">
        <svg className="h-5 w-5 mr-3 text-gray-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <div className="flex-1">
          <p className="font-medium">{locationName}</p>
          <p className="text-sm text-gray-600">{address}</p>
          <p className="text-sm text-gray-600">
            {city}{postalCode && `, ${postalCode}`}
          </p>
        </div>
      </div>

      {/* Embedded Map */}
      <div className="relative">
        {!mapLoaded && !mapError && (
          <div className="absolute inset-0 bg-gray-200 rounded-lg flex items-center justify-center z-10">
            <div className="text-center text-gray-500">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-500 mx-auto mb-2"></div>
              <p className="text-sm">Ładowanie mapy...</p>
            </div>
          </div>
        )}
        
        {mapError && (
          <div className="bg-gray-200 rounded-lg h-64 flex items-center justify-center">
            <div className="text-center text-gray-500">
              <svg className="mx-auto h-12 w-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm">Nie można załadować mapy</p>
            </div>
          </div>
        )}

        <iframe
          src={iframeUrl}
          width="100%"
          height="256"
          style={{ border: 0 }}
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          className="rounded-lg"
          title={`Mapa lokalizacji: ${locationName}`}
          onLoad={() => setMapLoaded(true)}
          onError={() => {
            setMapError(true)
            setMapLoaded(true)
          }}
        />
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2 mt-4">
        <a 
          href={`https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          Otwórz w Google Maps
        </a>
        
        <a 
          href={`https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center px-3 py-2 text-sm font-medium text-green-600 bg-green-50 rounded-md hover:bg-green-100 transition-colors"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
          Nawiguj
        </a>

        {/* Copy coordinates */}
        <button
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(`${latitude}, ${longitude}`)
              // You would need to import toast from your toast library
              // toast.success('Współrzędne skopiowane!')
            } catch (error) {
              console.error('Failed to copy coordinates:', error)
            }
          }}
          className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-600 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          Kopiuj współrzędne
        </button>
      </div>
    </div>
  )
}