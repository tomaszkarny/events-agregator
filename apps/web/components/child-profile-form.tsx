'use client'

import { useState } from 'react'
import { ChildProfile } from '@/lib/types'
import { toast } from '@/lib/toast'
import { createChildProfile, updateChildProfile } from '@/lib/supabase-queries'

interface ChildProfileFormProps {
  profile?: ChildProfile
  onSuccess: () => void
  onCancel: () => void
}

const COMMON_INTERESTS = [
  'Sport', 'Muzyka', 'Sztuka', 'Taniec', 'Teatr', 'Czytanie',
  'Nauka', 'Przyroda', 'Gry', 'LEGO', 'Gotowanie', 'Języki',
  'Robotyka', 'Programowanie', 'Zwierzęta', 'Podróże'
]

export function ChildProfileForm({ profile, onSuccess, onCancel }: ChildProfileFormProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: profile?.name || '',
    age: profile?.age || 5,
    interests: profile?.interests || []
  })
  const [newInterest, setNewInterest] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      toast.error('Imię jest wymagane')
      return
    }

    if (formData.age < 0 || formData.age > 18) {
      toast.error('Wiek musi być między 0 a 18 lat')
      return
    }

    setLoading(true)

    try {
      console.log('Submitting child profile data:', formData)
      
      if (profile) {
        console.log('Updating existing profile:', profile.id)
        const result = await updateChildProfile(profile.id, formData)
        console.log('Update result:', result)
        toast.success('Profil dziecka zaktualizowany')
      } else {
        console.log('Creating new profile...')
        const result = await createChildProfile(formData)
        console.log('Create result:', result)
        toast.success('Profil dziecka utworzony')
      }
      onSuccess()
    } catch (error: any) {
      console.error('Error saving child profile:', error)
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        stack: error.stack
      })
      
      
      // Show appropriate error messages
      if (error.message?.includes('JWT')) {
        toast.error('Błąd autoryzacji - spróbuj się wylogować i zalogować ponownie')
      } else if (error.message?.includes('RLS')) {
        toast.error('Błąd uprawnień - spróbuj się wylogować i zalogować ponownie')
      } else if (error.message?.includes('connection')) {
        toast.error('Błąd połączenia z bazą danych')
      } else {
        toast.error(`Błąd podczas zapisywania profilu: ${error.message || 'Nieznany błąd'}`)
      }
    } finally {
      setLoading(false)
    }
  }

  const addInterest = (interest: string) => {
    const trimmed = interest.trim()
    if (trimmed && !formData.interests.includes(trimmed)) {
      setFormData({
        ...formData,
        interests: [...formData.interests, trimmed]
      })
    }
    setNewInterest('')
  }

  const removeInterest = (interest: string) => {
    setFormData({
      ...formData,
      interests: formData.interests.filter(i => i !== interest)
    })
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (newInterest.trim()) {
        addInterest(newInterest)
      }
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Imię dziecka *
        </label>
        <input
          type="text"
          required
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="np. Kasia"
        />
      </div>

      {/* Age */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Wiek *
        </label>
        <div className="flex items-center space-x-3">
          <input
            type="number"
            required
            min="0"
            max="18"
            value={formData.age}
            onChange={(e) => setFormData({ ...formData, age: parseInt(e.target.value) || 0 })}
            className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-gray-600">lat</span>
        </div>
      </div>

      {/* Interests */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Zainteresowania
        </label>
        <div className="space-y-3">
          {/* Current interests */}
          {formData.interests.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {formData.interests.map((interest) => (
                <span
                  key={interest}
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                >
                  {interest}
                  <button
                    type="button"
                    onClick={() => removeInterest(interest)}
                    className="ml-2 text-blue-600 hover:text-blue-800"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Add new interest */}
          <div className="flex gap-2">
            <input
              type="text"
              value={newInterest}
              onChange={(e) => setNewInterest(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Dodaj zainteresowanie..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={() => addInterest(newInterest)}
              disabled={!newInterest.trim()}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Dodaj
            </button>
          </div>

          {/* Common interests suggestions */}
          <div className="pt-2">
            <p className="text-xs text-gray-500 mb-2">Popularne zainteresowania:</p>
            <div className="flex flex-wrap gap-1">
              {COMMON_INTERESTS.filter(i => !formData.interests.includes(i)).map((interest) => (
                <button
                  key={interest}
                  type="button"
                  onClick={() => addInterest(interest)}
                  className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200"
                >
                  + {interest}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Anuluj
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
        >
          {loading ? 'Zapisywanie...' : profile ? 'Zapisz zmiany' : 'Dodaj dziecko'}
        </button>
      </div>
    </form>
  )
}