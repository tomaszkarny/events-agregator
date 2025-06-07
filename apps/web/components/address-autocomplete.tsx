'use client'

import { useRef, useEffect, useState } from 'react'
import { useGoogleMaps } from '@/hooks/use-google-maps'

interface PlaceData {
  locationName: string
  address: string
  city: string
  lat: number
  lng: number
}

interface AddressAutocompleteProps {
  value: string
  onChange: (value: string) => void
  onPlaceSelect: (place: PlaceData) => void
  placeholder?: string
  className?: string
  required?: boolean
}

export function AddressAutocomplete({
  value,
  onChange,
  onPlaceSelect,
  placeholder = 'Wpisz adres lub nazwę miejsca...',
  className = '',
  required = false
}: AddressAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)
  const { isLoaded, error } = useGoogleMaps()
  const [inputValue, setInputValue] = useState(value)

  useEffect(() => {
    setInputValue(value)
  }, [value])

  useEffect(() => {
    if (!isLoaded || !inputRef.current) return

    // Initialize autocomplete
    autocompleteRef.current = new google.maps.places.Autocomplete(inputRef.current, {
      componentRestrictions: { country: 'pl' },
      fields: [
        'name',
        'formatted_address', 
        'address_components',
        'geometry.location'
      ],
      types: ['establishment', 'geocode']
    })

    // Handle place selection
    const listener = autocompleteRef.current.addListener('place_changed', () => {
      const place = autocompleteRef.current?.getPlace()
      
      if (!place || !place.geometry?.location) {
        console.log('No place data available')
        return
      }

      // Extract place data
      const locationName = place.name || ''
      const address = place.formatted_address || ''
      const lat = place.geometry.location.lat()
      const lng = place.geometry.location.lng()
      
      // Extract city from address components
      let city = 'Warszawa' // fallback
      const cityComponent = place.address_components?.find(
        component => 
          component.types.includes('locality') || 
          component.types.includes('administrative_area_level_2')
      )
      if (cityComponent) {
        city = cityComponent.long_name
      }

      // Update input value and notify parent
      setInputValue(address)
      onChange(address)
      onPlaceSelect({
        locationName,
        address,
        city,
        lat,
        lng
      })
    })

    return () => {
      if (listener) {
        google.maps.event.removeListener(listener)
      }
    }
  }, [isLoaded, onChange, onPlaceSelect])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setInputValue(newValue)
    onChange(newValue)
  }

  // Fallback to regular input if Google Maps fails
  if (error) {
    return (
      <div>
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          placeholder={placeholder}
          required={required}
          className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
        />
        <div className="text-xs text-yellow-600 mt-1">
          ⚠️ Google Maps niedostępne - wpisz adres ręcznie
        </div>
      </div>
    )
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        placeholder={isLoaded ? placeholder : "Ładowanie map..."}
        required={required}
        className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
        disabled={!isLoaded}
      />
      {!isLoaded && (
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
    </div>
  )
}