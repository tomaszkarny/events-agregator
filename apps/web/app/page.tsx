'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useEvents } from '@/hooks/use-events'
import { POLISH_CITIES, EVENT_CATEGORIES } from '@events-agregator/shared'
import { Header } from '@/components/header'
import { EventCard } from '@/components/event-card'
import { supabase } from '@/lib/supabase-client'
import { toast } from '@/lib/toast'

export default function Home() {
  const searchParams = useSearchParams()
  const [filters, setFilters] = useState({
    city: '',
    category: '',
    search: '',
  })
  const [showExpiredEvents, setShowExpiredEvents] = useState(false)

  // Handle auth-required redirect from middleware
  useEffect(() => {
    const authRequired = searchParams.get('auth-required')
    const redirectPath = searchParams.get('redirect')
    
    if (authRequired === 'true' && redirectPath) {
      const routeNames: Record<string, string> = {
        '/favorites': 'ulubionych',
        '/profile': 'profilu',
        '/my-events': 'swoich wydarzeń',
        '/add-event': 'dodawania wydarzeń'
      }
      
      const routeName = routeNames[redirectPath] || 'tej strony'
      toast.error(`Musisz być zalogowany aby zobaczyć ${routeName}`)
      
      // Clean up URL parameters
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [searchParams])

  const { data, isLoading, error } = useEvents({
    ...filters,
    limit: 25,
    offset: 0,
    includeExpiredEvents: showExpiredEvents
  })
  
  // Debug logging
  console.log('Home page - Events query state:', { data, isLoading, error })
  
  // Test Supabase connection
  useEffect(() => {
    const testConnection = async () => {
      try {
        console.log('=== HOSTNAME DEBUG ===')
        console.log('Current hostname:', window.location.hostname)
        console.log('Current href:', window.location.href)
        console.log('User agent:', navigator.userAgent)
        console.log('======================')
        
        console.log('Testing direct Supabase connection...')
        const { data, error } = await supabase
          .from('events')
          .select('count(*)', { count: 'exact', head: true })
        console.log('Direct Supabase test result:', { data, error })
        
        console.log('Testing via API route...')
        const apiResponse = await fetch('/api/test-db')
        const apiData = await apiResponse.json()
        console.log('API test result:', apiData)
      } catch (err) {
        console.error('Connection test error:', err)
      }
    }
    testConnection()
  }, [])

  return (
    <main className="min-h-screen bg-gray-50">
      <Header />


      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Miasto
              </label>
              <select
                value={filters.city}
                onChange={(e) => setFilters({ ...filters, city: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Wszystkie miasta</option>
                {POLISH_CITIES.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Kategoria
              </label>
              <select
                value={filters.category}
                onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Wszystkie kategorie</option>
                {Object.entries(EVENT_CATEGORIES).map(([key, label]) => (
                  <option key={key} value={key.toUpperCase()}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Szukaj
              </label>
              <input
                type="text"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                placeholder="Nazwa wydarzenia..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          
          {/* Expired Events Toggle */}
          <div className="mt-4 flex items-center">
            <input
              type="checkbox"
              id="showExpiredEvents"
              checked={showExpiredEvents}
              onChange={(e) => setShowExpiredEvents(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="showExpiredEvents" className="ml-2 text-sm text-gray-700">
              Pokaż zakończone wydarzenia
            </label>
          </div>
        </div>
      </div>

      {/* Events List */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            <p className="mt-2 text-gray-600">Ładowanie wydarzeń...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-600">Błąd podczas ładowania wydarzeń</p>
          </div>
        ) : !data || data.items?.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Nie znaleziono wydarzeń</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.items?.map((event: any) => (
              <EventCard key={event.id} event={event} />
            )) || []}
          </div>
        )}
      </div>
    </main>
  )
}