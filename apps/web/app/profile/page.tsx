'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/auth-context-v2'
import { Header } from '@/components/header'
import { toast } from '@/lib/toast'
import { getChildProfiles } from '@/lib/supabase-queries'
import { ChildProfile } from '@/lib/types'
import { useFavoritesCount } from '@/hooks/use-favorites'

export default function Profile() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const favoritesCount = useFavoritesCount()
  const [isEditing, setIsEditing] = useState(false)
  const [childProfiles, setChildProfiles] = useState<ChildProfile[]>([])
  const [formData, setFormData] = useState({
    name: '',
    email: '',
  })

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      toast.error('Musisz być zalogowany aby zobaczyć profil')
      router.push('/')
    }
  }, [user, authLoading, router])

  // Set initial form data
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.user_metadata?.name || user.email?.split('@')[0] || '',
        email: user.email || '',
      })
      loadChildProfiles()
    }
  }, [user])

  async function loadChildProfiles() {
    try {
      const profiles = await getChildProfiles()
      setChildProfiles(profiles)
    } catch (error) {
      console.error('Error loading child profiles:', error)
    }
  }

  if (authLoading) {
    return (
      <main className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Ładowanie profilu...</p>
          </div>
        </div>
      </main>
    )
  }

  if (!user) return null

  const handleSave = async () => {
    toast.info('Edycja profilu będzie dostępna wkrótce')
    setIsEditing(false)
  }

  const joinDate = new Date(user.created_at).toLocaleDateString('pl-PL', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  return (
    <main className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Profil użytkownika</h1>
          <p className="mt-2 text-gray-600">
            Zarządzaj swoimi danymi osobowymi
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Card */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6 text-center">
              <div className="w-24 h-24 bg-blue-600 rounded-full mx-auto mb-4 flex items-center justify-center text-white text-3xl font-bold">
                {user.email?.[0]?.toUpperCase() || '?'}
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                {formData.name || 'Użytkownik'}
              </h2>
              <p className="text-gray-600 mb-4">{user.email}</p>
              <p className="text-sm text-gray-500">
                Członek od {joinDate}
              </p>
            </div>

            {/* Quick Stats */}
            <div className="bg-white rounded-lg shadow p-6 mt-6">
              <h3 className="text-lg font-semibold mb-4">Statystyki</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Wydarzenia dodane:</span>
                  <span className="font-medium">-</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Aktywne alerty:</span>
                  <span className="font-medium">-</span>
                </div>
                <Link href="/favorites" className="flex justify-between hover:bg-gray-50 -mx-2 px-2 py-1 rounded transition-colors">
                  <span className="text-gray-600">Ulubione:</span>
                  <span className="font-medium text-blue-600">{favoritesCount}</span>
                </Link>
              </div>
              <p className="text-xs text-gray-500 mt-4">
                * Niektóre statystyki będą dostępne wkrótce
              </p>
            </div>
          </div>

          {/* Profile Details */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <h3 className="text-lg font-semibold">Dane osobowe</h3>
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  {isEditing ? 'Anuluj' : 'Edytuj'}
                </button>
              </div>
              
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Imię
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      <p className="py-2 text-gray-900">{formData.name || 'Nie podano'}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email
                    </label>
                    <p className="py-2 text-gray-900">{formData.email}</p>
                    <p className="text-xs text-gray-500">
                      Email nie może być zmieniony
                    </p>
                  </div>
                </div>

                {isEditing && (
                  <div className="mt-6 flex gap-3">
                    <button
                      onClick={handleSave}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      Zapisz zmiany
                    </button>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                    >
                      Anuluj
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Preferences Section */}
            <div className="bg-white rounded-lg shadow mt-6">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold">Preferencje</h3>
              </div>
              
              <div className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">Powiadomienia email</p>
                      <p className="text-sm text-gray-600">Otrzymuj informacje o nowych wydarzeniach</p>
                    </div>
                    <button
                      onClick={() => toast.info('Ustawienia powiadomień będą dostępne wkrótce')}
                      className="bg-gray-200 relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out"
                    >
                      <span className="translate-x-0 inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"></span>
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">Alerty o wydarzeniach</p>
                      <p className="text-sm text-gray-600">Powiadomienia o wydarzeniach w Twojej okolicy</p>
                    </div>
                    <button
                      onClick={() => toast.info('Ustawienia alertów będą dostępne wkrótce')}
                      className="bg-gray-200 relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out"
                    >
                      <span className="translate-x-0 inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"></span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow mt-6">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold">Szybkie akcje</h3>
              </div>
              
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <a
                    href="/add-event"
                    className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <div className="text-2xl mr-3">📝</div>
                    <div>
                      <p className="font-medium">Dodaj wydarzenie</p>
                      <p className="text-sm text-gray-600">Podziel się wydarzeniem z innymi</p>
                    </div>
                  </a>
                  
                  <a
                    href="/my-events"
                    className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <div className="text-2xl mr-3">📅</div>
                    <div>
                      <p className="font-medium">Moje wydarzenia</p>
                      <p className="text-sm text-gray-600">Zarządzaj swoimi wydarzeniami</p>
                    </div>
                  </a>
                </div>
              </div>
            </div>

            {/* Child Profiles Section */}
            <div className="bg-white rounded-lg shadow mt-6">
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <h3 className="text-lg font-semibold">Profile dzieci</h3>
                <a
                  href="/profile/children"
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  Zarządzaj
                </a>
              </div>
              
              <div className="p-6">
                {childProfiles.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-gray-500 mb-4">Nie masz jeszcze żadnych profili dzieci</p>
                    <a
                      href="/profile/children"
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Dodaj pierwszy profil →
                    </a>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {childProfiles.slice(0, 3).map((profile) => (
                      <div key={profile.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                            {profile.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{profile.name}</p>
                            <p className="text-sm text-gray-600">{profile.age} lat</p>
                          </div>
                        </div>
                        {profile.interests.length > 0 && (
                          <div className="flex gap-1">
                            {profile.interests.slice(0, 2).map((interest) => (
                              <span key={interest} className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded-full">
                                {interest}
                              </span>
                            ))}
                            {profile.interests.length > 2 && (
                              <span className="text-xs text-gray-500">+{profile.interests.length - 2}</span>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                    {childProfiles.length > 3 && (
                      <p className="text-sm text-gray-500 text-center pt-2">
                        i {childProfiles.length - 3} więcej...
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}