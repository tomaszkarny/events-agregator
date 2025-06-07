'use client'

import { useState, useCallback, useRef, useEffect, useId } from 'react'
import { CITY_COORDINATES } from '@events-agregator/shared'

interface AddressSuggestion {
  id: string
  latitude: number
  longitude: number
  displayName: string
  locationName: string
  address: {
    city: string
    country: string
  }
}

interface AddressData {
  locationName: string
  address: string
  city: string
  lat: number
  lng: number
}

interface GoogleStyleAddressInputProps {
  value: string
  onChange: (value: string) => void
  onAddressComplete: (data: AddressData) => void
  placeholder?: string
  className?: string
  required?: boolean
}

export function GoogleStyleAddressInput({
  value,
  onChange,
  onAddressComplete,
  placeholder = '🔍 np. Pałac Kultury lub ul. Marszałkowska 10',
  className = '',
  required = false
}: GoogleStyleAddressInputProps) {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const [lastQuery, setLastQuery] = useState('')
  const [showNoResults, setShowNoResults] = useState(false)
  
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  
  const listId = useId()
  const optionIdPrefix = useId()

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(event.target as Node) &&
          listRef.current && !listRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setHighlightedIndex(-1)
        setShowNoResults(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const searchSuggestions = useCallback(async (query: string) => {
    if (!query.trim() || query.length < 3 || query === lastQuery) {
      return
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    abortControllerRef.current = new AbortController()
    setIsLoading(true)
    setLastQuery(query)

    try {
      const response = await fetch('/api/geocode', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ address: query }),
        signal: abortControllerRef.current.signal
      })

      if (response.ok) {
        const data = await response.json()
        const suggestions = data.suggestions || []
        setSuggestions(suggestions)
        setShowNoResults(suggestions.length === 0 && query.length >= 3)
        setIsOpen(suggestions.length > 0 || (suggestions.length === 0 && query.length >= 3))
        setHighlightedIndex(-1)
      } else {
        setSuggestions([])
        setShowNoResults(true)
        setIsOpen(true)
      }
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        console.log('Search failed:', error.message)
        setSuggestions([])
        setShowNoResults(false)
        setIsOpen(false)
      }
    } finally {
      if (abortControllerRef.current?.signal.aborted !== true) {
        setIsLoading(false)
      }
    }
  }, [lastQuery])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    onChange(newValue)

    // Clear existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }

    // Set new timeout for search
    debounceTimeoutRef.current = setTimeout(() => {
      searchSuggestions(newValue)
    }, 500) // Faster than before: 500ms
  }

  const selectSuggestion = (suggestion: AddressSuggestion) => {
    onChange(suggestion.displayName)
    onAddressComplete({
      locationName: suggestion.locationName,
      address: suggestion.displayName,
      city: suggestion.address.city,
      lat: suggestion.latitude,
      lng: suggestion.longitude
    })
    setIsOpen(false)
    setHighlightedIndex(-1)
    setSuggestions([])
    setShowNoResults(false)
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || suggestions.length === 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        searchSuggestions(value)
      }
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        )
        break
      
      case 'ArrowUp':
        e.preventDefault()
        setHighlightedIndex(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        )
        break
      
      case 'Enter':
        e.preventDefault()
        if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
          selectSuggestion(suggestions[highlightedIndex])
        }
        break
      
      case 'Escape':
        e.preventDefault()
        setIsOpen(false)
        setHighlightedIndex(-1)
        setShowNoResults(false)
        inputRef.current?.blur()
        break
    }
  }

  const handleInputFocus = () => {
    if (suggestions.length > 0) {
      setIsOpen(true)
    }
  }

  return (
    <div className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleInputFocus}
          placeholder={placeholder}
          required={required}
          className={`w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
          autoComplete="off"
          role="combobox"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-owns={isOpen ? listId : undefined}
          aria-activedescendant={
            highlightedIndex >= 0 ? `${optionIdPrefix}-${highlightedIndex}` : undefined
          }
        />
        
        {/* Loading indicator */}
        {isLoading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
        
        {/* Search icon */}
        {!isLoading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        )}
      </div>

      {/* Suggestions dropdown */}
      {isOpen && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto"
        >
          {suggestions.length > 0 ? (
            suggestions.map((suggestion, index) => (
            <li
              key={suggestion.id}
              id={`${optionIdPrefix}-${index}`}
              role="option"
              aria-selected={index === highlightedIndex}
              className={`px-3 py-2 cursor-pointer border-b border-gray-100 last:border-b-0 ${
                index === highlightedIndex 
                  ? 'bg-blue-50 text-blue-700' 
                  : 'hover:bg-gray-50'
              }`}
              onClick={() => selectSuggestion(suggestion)}
              onMouseEnter={() => setHighlightedIndex(index)}
            >
              <div className="flex items-start">
                <div className="flex-shrink-0 mt-1 mr-3">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 truncate">
                    {suggestion.locationName}
                  </div>
                  <div className="text-sm text-gray-500 truncate">
                    {suggestion.displayName}
                  </div>
                </div>
              </div>
            </li>
            ))
          ) : showNoResults ? (
            <li className="px-3 py-4 text-center text-gray-500">
              <div className="flex flex-col items-center">
                <svg className="w-6 h-6 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <div className="font-medium">Nie znaleziono wyników</div>
                <div className="text-sm">Spróbuj innej nazwy lub adresu</div>
              </div>
            </li>
          ) : null}
        </ul>
      )}
      
      {/* Helper text */}
      <div className="text-xs text-gray-500 mt-1">
        {isLoading ? (
          <span className="text-blue-600">🔍 Szukam sugestii...</span>
        ) : suggestions.length > 0 && isOpen ? (
          <span>Użyj strzałek ↑↓ do nawigacji, Enter aby wybrać</span>
        ) : (
          <span>Wpisz co najmniej 3 znaki aby zobaczyć sugestie</span>
        )}
      </div>
    </div>
  )
}