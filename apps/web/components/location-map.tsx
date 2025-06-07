'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'

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
  const [L, setL] = useState<any>(null)

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY='
      link.crossOrigin = ''
      document.head.appendChild(link)
    }
  }, [])

  useEffect(() => {
    import('leaflet').then(LeafletModule => {
      setL(LeafletModule.default)
    })
  }, [])

  if (!isClient || !latitude || !longitude) {
    return null
  }

  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`

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
  }) : null

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
                  {latitude.toFixed(6)}, {longitude.toFixed(6)}
                </span>
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>
      
      {showGoogleLink && (
        <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
          <span>📍 {latitude.toFixed(6)}, {longitude.toFixed(6)}</span>
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