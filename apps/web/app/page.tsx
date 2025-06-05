'use client'

import { useState } from 'react'
import { useEvents } from '@/hooks/use-events'
import { POLISH_CITIES, EVENT_CATEGORIES } from '@events-agregator/shared'
import { Header } from '@/components/header'
import { EventCard } from '@/components/event-card'

export default function Home() {
  const [filters, setFilters] = useState({
    city: '',
    category: '',
    search: '',
  })

  const { data, isLoading, error } = useEvents({
    ...filters,
    limit: 25,
    offset: 0
  })

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
        ) : data?.items?.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Nie znaleziono wydarzeń</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {data?.items.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}