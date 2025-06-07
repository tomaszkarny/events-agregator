'use client'

import dynamic from 'next/dynamic'
import { useState, useEffect } from 'react'

// Dynamically import map to avoid SSR issues
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false })
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false })
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false })
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false })

interface DraggableMapProps {
  latitude: number
  longitude: number
  onLocationChange: (lat: number, lng: number) => void
  locationName?: string
  className?: string
}

export function DraggableMap({
  latitude,
  longitude,
  onLocationChange,
  locationName = 'Lokalizacja wydarzenia',
  className = ''
}: DraggableMapProps) {
  const [isClient, setIsClient] = useState(false)
  const [mapKey, setMapKey] = useState(0)

  // Only render on client side to avoid SSR issues
  useEffect(() => {
    setIsClient(true)
    
    // Force re-render when coordinates change significantly
    setMapKey(prev => prev + 1)
  }, [latitude, longitude])

  useEffect(() => {
    // Load Leaflet CSS dynamically
    if (typeof window !== 'undefined') {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY='
      link.crossOrigin = ''
      document.head.appendChild(link)
    }
  }, [])

  if (!isClient || !latitude || !longitude) {
    return (
      <div className={`h-64 bg-gray-100 rounded-lg flex items-center justify-center ${className}`}>
        <div className="text-center text-gray-500">
          <svg className="w-12 h-12 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <p>Wybierz adres aby zobaczyć mapę</p>
        </div>
      </div>
    )
  }

  const DraggableMarker = () => {
    const [position, setPosition] = useState<[number, number]>([latitude, longitude])
    const [L, setL] = useState<any>(null)

    useEffect(() => {
      import('leaflet').then(LeafletModule => {
        setL(LeafletModule.default)
      })
    }, [])

    useEffect(() => {
      setPosition([latitude, longitude])
    }, [latitude, longitude])

    const eventHandlers = {
      dragend: (e: any) => {
        const marker = e.target
        const newPos = marker.getLatLng()
        const newLat = Number(newPos.lat.toFixed(6))
        const newLng = Number(newPos.lng.toFixed(6))
        
        setPosition([newLat, newLng])
        onLocationChange(newLat, newLng)
      },
    }

    // Custom marker icon using HTML/CSS
    const customIcon = L ? L.divIcon({
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
    }) : undefined

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
              {position[0].toFixed(6)}, {position[1].toFixed(6)}
            </span>
          </div>
        </Popup>
      </Marker>
    )
  }

  return (
    <div className={className}>
      <MapContainer
        key={mapKey}
        center={[latitude, longitude]}
        zoom={16}
        className="h-64 w-full rounded-lg z-0"
        style={{ height: '256px', zIndex: 0 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <DraggableMarker />
      </MapContainer>
      
      <div className="mt-2 text-xs text-gray-500 text-center">
        🗺️ Przeciągnij marker aby dostosować dokładną lokalizację wydarzenia
      </div>
    </div>
  )
}