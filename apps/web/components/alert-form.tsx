'use client'

import { useState, useEffect } from 'react'
import { POLISH_CITIES } from '@events-agregator/shared'
import { Alert, AlertFilters, CreateAlertInput } from '@/hooks/use-alerts'
import { useAuth } from '@/contexts/auth-context-v2'

interface AlertFormProps {
  alert?: Alert
  onSubmit: (data: CreateAlertInput) => void
  onCancel: () => void
  isSubmitting?: boolean
}

const CATEGORIES = [
  { value: 'WARSZTATY', label: 'Warsztaty' },
  { value: 'SPEKTAKLE', label: 'Spektakle' },
  { value: 'SPORT', label: 'Sport i rekreacja' },
  { value: 'EDUKACJA', label: 'Edukacja' },
  { value: 'INNE', label: 'Inne' },
]

export function AlertForm({ alert, onSubmit, onCancel, isSubmitting }: AlertFormProps) {
  const { profile } = useAuth()
  const isPro = profile?.subscription_tier === 'PRO'
  
  const [formData, setFormData] = useState<CreateAlertInput>({
    name: alert?.name || '',
    filters: {
      cities: alert?.filters.cities || [],
      categories: alert?.filters.categories || [],
      ageMin: alert?.filters.ageMin,
      ageMax: alert?.filters.ageMax,
      keywords: alert?.filters.keywords || [],
      priceType: alert?.filters.priceType || 'any',
    },
    frequency: alert?.frequency || 'WEEKLY',
    channels: alert?.channels || ['EMAIL'],
  })

  const [keywordInput, setKeywordInput] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  const toggleCity = (city: string) => {
    setFormData(prev => ({
      ...prev,
      filters: {
        ...prev.filters,
        cities: prev.filters.cities?.includes(city)
          ? prev.filters.cities.filter(c => c !== city)
          : [...(prev.filters.cities || []), city],
      },
    }))
  }

  const toggleCategory = (category: string) => {
    setFormData(prev => ({
      ...prev,
      filters: {
        ...prev.filters,
        categories: prev.filters.categories?.includes(category)
          ? prev.filters.categories.filter(c => c !== category)
          : [...(prev.filters.categories || []), category],
      },
    }))
  }

  const toggleChannel = (channel: 'PUSH' | 'EMAIL' | 'IN_APP') => {
    setFormData(prev => ({
      ...prev,
      channels: prev.channels.includes(channel)
        ? prev.channels.filter(c => c !== channel)
        : [...prev.channels, channel],
    }))
  }

  const addKeyword = () => {
    if (keywordInput.trim() && !formData.filters.keywords?.includes(keywordInput.trim())) {
      setFormData(prev => ({
        ...prev,
        filters: {
          ...prev.filters,
          keywords: [...(prev.filters.keywords || []), keywordInput.trim()],
        },
      }))
      setKeywordInput('')
    }
  }

  const removeKeyword = (keyword: string) => {
    setFormData(prev => ({
      ...prev,
      filters: {
        ...prev.filters,
        keywords: prev.filters.keywords?.filter(k => k !== keyword) || [],
      },
    }))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Alert Name */}
      <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
        <label htmlFor="name" className="block text-base font-semibold text-gray-900 mb-2">
          🏷️ Nazwa alertu
          <span className="text-red-500 ml-1">*</span>
        </label>
        <input
          type="text"
          id="name"
          required
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          className="mt-1 block w-full rounded-md border-2 border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-lg p-3 font-medium"
          placeholder="np. Warsztaty plastyczne w Warszawie"
        />
        <p className="mt-2 text-sm text-gray-600">
          Nadaj nazwę która pomoże Ci rozpoznać ten alert (np. "Weekendowe warsztaty dla 5-latka")
        </p>
      </div>

      {/* Cities */}
      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
        <label className="block text-base font-semibold text-gray-900 mb-3">
          📍 Miasta
        </label>
        <p className="text-sm text-gray-600 mb-3">
          Wybierz miasta, z których chcesz otrzymywać powiadomienia (brak wyboru = wszystkie miasta)
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {POLISH_CITIES.map(city => (
            <label key={city} className="flex items-center p-2 rounded hover:bg-gray-100 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.filters.cities?.includes(city) || false}
                onChange={() => toggleCity(city)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">{city}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Categories */}
      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
        <label className="block text-base font-semibold text-gray-900 mb-3">
          🎯 Kategorie wydarzeń
        </label>
        <p className="text-sm text-gray-600 mb-3">
          Jakie rodzaje wydarzeń Cię interesują?
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {CATEGORIES.map(category => (
            <label key={category.value} className="flex items-center p-3 bg-white rounded-lg border border-gray-200 hover:bg-blue-50 hover:border-blue-300 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={formData.filters.categories?.includes(category.value) || false}
                onChange={() => toggleCategory(category.value)}
                className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="ml-3 text-sm font-medium text-gray-700">{category.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Age Range */}
      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
        <label className="block text-base font-semibold text-gray-900 mb-3">
          👶 Zakres wieku dziecka
        </label>
        <p className="text-sm text-gray-600 mb-3">
          Dla jakiego wieku szukasz wydarzeń?
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="ageMin" className="block text-sm font-medium text-gray-700 mb-1">
              Wiek od
            </label>
            <input
              type="number"
              id="ageMin"
              min="0"
              max="18"
              value={formData.filters.ageMin || ''}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                filters: { ...prev.filters, ageMin: e.target.value ? Number(e.target.value) : undefined }
              }))}
              className="block w-full rounded-md border-2 border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-lg p-2"
              placeholder="0"
            />
          </div>
          <div>
            <label htmlFor="ageMax" className="block text-sm font-medium text-gray-700 mb-1">
              Wiek do
            </label>
            <input
              type="number"
              id="ageMax"
              min="0"
              max="18"
              value={formData.filters.ageMax || ''}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                filters: { ...prev.filters, ageMax: e.target.value ? Number(e.target.value) : undefined }
              }))}
              className="block w-full rounded-md border-2 border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-lg p-2"
              placeholder="18"
            />
          </div>
        </div>
      </div>

      {/* Price Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Typ ceny
        </label>
        <div className="space-y-2">
          <label className="flex items-center">
            <input
              type="radio"
              value="any"
              checked={formData.filters.priceType === 'any'}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                filters: { ...prev.filters, priceType: 'any' }
              }))}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
            />
            <span className="ml-2 text-sm text-gray-700">Wszystkie</span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              value="free"
              checked={formData.filters.priceType === 'free'}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                filters: { ...prev.filters, priceType: 'free' }
              }))}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
            />
            <span className="ml-2 text-sm text-gray-700">Tylko darmowe</span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              value="paid"
              checked={formData.filters.priceType === 'paid'}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                filters: { ...prev.filters, priceType: 'paid' }
              }))}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
            />
            <span className="ml-2 text-sm text-gray-700">Tylko płatne</span>
          </label>
        </div>
      </div>

      {/* Keywords */}
      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
        <label htmlFor="keywords" className="block text-base font-semibold text-gray-900 mb-3">
          🔍 Słowa kluczowe
        </label>
        <p className="text-sm text-gray-600 mb-3">
          Dodaj słowa które pomogą znaleźć interesujące wydarzenia
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            id="keywords"
            value={keywordInput}
            onChange={(e) => setKeywordInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
            className="flex-1 rounded-md border-2 border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-lg p-2"
            placeholder="np. robotyka, teatr, LEGO"
          />
          <button
            type="button"
            onClick={addKeyword}
            className="px-5 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
          >
            Dodaj
          </button>
        </div>
        {formData.filters.keywords && formData.filters.keywords.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {formData.filters.keywords.map(keyword => (
              <span
                key={keyword}
                className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
              >
                {keyword}
                <button
                  type="button"
                  onClick={() => removeKeyword(keyword)}
                  className="ml-2 text-blue-600 hover:text-blue-800 text-lg"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Frequency */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Częstotliwość powiadomień
        </label>
        <div className="space-y-2">
          <label className="flex items-center">
            <input
              type="radio"
              value="WEEKLY"
              checked={formData.frequency === 'WEEKLY'}
              onChange={(e) => setFormData(prev => ({ ...prev, frequency: 'WEEKLY' }))}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
            />
            <span className="ml-2 text-sm text-gray-700">Co tydzień</span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              value="DAILY"
              checked={formData.frequency === 'DAILY'}
              onChange={(e) => setFormData(prev => ({ ...prev, frequency: 'DAILY' }))}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
            />
            <span className="ml-2 text-sm text-gray-700">Codziennie</span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              value="IMMEDIATE"
              checked={formData.frequency === 'IMMEDIATE'}
              onChange={(e) => setFormData(prev => ({ ...prev, frequency: 'IMMEDIATE' }))}
              disabled={!isPro}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 disabled:opacity-50"
            />
            <span className="ml-2 text-sm text-gray-700">
              Natychmiast
              {!isPro && <span className="text-yellow-600 ml-1">(PRO)</span>}
            </span>
          </label>
        </div>
      </div>

      {/* Notification Channels */}
      <div className="bg-orange-50 p-4 rounded-lg border-2 border-orange-200">
        <label className="block text-base font-semibold text-gray-900 mb-3">
          📬 Kanały powiadomień
          <span className="text-red-500 ml-1">*</span>
        </label>
        <p className="text-sm text-gray-600 mb-3">
          Wybierz jak chcesz otrzymywać powiadomienia (minimum jeden)
        </p>
        <div className="space-y-3">
          <label className="flex items-center p-3 bg-white rounded-lg border border-gray-200 hover:bg-orange-50 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.channels.includes('EMAIL')}
              onChange={() => toggleChannel('EMAIL')}
              className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="ml-3 text-sm font-medium text-gray-700">📧 Email</span>
          </label>
          <label className="flex items-center p-3 bg-white rounded-lg border border-gray-200 hover:bg-orange-50 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.channels.includes('PUSH')}
              onChange={() => toggleChannel('PUSH')}
              className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="ml-3 text-sm font-medium text-gray-700">📱 Powiadomienia push</span>
          </label>
          <label className="flex items-center p-3 bg-white rounded-lg border border-gray-200 hover:bg-orange-50 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.channels.includes('IN_APP')}
              onChange={() => toggleChannel('IN_APP')}
              className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="ml-3 text-sm font-medium text-gray-700">🔔 W aplikacji</span>
          </label>
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Anuluj
        </button>
        <button
          type="submit"
          disabled={isSubmitting || formData.channels.length === 0}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Zapisywanie...' : alert ? 'Zapisz zmiany' : 'Utwórz alert'}
        </button>
      </div>
    </form>
  )
}