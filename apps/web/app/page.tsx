'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { POLISH_CITIES, EVENT_CATEGORIES } from '@events-agregator/shared'

export default function Home() {
  const [filters, setFilters] = useState({
    city: '',
    category: '',
    search: '',
  })

  const { data, isLoading, error } = useQuery({
    queryKey: ['events', filters],
    queryFn: () => api.searchEvents(filters),
  })

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-3xl font-bold text-gray-900">
            Agregator Wydarzeń dla Dzieci
          </h1>
        </div>
      </header>

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
            {data?.items.map((event: any) => (
              <div
                key={event.id}
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
              >
                {event.imageUrls[0] && (
                  <img
                    src={event.imageUrls[0]}
                    alt={event.title}
                    className="w-full h-48 object-cover"
                  />
                )}
                <div className="p-4">
                  <h2 className="text-xl font-semibold mb-2">{event.title}</h2>
                  <p className="text-gray-600 text-sm mb-2">
                    {new Date(event.startDate).toLocaleDateString('pl-PL', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                  <p className="text-gray-600 text-sm mb-2">
                    📍 {event.city}, {event.locationName}
                  </p>
                  <p className="text-gray-600 text-sm mb-2">
                    👶 Wiek: {event.ageMin}-{event.ageMax} lat
                  </p>
                  <div className="flex justify-between items-center mt-4">
                    <span className={`inline-block px-3 py-1 rounded-full text-sm ${
                      event.priceType === 'FREE'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {event.priceType === 'FREE' ? 'Bezpłatne' : `${event.price} zł`}
                    </span>
                    <button
                      onClick={() => api.trackClick(event.id)}
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Zobacz więcej →
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}