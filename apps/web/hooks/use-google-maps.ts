import { useEffect, useState } from 'react'
import { Loader } from '@googlemaps/js-api-loader'

export function useGoogleMaps() {
  const [isLoaded, setIsLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY
    
    if (!apiKey) {
      setError('Google Maps API key not found')
      return
    }

    const loader = new Loader({
      apiKey,
      version: 'weekly',
      libraries: ['places'],
      region: 'PL',
      language: 'pl'
    })

    loader.load().then(() => {
      setIsLoaded(true)
    }).catch((err) => {
      console.error('Failed to load Google Maps:', err)
      setError('Failed to load Google Maps')
    })
  }, [])

  return { isLoaded, error }
}