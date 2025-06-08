'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { Header } from '@/components/header'
import { EventCard } from '@/components/event-card'
import { useAuth } from '@/contexts/auth-context-v2'
import { useFavorites } from '@/hooks/use-favorites'
import { toast } from '@/lib/toast'
import Link from 'next/link'

export default function FavoritesPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { user, loading: authLoading } = useAuth()
  const { data: favorites = [], isLoading, error } = useFavorites()

  const handleRetryFavorites = () => {
    queryClient.invalidateQueries({ queryKey: ['favorites', user?.id] })
    toast.info('Odświeżanie ulubionych...')
  }

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      toast.error('Musisz być zalogowany aby zobaczyć ulubione')
      router.push('/')
    }
  }, [user, authLoading, router])

  if (authLoading || (!user && authLoading)) {
    return (
      <main className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Sprawdzanie autoryzacji...</p>
          </div>
        </div>
      </main>
    )
  }

  if (!user) return null

  return (
    <main className="min-h-screen bg-gray-50">
      <Header />
      
      {/* Page Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Ulubione wydarzenia
              </h1>
              <p className="mt-2 text-gray-600">
                Wydarzenia, które zapisałeś na później
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M21 8.5c0-2.485-2.015-4.5-4.5-4.5-1.74 0-3.25.99-4 2.439A4.487 4.487 0 008.5 4C6.015 4 4 6.015 4 8.5c0 .886.256 1.714.7 2.414L12 21l7.3-10.086A4.486 4.486 0 0021 8.5z" />
              </svg>
              <span>{favorites.length} {favorites.length === 1 ? 'wydarzenie' : 'wydarzeń'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Events List */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            <p className="mt-2 text-gray-600">Ładowanie ulubionych...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <div className="max-w-md mx-auto">
              <svg
                className="mx-auto h-12 w-12 text-red-400 mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.732 15.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Błąd podczas ładowania ulubionych
              </h3>
              <p className="text-gray-600 mb-4">
                Nie udało się załadować Twoich ulubionych wydarzeń. Spróbuj ponownie.
              </p>
              <button
                onClick={handleRetryFavorites}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Spróbuj ponownie
              </button>
            </div>
          </div>
        ) : favorites.length === 0 ? (
          <div className="text-center py-12">
            <div className="max-w-md mx-auto">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                />
              </svg>
              <h3 className="mt-6 text-lg font-medium text-gray-900">
                Nie masz jeszcze ulubionych wydarzeń
              </h3>
              <p className="mt-2 text-gray-600">
                Kliknij serduszko przy wydarzeniu, które Cię interesuje, aby zapisać je na później.
              </p>
              <Link
                href="/"
                className="mt-6 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
              >
                Przeglądaj wydarzenia
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {favorites.map((event: any) => (
                <EventCard key={event.id} event={event} favoriteTheme="blue" />
              ))}
            </div>
            
            {/* Info about removing favorites */}
            <div className="mt-8 text-center text-sm text-gray-500">
              <p>💡 Wskazówka: Kliknij serduszko na karcie wydarzenia, aby usunąć je z ulubionych</p>
            </div>
          </>
        )}
      </div>
    </main>
  )
}