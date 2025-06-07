'use client'

interface CoordinatesDebugProps {
  latitude: number
  longitude: number
  title: string
  address: string
  className?: string
}

export function CoordinatesDebug({
  latitude,
  longitude,
  title,
  address,
  className = ''
}: CoordinatesDebugProps) {
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`
  const openStreetMapUrl = `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}&zoom=16`

  return (
    <div className={`bg-blue-50 border border-blue-200 rounded-lg p-4 ${className}`}>
      <h4 className="font-medium text-blue-900 mb-2">🔍 Debug: Sprawdź dokładność lokalizacji</h4>
      
      <div className="space-y-2 text-sm">
        <div>
          <span className="font-medium">Nazwa:</span> {title}
        </div>
        <div>
          <span className="font-medium">Adres:</span> {address}
        </div>
        <div>
          <span className="font-medium">Współrzędne:</span> 
          <code className="ml-1 bg-white px-2 py-1 rounded">
            {latitude.toFixed(6)}, {longitude.toFixed(6)}
          </code>
        </div>
      </div>

      <div className="mt-4 flex gap-3">
        <a
          href={googleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
          </svg>
          Google Maps
        </a>
        
        <a
          href={openStreetMapUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
          </svg>
          OpenStreetMap
        </a>
      </div>

    </div>
  )
}