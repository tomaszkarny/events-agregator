'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/header'
import { AlertForm } from '@/components/alert-form'
import { useAuth } from '@/contexts/auth-context-v2'
import { 
  useAlerts, 
  useCreateAlert, 
  useUpdateAlert, 
  useDeleteAlert,
  useToggleAlertStatus,
  Alert 
} from '@/hooks/use-alerts'
import { toast } from '@/lib/toast'

export default function AlertsPage() {
  const router = useRouter()
  const { user, profile, loading: authLoading } = useAuth()
  const { data: alerts = [], isLoading, error } = useAlerts()
  const createAlert = useCreateAlert()
  const updateAlert = useUpdateAlert()
  const deleteAlert = useDeleteAlert()
  const toggleStatus = useToggleAlertStatus()
  
  const [showForm, setShowForm] = useState(false)
  const [editingAlert, setEditingAlert] = useState<Alert | null>(null)

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      toast.error('Musisz być zalogowany aby zarządzać alertami')
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

  const isPro = profile?.subscription_tier === 'PRO'
  const canCreateMore = alerts.length < 10

  const handleCreateAlert = async (data: any) => {
    try {
      await createAlert.mutateAsync(data)
      setShowForm(false)
    } catch (error) {
      // Error handled by mutation
    }
  }

  const handleUpdateAlert = async (data: any) => {
    if (!editingAlert) return
    try {
      await updateAlert.mutateAsync({ id: editingAlert.id, ...data })
      setEditingAlert(null)
    } catch (error) {
      // Error handled by mutation
    }
  }

  const handleDeleteAlert = async (alertId: string) => {
    if (!confirm('Czy na pewno chcesz usunąć ten alert?')) return
    try {
      await deleteAlert.mutateAsync(alertId)
    } catch (error) {
      // Error handled by mutation
    }
  }

  const handleToggleStatus = async (alertId: string, currentStatus: boolean) => {
    try {
      await toggleStatus.mutateAsync({ id: alertId, isActive: !currentStatus })
    } catch (error) {
      // Error handled by mutation
    }
  }

  const formatFrequency = (frequency: string) => {
    const labels = {
      IMMEDIATE: 'Natychmiast',
      DAILY: 'Codziennie',
      WEEKLY: 'Co tydzień'
    }
    return labels[frequency as keyof typeof labels] || frequency
  }

  const formatChannels = (channels: string[]) => {
    const labels = {
      EMAIL: 'Email',
      PUSH: 'Push',
      IN_APP: 'W aplikacji'
    }
    return channels.map(ch => labels[ch as keyof typeof labels] || ch).join(', ')
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <Header />
      
      {/* Page Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Alerty o wydarzeniach
              </h1>
              <p className="mt-2 text-gray-600">
                Otrzymuj powiadomienia o nowych wydarzeniach pasujących do Twoich kryteriów
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-500">
                {alerts.length} / 10 alertów
              </div>
              {!isPro && (
                <div className="text-sm text-yellow-600 bg-yellow-50 px-3 py-1 rounded-full">
                  ⚡ Upgrade do PRO dla alertów natychmiastowych
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Alert limit warning - moved to top */}
        {!canCreateMore && !showForm && !editingAlert && (
          <div className="mb-6 bg-gradient-to-r from-orange-100 to-yellow-100 border-2 border-orange-300 rounded-lg p-6 shadow-lg">
            <div className="flex items-center justify-center mb-3">
              <div className="bg-orange-500 text-white rounded-full p-2 mr-3">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.732 15.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-orange-800">Osiągnięto limit alertów!</h3>
            </div>
            <p className="text-center text-orange-700 font-medium mb-4">
              Masz już maksymalną liczbę 10 alertów. Aby dodać nowy alert, musisz najpierw usunąć istniejący.
            </p>
            <div className="text-center">
              <p className="text-sm text-orange-600">
                💡 <strong>Wskazówka:</strong> Kliknij czerwony przycisk 🗑️ przy alercie, który chcesz usunąć
              </p>
            </div>
          </div>
        )}

        {/* Form for creating/editing alert */}
        {(showForm || editingAlert) && (
          <div className="mb-8 bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              {editingAlert ? 'Edytuj alert' : 'Utwórz nowy alert'}
            </h2>
            <AlertForm
              alert={editingAlert || undefined}
              onSubmit={editingAlert ? handleUpdateAlert : handleCreateAlert}
              onCancel={() => {
                setShowForm(false)
                setEditingAlert(null)
              }}
              isSubmitting={createAlert.isPending || updateAlert.isPending}
            />
          </div>
        )}

        {/* Add new alert button */}
        {!showForm && !editingAlert && canCreateMore && (
          <div className="mb-6">
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Dodaj nowy alert
            </button>
          </div>
        )}

        {/* Alerts list */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            <p className="mt-2 text-gray-600">Ładowanie alertów...</p>
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
                Błąd podczas ładowania alertów
              </h3>
              <p className="text-gray-600">
                Nie udało się załadować Twoich alertów. Spróbuj ponownie.
              </p>
            </div>
          </div>
        ) : alerts.length === 0 ? (
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
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
              <h3 className="mt-6 text-lg font-medium text-gray-900">
                Nie masz jeszcze żadnych alertów
              </h3>
              <p className="mt-2 text-gray-600">
                Utwórz alert, aby otrzymywać powiadomienia o nowych wydarzeniach.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`bg-white shadow rounded-lg p-6 ${
                  !alert.is_active ? 'opacity-60' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-medium text-gray-900">
                        {alert.name}
                      </h3>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          alert.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {alert.is_active ? 'Aktywny' : 'Wyłączony'}
                      </span>
                    </div>
                    
                    <div className="mt-2 space-y-1 text-sm text-gray-600">
                      {alert.filters.cities && alert.filters.cities.length > 0 && (
                        <p>
                          <span className="font-medium">Miasta:</span> {alert.filters.cities.join(', ')}
                        </p>
                      )}
                      {alert.filters.categories && alert.filters.categories.length > 0 && (
                        <p>
                          <span className="font-medium">Kategorie:</span> {alert.filters.categories.join(', ')}
                        </p>
                      )}
                      {(alert.filters.ageMin !== undefined || alert.filters.ageMax !== undefined) && (
                        <p>
                          <span className="font-medium">Wiek:</span> {alert.filters.ageMin || 0} - {alert.filters.ageMax || 18} lat
                        </p>
                      )}
                      {alert.filters.keywords && alert.filters.keywords.length > 0 && (
                        <p>
                          <span className="font-medium">Słowa kluczowe:</span> {alert.filters.keywords.join(', ')}
                        </p>
                      )}
                      {alert.filters.priceType && alert.filters.priceType !== 'any' && (
                        <p>
                          <span className="font-medium">Typ ceny:</span> {alert.filters.priceType === 'free' ? 'Darmowe' : 'Płatne'}
                        </p>
                      )}
                    </div>

                    <div className="mt-3 flex items-center gap-4 text-sm">
                      <span className="text-gray-500">
                        <span className="font-medium">Częstotliwość:</span> {formatFrequency(alert.frequency)}
                      </span>
                      <span className="text-gray-500">
                        <span className="font-medium">Kanały:</span> {formatChannels(alert.channels)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => handleToggleStatus(alert.id, alert.is_active)}
                      className="p-2 bg-gray-100 text-gray-600 hover:text-gray-800 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded border"
                      title={alert.is_active ? 'Wyłącz alert' : 'Włącz alert'}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {alert.is_active ? (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        )}
                      </svg>
                    </button>
                    <button
                      onClick={() => setEditingAlert(alert)}
                      className="p-2 bg-blue-50 text-blue-600 hover:text-blue-800 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded border"
                      title="Edytuj alert"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDeleteAlert(alert.id)}
                      className="p-2 bg-red-50 text-red-600 hover:text-red-800 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 rounded border"
                      title="Usuń alert"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
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