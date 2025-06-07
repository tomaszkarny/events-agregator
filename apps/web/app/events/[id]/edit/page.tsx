'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/contexts/auth-context-v2'
import { toast } from '@/lib/toast'
import { api } from '@/lib/api'
import { GoogleStyleAddressInput } from '@/components/google-style-address-input'
import { CITY_COORDINATES, POLISH_CITIES, EVENT_CATEGORIES } from '@events-agregator/shared'

export default function EditEventPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { user, session } = useAuth()
  const supabase = createClient()
  
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [event, setEvent] = useState<any>(null)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    ageMin: 0,
    ageMax: 18,
    priceType: 'FREE' as 'FREE' | 'PAID' | 'DONATION',
    price: 0,
    locationName: '',
    address: '',
    city: '',
    startDate: '',
    endDate: '',
    tags: [] as string[],
    imageUrl: '',
    latitude: 0,
    longitude: 0
  })

  useEffect(() => {
    loadEvent()
  }, [params.id])

  async function loadEvent() {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', params.id)
        .single()

      if (error) throw error

      if (!data) {
        toast.error('Wydarzenie nie znalezione')
        router.push('/my-events')
        return
      }

      // Check if user owns this event
      if (data.organizer_id !== user?.id) {
        toast.error('Nie masz uprawnień do edycji tego wydarzenia')
        router.push('/my-events')
        return
      }

      setEvent(data)
      
      // Convert snake_case to camelCase and populate form
      setFormData({
        title: data.title,
        description: data.description,
        category: data.category,
        ageMin: data.age_min,
        ageMax: data.age_max,
        priceType: data.price_type,
        price: data.price || 0,
        locationName: data.location_name,
        address: data.address,
        city: data.city,
        startDate: new Date(data.start_date).toISOString().slice(0, 16),
        endDate: data.end_date ? new Date(data.end_date).toISOString().slice(0, 16) : '',
        tags: data.tags || [],
        imageUrl: data.image_url || '',
        latitude: data.latitude || 0,
        longitude: data.longitude || 0
      })
    } catch (error) {
      console.error('Error loading event:', error)
      toast.error('Błąd ładowania wydarzenia')
    } finally {
      setLoading(false)
    }
  }

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
      latitude: addressData.lat,
      longitude: addressData.lng
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    if (!user) {
      toast.error('Musisz być zalogowany')
      return
    }

    setSubmitting(true)

    try {
      if (!session?.access_token) {
        toast.error('Brak sesji. Zaloguj się ponownie.')
        return
      }

      // Use API format (camelCase)
      const eventData = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        ageMin: formData.ageMin,
        ageMax: formData.ageMax,
        priceType: formData.priceType,
        price: formData.priceType === 'FREE' ? 0 : formData.price,
        locationName: formData.locationName,
        address: formData.address,
        city: formData.city,
        startDate: formData.startDate,
        endDate: formData.endDate || undefined,
        tags: formData.tags,
        imageUrl: formData.imageUrl || undefined,
        latitude: formData.latitude,
        longitude: formData.longitude
      }

      await api.updateEvent(session.access_token, params.id, eventData)

      toast.success('Wydarzenie zaktualizowane!')
      router.push(`/events/${params.id}`)
    } catch (error) {
      console.error('Error updating event:', error)
      toast.error('Błąd podczas aktualizacji wydarzenia')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!confirm('Czy na pewno chcesz usunąć to wydarzenie?')) {
      return
    }

    if (!session?.access_token) {
      toast.error('Brak sesji. Zaloguj się ponownie.')
      return
    }

    try {
      await api.deleteEvent(session.access_token, params.id)
      toast.success('Wydarzenie zostało usunięte')
      router.push('/my-events')
    } catch (error) {
      console.error('Error deleting event:', error)
      toast.error('Błąd podczas usuwania wydarzenia')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Ładowanie...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4">
        <h1 className="text-3xl font-bold mb-8">Edytuj wydarzenie</h1>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tytuł wydarzenia *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Opis *
            </label>
            <textarea
              required
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Kategoria *
            </label>
            <select
              required
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Wybierz kategorię</option>
              {Object.entries(EVENT_CATEGORIES).map(([key, label]) => (
                <option key={key} value={key.toUpperCase()}>{label}</option>
              ))}
            </select>
          </div>

          {/* Age Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Wiek od *
              </label>
              <input
                type="number"
                required
                min="0"
                max="18"
                value={formData.ageMin}
                onChange={(e) => setFormData({ ...formData, ageMin: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Wiek do *
              </label>
              <input
                type="number"
                required
                min="0"
                max="18"
                value={formData.ageMax}
                onChange={(e) => setFormData({ ...formData, ageMax: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Price */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Typ ceny *
            </label>
            <select
              value={formData.priceType}
              onChange={(e) => setFormData({ ...formData, priceType: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="FREE">Bezpłatne</option>
              <option value="PAID">Płatne</option>
              <option value="DONATION">Darowizna</option>
            </select>
          </div>

          {formData.priceType !== 'FREE' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cena (PLN)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nazwa miejsca *
            </label>
            <input
              type="text"
              required
              value={formData.locationName}
              onChange={(e) => setFormData({ ...formData, locationName: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
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
                  latitude: coords.lat,
                  longitude: coords.lng
                })
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Wybierz miasto</option>
              {POLISH_CITIES.map(city => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </div>

          {/* Hidden coordinates - automatically set based on city */}
          <input type="hidden" name="latitude" value={formData.latitude} />
          <input type="hidden" name="longitude" value={formData.longitude} />

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data rozpoczęcia *
              </label>
              <input
                type="datetime-local"
                required
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data zakończenia
              </label>
              <input
                type="datetime-local"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Image URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              URL zdjęcia
            </label>
            <input
              type="url"
              value={formData.imageUrl}
              onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-between pt-6">
            <button
              type="button"
              onClick={handleDelete}
              className="px-4 py-2 text-red-600 hover:text-red-800"
            >
              Usuń wydarzenie
            </button>
            
            <div className="space-x-3">
              <button
                type="button"
                onClick={() => router.push('/my-events')}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Anuluj
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
              >
                {submitting ? 'Zapisywanie...' : 'Zapisz zmiany'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}