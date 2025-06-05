'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/contexts/auth-context-v2'
import { Header } from '@/components/header'
import { EventCard } from '@/components/event-card'
import { api } from '@/lib/api'
import { toast } from '@/lib/toast'

export default function MyEvents() {
  const router = useRouter()
  const { user, loading: authLoading, getAccessToken } = useAuth()
  const [activeTab, setActiveTab] = useState<'all' | 'draft' | 'active'>('all')

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      toast.error('Musisz być zalogowany aby zobaczyć swoje wydarzenia')
      router.push('/')
    }
  }, [user, authLoading, router])

  // Fetch user's events
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['my-events', activeTab],
    queryFn: async () => {
      console.log('Fetching /api/events/my...')
      
      // No need for Authorization header - server uses cookies
      const response = await fetch('/api/events/my', {
        credentials: 'include', // Include cookies for authentication
      })
      
      console.log('Response status:', response.status)
      console.log('Response headers:', Object.fromEntries(response.headers.entries()))
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('API Error:', errorText)
        throw new Error(`Failed to fetch events: ${response.status} - ${errorText}`)
      }
      
      const result = await response.json()
      console.log('API Result:', result)
      return result
    },
    enabled: !!user && !authLoading,
    retry: (failureCount, error) => {
      // Retry on auth issues up to 2 times
      if (error?.message?.includes('Unauthorized') && failureCount < 2) {
        console.log(`Retrying auth request, attempt ${failureCount + 1}`)
        return true
      }
      return false
    },
    retryDelay: 1000,
  })

  if (authLoading || isLoading) {
    return (
      <main className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Ładowanie wydarzeń...</p>
          </div>
        </div>
      </main>
    )
  }

  if (!user) return null

  const filteredEvents = data?.events?.filter((event: any) => {
    if (activeTab === 'all') return true
    if (activeTab === 'draft') return event.status === 'DRAFT'
    if (activeTab === 'active') return event.status === 'ACTIVE'
    return true
  }) || []

  const stats = {
    total: data?.events?.length || 0,
    draft: data?.events?.filter((e: any) => e.status === 'DRAFT').length || 0,
    active: data?.events?.filter((e: any) => e.status === 'ACTIVE').length || 0,
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Moje wydarzenia</h1>
          <p className="mt-2 text-gray-600">
            Zarządzaj wydarzeniami które dodałeś
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-3xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-gray-600">Wszystkie wydarzenia</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-3xl font-bold text-yellow-600">{stats.draft}</div>
            <div className="text-gray-600">Oczekujące na moderację</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-3xl font-bold text-green-600">{stats.active}</div>
            <div className="text-gray-600">Aktywne</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('all')}
                className={`py-2 px-6 text-sm font-medium ${
                  activeTab === 'all'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Wszystkie ({stats.total})
              </button>
              <button
                onClick={() => setActiveTab('draft')}
                className={`py-2 px-6 text-sm font-medium ${
                  activeTab === 'draft'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Oczekujące ({stats.draft})
              </button>
              <button
                onClick={() => setActiveTab('active')}
                className={`py-2 px-6 text-sm font-medium ${
                  activeTab === 'active'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Aktywne ({stats.active})
              </button>
            </nav>
          </div>
        </div>

        {/* Events Grid */}
        {error ? (
          <div className="text-center py-12">
            <p className="text-red-600">Błąd podczas ładowania wydarzeń</p>
            <button 
              onClick={() => refetch()} 
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Spróbuj ponownie
            </button>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-600 mb-4">
              {activeTab === 'all' ? 'Nie masz jeszcze żadnych wydarzeń' :
               activeTab === 'draft' ? 'Nie masz wydarzeń oczekujących na moderację' :
               'Nie masz aktywnych wydarzeń'}
            </p>
            <a
              href="/add-event"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              ➕ Dodaj pierwsze wydarzenie
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEvents.map((event: any) => (
              <div key={event.id} className="relative">
                <EventCard event={event} />
                {/* Action buttons overlay */}
                <div className="absolute top-4 right-4 flex gap-2">
                  <button
                    onClick={() => toast.info('Edycja wydarzeń będzie dostępna wkrótce')}
                    className="bg-white bg-opacity-90 p-2 rounded-full shadow hover:bg-opacity-100"
                    title="Edytuj"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => toast.info('Usuwanie wydarzeń będzie dostępne wkrótce')}
                    className="bg-white bg-opacity-90 p-2 rounded-full shadow hover:bg-opacity-100"
                    title="Usuń"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}