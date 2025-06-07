'use client'

import dynamic from 'next/dynamic'
import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import type { LeafletEvent } from 'leaflet'
import { useLeaflet } from '@/hooks/use-leaflet'
import { validateCoordinates, formatCoordinate } from '@/utils/coordinate-validation'

// Dynamically import all map components to avoid SSR issues
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false })
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false })
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false })
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false })
// Constants for map updates
const UPDATE_THRESHOLD = 0.0001 // ~10m coordinate difference (more sensitive)
const ANIMATION_DURATION = 1     // 1 second smooth transition

// Helper component to capture map instance
const MapRefSetter = dynamic(() => 
  import('react-leaflet').then(mod => {
    const { useMap } = mod
    
    return function MapRefSetter({ mapRef }: { mapRef: React.MutableRefObject<any> }) {
      const map = useMap()
      
      useEffect(() => {
        if (map) {
          mapRef.current = map
          console.log('✅ Map instance captured via useMap')
        }
      }, [map, mapRef])
      
      return null
    }
  }), 
  { ssr: false }
)

interface DraggableMapProps {
  latitude: number
  longitude: number
  onLocationChange: (lat: number, lng: number) => void
  locationName?: string
  className?: string
}

// Extract DraggableMarker as a separate component to fix hooks violations
interface DraggableMarkerProps {
  latitude: number
  longitude: number
  onLocationChange: (lat: number, lng: number) => void
  locationName: string
  L: typeof import('leaflet') | null
}

function DraggableMarker({ latitude, longitude, onLocationChange, locationName, L }: DraggableMarkerProps) {
  const [position, setPosition] = useState<[number, number]>([latitude, longitude])

  // Update position when props change
  useEffect(() => {
    setPosition([latitude, longitude])
  }, [latitude, longitude])

  // Memoize custom icon to prevent recreation on every render
  const customIcon = useMemo(() => {
    if (!L) return undefined
    
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

  // Throttled drag handler to improve performance
  const throttledDragHandler = useCallback((e: LeafletEvent) => {
    const marker = e.target as L.Marker
    const newPos = marker.getLatLng()
    const newLat = Number(newPos.lat.toFixed(6))
    const newLng = Number(newPos.lng.toFixed(6))
    
    // Validate coordinates before updating
    const validation = validateCoordinates(newLat, newLng)
    if (validation.isValid) {
      setPosition([newLat, newLng])
      onLocationChange(newLat, newLng)
    } else {
      console.warn('Invalid coordinates during drag:', validation.error)
    }
  }, [onLocationChange])

  const eventHandlers = useMemo(() => ({
    dragend: throttledDragHandler,
  }), [throttledDragHandler])

  if (!L || !customIcon) return null

  return (
    <Marker
      position={position}
      draggable={true}
      eventHandlers={eventHandlers}
      icon={customIcon}
    >
      <Popup>
        <div className="text-center">
          <strong>{locationName}</strong>
          <br />
          <small className="text-gray-600">
            Przeciągnij marker aby dostosować lokalizację
          </small>
          <br />
          <span className="text-xs font-mono">
            {formatCoordinate(position[0])}, {formatCoordinate(position[1])}
          </span>
        </div>
      </Popup>
    </Marker>
  )
}

export function DraggableMap({
  latitude,
  longitude,
  onLocationChange,
  locationName = 'Lokalizacja wydarzenia',
  className = ''
}: DraggableMapProps) {
  const [isClient, setIsClient] = useState(false)
  const mapRef = useRef<any>(null)
  const { L, isLoading, error } = useLeaflet()

  // Only render on client side to avoid SSR issues
  useEffect(() => {
    setIsClient(true)
  }, [])


  // Update map center when coordinates change
  useEffect(() => {
    console.log('📍 Coordinates changed:', latitude, longitude)
    
    if (!mapRef.current) {
      console.log('⚠️ Map ref not available yet')
      return
    }
    
    if (latitude === 0 && longitude === 0) {
      console.log('⚠️ Skipping invalid 0,0 coordinates')
      return
    }
    
    try {
      const currentCenter = mapRef.current.getCenter()
      const distance = Math.abs(currentCenter.lat - latitude) + 
                      Math.abs(currentCenter.lng - longitude)
      
      console.log('📏 Distance from current center:', distance)
      
      if (distance > UPDATE_THRESHOLD) {
        console.log('🗺️ Updating map center to:', latitude, longitude)
        mapRef.current.setView([latitude, longitude], mapRef.current.getZoom(), {
          animate: true,
          duration: ANIMATION_DURATION
        })
      } else {
        console.log('✨ Coordinates too close, skipping update')
      }
    } catch (error) {
      console.error('❌ Failed to update map center:', error)
    }
  }, [latitude, longitude])

  // Validate coordinates
  const coordinateValidation = useMemo(() => 
    validateCoordinates(latitude, longitude), 
    [latitude, longitude]
  )

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
          <p className="text-xs mt-2">Wybierz adres aby zobaczyć mapę</p>
        </div>
      </div>
    )
  }

  return (
    <div className={className}>
      <MapContainer
        center={[latitude, longitude]}
        zoom={16}
        className="h-64 w-full rounded-lg z-0"
        style={{ height: '256px', zIndex: 0 }}
      >
        <MapRefSetter mapRef={mapRef} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <DraggableMarker 
          latitude={latitude}
          longitude={longitude}
          onLocationChange={onLocationChange}
          locationName={locationName}
          L={L}
        />
      </MapContainer>
      
      <div className="mt-2 text-xs text-gray-500 text-center">
        🗺️ Przeciągnij marker aby dostosować dokładną lokalizację wydarzenia
      </div>
    </div>
  )
}