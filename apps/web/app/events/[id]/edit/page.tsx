'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/contexts/auth-context-v2'
import { toast } from '@/lib/toast'

const CITIES = [
  'Warszawa', 'Kraków', 'Łódź', 'Wrocław', 'Poznań',
  'Gdańsk', 'Szczecin', 'Bydgoszcz', 'Lublin', 'Białystok',
  'Katowice', 'Gdynia', 'Częstochowa', 'Radom', 'Sosnowiec'
]

const CATEGORIES = [
  { value: 'WARSZTATY', label: 'Warsztaty' },
  { value: 'SPEKTAKLE', label: 'Spektakle' },
  { value: 'SPORT', label: 'Sport i rekreacja' },
  { value: 'EDUKACJA', label: 'Edukacja' },
  { value: 'INNE', label: 'Inne' }
]

export default function EditEventPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { user } = useAuth()
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
    imageUrl: ''
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
        imageUrl: data.image_url || ''
      })
    } catch (error) {
      console.error('Error loading event:', error)
      toast.error('Błąd ładowania wydarzenia')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    if (!user) {
      toast.error('Musisz być zalogowany')
      return
    }

    setSubmitting(true)

    try {
      // Convert camelCase to snake_case for database
      const updates = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        age_min: formData.ageMin,
        age_max: formData.ageMax,
        price_type: formData.priceType,
        price: formData.priceType === 'FREE' ? null : formData.price,
        location_name: formData.locationName,
        address: formData.address,
        city: formData.city,
        start_date: formData.startDate,
        end_date: formData.endDate || null,
        tags: formData.tags,
        image_url: formData.imageUrl || null
      }

      const { error } = await supabase
        .from('events')
        .update(updates)
        .eq('id', params.id)

      if (error) throw error

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

    try {
      const { error } = await supabase
        .from('events')
        .update({ status: 'ARCHIVED' })
        .eq('id', params.id)

      if (error) throw error

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
              {CATEGORIES.map(cat => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
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
            <input
              type="text"
              required
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Miasto *
            </label>
            <select
              required
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Wybierz miasto</option>
              {CITIES.map(city => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </div>

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