'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { CITY_COORDINATES } from '@events-agregator/shared'

interface AddressData {
  locationName: string
  address: string
  city: string
  lat: number
  lng: number
}

interface SimpleAddressInputProps {
  value: string
  onChange: (value: string) => void
  onAddressComplete: (data: AddressData) => void
  placeholder?: string
  className?: string
  required?: boolean
}

export function SimpleAddressInput({
  value,
  onChange,
  onAddressComplete,
  placeholder = 'Wpisz adres...',
  className = '',
  required = false
}: SimpleAddressInputProps) {
  const [isGeocoding, setIsGeocoding] = useState(false)
  const [lastGeocodedValue, setLastGeocodedValue] = useState('')
  const [debounceTimeout, setDebounceTimeout] = useState<NodeJS.Timeout | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clear timeout
      if (debounceTimeout) {
        clearTimeout(debounceTimeout)
      }
      // Abort any pending request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [debounceTimeout])

  const geocodeAddress = useCallback(async (address: string) => {
    // Don't geocode if too short or same as last
    if (!address.trim() || address.length < 3 || address === lastGeocodedValue) return
    
    // Cancel previous request if still pending
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    
    // Create new abort controller
    abortControllerRef.current = new AbortController()
    
    setIsGeocoding(true)
    setLastGeocodedValue(address)
    
    try {
      const response = await fetch('/api/geocode', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ address }),
        signal: abortControllerRef.current.signal
      })
      
      if (response.ok) {
        const data = await response.json()
        
        onAddressComplete({
          locationName: data.locationName || data.displayName.split(',')[0],
          address: data.displayName,
          city: data.address.city,
          lat: data.latitude,
          lng: data.longitude
        })
      } else {
        console.log('Geocoding failed:', response.status, response.statusText)
      }
    } catch (error) {
      // Don't log errors for aborted requests
      if (error instanceof Error && error.name !== 'AbortError') {
        console.log('Geocoding failed:', error.message)
      }
      // Fallback to city coordinates if geocoding fails
    } finally {
      // Only reset loading if this request wasn't aborted
      if (abortControllerRef.current?.signal.aborted !== true) {
        setIsGeocoding(false)
      }
    }
  }, [lastGeocodedValue, onAddressComplete])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    onChange(newValue)
    
    // Clear existing timeout
    if (debounceTimeout) {
      clearTimeout(debounceTimeout)
    }
    
    // Set new timeout for geocoding
    const timeoutId = setTimeout(() => {
      geocodeAddress(newValue)
    }, 2000) // 2 seconds delay - longer to avoid too many requests
    
    setDebounceTimeout(timeoutId)
  }

  const handleBlur = () => {
    // Clear any pending timeout
    if (debounceTimeout) {
      clearTimeout(debounceTimeout)
      setDebounceTimeout(null)
    }
    
    // Geocode immediately when user leaves the field
    if (value && value !== lastGeocodedValue && value.length >= 3) {
      geocodeAddress(value)
    }
  }

  return (
    <div className="relative">
      <input
        type="text"
        value={value}
        onChange={handleInputChange}
        onBlur={handleBlur}
        placeholder={placeholder}
        required={required}
        className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
      />
      {isGeocoding && (
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
    </div>
  )
}