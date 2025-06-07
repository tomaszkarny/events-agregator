'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { POLISH_CITIES, EVENT_CATEGORIES, AGE_GROUPS, CITY_COORDINATES } from '@events-agregator/shared'
import { useCreateEvent } from '@/hooks/use-events'
import { useAuth } from '@/contexts/auth-context-v2'
import { Header } from '@/components/header'
import { GoogleStyleAddressInput } from '@/components/google-style-address-input'
import { toast } from '@/lib/toast'

export default function AddEvent() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const createEventMutation = useCreateEvent()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      toast.error('Musisz być zalogowany aby dodać wydarzenie')
      router.push('/')
    }
  }, [user, loading, router])
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    ageMin: 0,
    ageMax: 18,
    priceType: 'FREE' as 'FREE' | 'PAID',
    price: 0,
    locationName: '',
    address: '',
    city: 'Warszawa',
    lat: CITY_COORDINATES['Warszawa'].lat,
    lng: CITY_COORDINATES['Warszawa'].lng,
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    category: 'INNE' as const,
    imageUrl: '',
    tags: '',
  })

  const handleAddressComplete = (addressData: {
    locationName: string
    address: string
    city: string
    lat: number
    lng: number
  }) => {
    setFormData(prev => ({
      ...prev,
      locationName: addressData.locationName,
      address: addressData.address,
      city: addressData.city,
      lat: addressData.lat,
      lng: addressData.lng
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')

    try {
      // Combine date and time
      const startDateTime = new Date(`${formData.startDate}T${formData.startTime}`)
      const endDateTime = formData.endDate && formData.endTime 
        ? new Date(`${formData.endDate}T${formData.endTime}`)
        : undefined

      // Create event using Supabase mutation
      await createEventMutation.mutateAsync({
        title: formData.title,
        description: formData.description,
        age_min: formData.ageMin,
        age_max: formData.ageMax,
        price_type: formData.priceType,
        price: formData.priceType === 'PAID' ? formData.price : undefined,
        location_name: formData.locationName,
        address: formData.address,
        city: formData.city,
        lat: formData.lat || 0,
        lng: formData.lng || 0,
        start_date: startDateTime.toISOString(),
        end_date: endDateTime?.toISOString(),
        category: formData.category,
        image_urls: formData.imageUrl ? [formData.imageUrl] : [],
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(Boolean),
        currency: 'PLN',
        organizer_name: user?.user_metadata?.name || user?.email || 'Organizator',
        source_url: window.location.href,
        status: 'DRAFT'
      })

      // Success - redirect to my events
      toast.success('Wydarzenie zostało dodane! Czeka na moderację.')
      router.push('/my-events')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Wystąpił błąd'
      setError(message)
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Show loading while checking auth
  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Ładowanie...</span>
            </div>
          </div>
        </div>
      </main>
    )
  }

  // Don't render if user is not authenticated (will redirect)
  if (!user) {
    return (
      <main className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-center py-12">
              <p className="text-gray-600">Przekierowywanie...</p>
            </div>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-3xl font-bold mb-6">Dodaj wydarzenie</h1>
          
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded text-red-600">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Tytuł */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tytuł wydarzenia *
              </label>
              <input
                type="text"
                required
                maxLength={200}
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="np. Warsztaty robotyki dla dzieci"
              />
            </div>

            {/* Opis */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Opis wydarzenia *
              </label>
              <textarea
                required
                rows={4}
                maxLength={5000}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Opisz co będzie się działo, dla kogo jest wydarzenie, co należy przynieść..."
              />
            </div>

            {/* Wiek */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Wiek od *
                </label>
                <input
                  type="number"
                  required
                  min={0}
                  max={18}
                  value={formData.ageMin}
                  onChange={(e) => setFormData({ ...formData, ageMin: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Wiek do *
                </label>
                <input
                  type="number"
                  required
                  min={0}
                  max={18}
                  value={formData.ageMax}
                  onChange={(e) => setFormData({ ...formData, ageMax: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Kategoria */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Kategoria *
              </label>
              <select
                required
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {Object.entries(EVENT_CATEGORIES).map(([key, label]) => (
                  <option key={key} value={key.toUpperCase()}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {/* Cena */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Typ ceny *
              </label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="FREE"
                    checked={formData.priceType === 'FREE'}
                    onChange={(e) => setFormData({ ...formData, priceType: 'FREE' })}
                    className="mr-2"
                  />
                  Bezpłatne
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="PAID"
                    checked={formData.priceType === 'PAID'}
                    onChange={(e) => setFormData({ ...formData, priceType: 'PAID' })}
                    className="mr-2"
                  />
                  Płatne
                </label>
              </div>
              
              {formData.priceType === 'PAID' && (
                <div className="mt-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cena (zł)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
            </div>

            {/* Lokalizacja */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Miasto *
              </label>
              <select
                required
                value={formData.city}
                onChange={(e) => {
                  const selectedCity = e.target.value
                  const coords = CITY_COORDINATES[selectedCity] || { lat: 52.23, lng: 21.01 }
                  setFormData({ 
                    ...formData, 
                    city: selectedCity,
                    lat: coords.lat,
                    lng: coords.lng
                  })
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {POLISH_CITIES.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nazwa miejsca *
              </label>
              <input
                type="text"
                required
                value={formData.locationName}
                onChange={(e) => setFormData({ ...formData, locationName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="np. Centrum Kultury Łowicka"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Adres *
              </label>
              <GoogleStyleAddressInput
                value={formData.address}
                onChange={(value) => setFormData({ ...formData, address: value })}
                onAddressComplete={handleAddressComplete}
                placeholder="🔍 np. Pałac Kultury lub ul. Marszałkowska 10, Warszawa"
                required
              />
            </div>

            {/* Hidden coordinates - automatically set based on city */}
            <input type="hidden" name="lat" value={formData.lat} />
            <input type="hidden" name="lng" value={formData.lng} />

            {/* Data i godzina */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data rozpoczęcia *
                </label>
                <input
                  type="date"
                  required
                  min={new Date().toISOString().split('T')[0]}
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Godzina rozpoczęcia *
                </label>
                <input
                  type="time"
                  required
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Zdjęcie */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Link do zdjęcia
              </label>
              <input
                type="url"
                value={formData.imageUrl}
                onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://example.com/zdjecie.jpg"
              />
            </div>

            {/* Tagi */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tagi (oddzielone przecinkami)
              </label>
              <input
                type="text"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="np. robotyka, programowanie, LEGO"
              />
            </div>

            {/* Przyciski */}
            <div className="flex gap-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Dodawanie...' : 'Dodaj wydarzenie'}
              </button>
              <button
                type="button"
                onClick={() => router.push('/')}
                className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300"
              >
                Anuluj
              </button>
            </div>
          </form>

          <div className="mt-6 p-4 bg-blue-50 rounded-md">
            <p className="text-sm text-blue-800">
              <strong>Uwaga:</strong> Wszystkie wydarzenia są moderowane przed publikacją. 
              Zwykle trwa to do 24 godzin.
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}