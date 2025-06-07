import { useState, useEffect } from 'react'

interface LeafletHookReturn {
  L: typeof import('leaflet') | null
  isLoading: boolean
  error: string | null
}

export function useLeaflet(): LeafletHookReturn {
  const [L, setL] = useState<typeof import('leaflet') | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    // Check if CSS is already loaded to prevent duplicates
    const loadCSS = () => {
      if (typeof window === 'undefined') return

      const existingLink = document.querySelector('link[href*="leaflet.css"]')
      if (!existingLink) {
        const link = document.createElement('link')
        link.rel = 'stylesheet'
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
        link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY='
        link.crossOrigin = ''
        document.head.appendChild(link)
      }
    }

    const loadLeaflet = async () => {
      try {
        setIsLoading(true)
        setError(null)
        
        // Load CSS first
        loadCSS()
        
        // Load Leaflet library
        const LeafletModule = await import('leaflet')
        
        if (isMounted) {
          setL(LeafletModule.default)
          setIsLoading(false)
        }
      } catch (err) {
        if (isMounted) {
          console.error('Failed to load Leaflet:', err)
          setError('Failed to load map library. Please refresh the page.')
          setIsLoading(false)
        }
      }
    }

    loadLeaflet()

    // Cleanup function
    return () => {
      isMounted = false
    }
  }, [])

  return { L, isLoading, error }
}