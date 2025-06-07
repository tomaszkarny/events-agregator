'use client'

import dynamic from 'next/dynamic'
import { useState, useEffect, useMemo } from 'react'
import { useLeaflet } from '@/hooks/use-leaflet'
import { validateCoordinates, formatCoordinate } from '@/utils/coordinate-validation'

// Dynamically import map components
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false })
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false })
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false })
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false })

interface LocationMapProps {
  latitude: number
  longitude: number
  title?: string
  address?: string
  className?: string
  showGoogleLink?: boolean
}

export function LocationMap({
  latitude,
  longitude,
  title = 'Lokalizacja',
  address,
  className = '',
  showGoogleLink = true
}: LocationMapProps) {
  const [isClient, setIsClient] = useState(false)
  const { L, isLoading, error } = useLeaflet()

  useEffect(() => {
    setIsClient(true)
  }, [])

  // Validate coordinates
  const coordinateValidation = useMemo(() => 
    validateCoordinates(latitude, longitude), 
    [latitude, longitude]
  )

  // Memoize Google Maps URL
  const googleMapsUrl = useMemo(() => 
    `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`,
    [latitude, longitude]
  )

  // Memoize custom icon to prevent recreation on every render
  const customIcon = useMemo(() => {
    if (!L) return null
    
    return L.divIcon({
      html: `
        <div style="
          background-color: #dc2626; 
          width: 24px; 
          height: 24px; 
          border-radius: 50% 50% 50% 0; 
          border: 3px solid white; 
          transform: rotate(-45deg);
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <div style="
            width: 8px; 
            height: 8px; 
            background-color: white; 
            border-radius: 50%; 
            transform: rotate(45deg);
          "></div>
        </div>
      `,
      className: 'custom-marker',
      iconSize: [24, 24],
      iconAnchor: [12, 24],
      popupAnchor: [0, -24]
    })
  }, [L])

  // Loading state
  if (!isClient || isLoading) {
    return (
      <div className={`h-64 bg-gray-100 rounded-lg flex items-center justify-center ${className}`}>
        <div className="text-center text-gray-500">
          <svg className="w-8 h-8 mx-auto mb-2 text-gray-400 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <p>Ładowanie mapy...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className={`h-64 bg-red-50 border border-red-200 rounded-lg flex items-center justify-center ${className}`}>
        <div className="text-center text-red-600">
          <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <p className="mb-2">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="text-sm bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
          >
            Odśwież stronę
          </button>
        </div>
      </div>
    )
  }

  // Invalid coordinates state
  if (!coordinateValidation.isValid) {
    return (
      <div className={`h-64 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center justify-center ${className}`}>
        <div className="text-center text-yellow-800">
          <svg className="w-12 h-12 mx-auto mb-2 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <p className="mb-1">Nieprawidłowe współrzędne</p>
          <p className="text-sm">{coordinateValidation.error}</p>
          {showGoogleLink && (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(title || 'Lokalizacja')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-2 text-blue-600 hover:underline text-sm"
            >
              Spróbuj wyszukać w Google Maps
            </a>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={className}>
      <MapContainer
        center={[latitude, longitude]}
        zoom={16}
        className="h-64 w-full rounded-lg"
        style={{ height: '256px' }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {customIcon && (
          <Marker position={[latitude, longitude]} icon={customIcon}>
            <Popup>
              <div className="text-center">
                <strong>{title}</strong>
                {address && (
                  <>
                    <br />
                    <small className="text-gray-600">{address}</small>
                  </>
                )}
                <br />
                <span className="text-xs font-mono">
                  {formatCoordinate(latitude)}, {formatCoordinate(longitude)}
                </span>
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>
      
      {showGoogleLink && (
        <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
          <span>📍 {formatCoordinate(latitude)}, {formatCoordinate(longitude)}</span>
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline flex items-center gap-1"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            </svg>
            Sprawdź w Google Maps
          </a>
        </div>
      )}
    </div>
  )
}