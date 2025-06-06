'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/contexts/auth-context-v2'
import { Header } from '@/components/header'
import { toast } from '@/lib/toast'
import { formatDistanceToNow } from 'date-fns'
import { pl } from 'date-fns/locale'

interface Event {
  id: string
  title: string
  description: string
  location_name: string
  city: string
  start_date: string
  category: string
  organizer_name: string
  created_at: string
  status: string
  organizer: {
    email: string
    name: string
  }
}

export default function AdminDashboard() {
  const router = useRouter()
  const { user } = useAuth()
  const supabase = createClient()
  
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'pending' | 'all'>('pending')
  const [events, setEvents] = useState<Event[]>([])
  
  useEffect(() => {
    checkAdminAccess()
  }, [user])

  async function checkAdminAccess() {
    if (!user) {
      router.push('/')
      return
    }

    try {
      // Check user role
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
      
      if (!profile || (profile.role !== 'ADMIN' && profile.role !== 'MODERATOR')) {
        toast.error('Brak uprawnień administratora')
        router.push('/')
        return
      }
      
      setUserRole(profile.role)
      await loadEvents()
    } catch (error) {
      console.error('Error checking admin access:', error)
      router.push('/')
    }
  }

  async function loadEvents() {
    try {
      let query = supabase
        .from('events')
        .select(`
          *,
          organizer:profiles!events_organizer_id_fkey(
            id,
            email,
            name
          )
        `)
        .order('created_at', { ascending: false })
      
      if (activeTab === 'pending') {
        query = query.eq('status', 'DRAFT')
      }
      
      const { data, error } = await query
      
      if (error) throw error
      setEvents(data || [])
    } catch (error) {
      console.error('Error loading events:', error)
      toast.error('Błąd podczas ładowania wydarzeń')
    } finally {
      setLoading(false)
    }
  }

  async function updateEventStatus(eventId: string, newStatus: 'ACTIVE' | 'ARCHIVED') {
    try {
      const { error } = await supabase
        .from('events')
        .update({ status: newStatus })
        .eq('id', eventId)
      
      if (error) throw error
      
      toast.success(
        newStatus === 'ACTIVE' 
          ? 'Wydarzenie zostało zatwierdzone' 
          : 'Wydarzenie zostało odrzucone'
      )
      
      // Reload events
      await loadEvents()
    } catch (error) {
      console.error('Error updating event status:', error)
      toast.error('Błąd podczas aktualizacji statusu')
    }
  }

  const categoryLabels: Record<string, string> = {
    WARSZTATY: 'Warsztaty',
    SPEKTAKLE: 'Spektakle',
    SPORT: 'Sport',
    EDUKACJA: 'Edukacja',
    INNE: 'Inne'
  }

  const statusLabels: Record<string, { label: string; class: string }> = {
    DRAFT: { label: 'Oczekuje', class: 'bg-yellow-100 text-yellow-800' },
    ACTIVE: { label: 'Aktywne', class: 'bg-green-100 text-green-800' },
    ARCHIVED: { label: 'Archiwum', class: 'bg-gray-100 text-gray-800' },
    EXPIRED: { label: 'Wygasłe', class: 'bg-red-100 text-red-800' }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Ładowanie...</p>
          </div>
        </div>
      </main>
    )
  }

  if (!userRole) return null

  const pendingCount = events.filter(e => e.status === 'DRAFT').length

  return (
    <main className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Panel Administracyjny</h1>
          <p className="mt-2 text-gray-600">
            Zarządzaj wydarzeniami jako {userRole === 'ADMIN' ? 'Administrator' : 'Moderator'}
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-3xl font-bold text-yellow-600">{pendingCount}</div>
            <div className="text-gray-600">Do moderacji</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-3xl font-bold text-green-600">
              {events.filter(e => e.status === 'ACTIVE').length}
            </div>
            <div className="text-gray-600">Aktywne</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-3xl font-bold text-gray-600">
              {events.filter(e => e.status === 'ARCHIVED').length}
            </div>
            <div className="text-gray-600">Archiwum</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-3xl font-bold text-blue-600">{events.length}</div>
            <div className="text-gray-600">Wszystkie</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => {
                  setActiveTab('pending')
                  loadEvents()
                }}
                className={`py-2 px-6 text-sm font-medium ${
                  activeTab === 'pending'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Do moderacji ({pendingCount})
              </button>
              <button
                onClick={() => {
                  setActiveTab('all')
                  loadEvents()
                }}
                className={`py-2 px-6 text-sm font-medium ${
                  activeTab === 'all'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Wszystkie ({events.length})
              </button>
            </nav>
          </div>
        </div>

        {/* Events List */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {events.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600">
                {activeTab === 'pending' 
                  ? 'Brak wydarzeń do moderacji' 
                  : 'Brak wydarzeń'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Wydarzenie
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Organizator
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Data
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Akcje
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {events.map((event) => {
                    const status = statusLabels[event.status] || statusLabels.DRAFT
                    
                    return (
                      <tr key={event.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {event.title}
                            </div>
                            <div className="text-sm text-gray-500">
                              {categoryLabels[event.category]} • {event.city}
                            </div>
                            <div className="text-xs text-gray-400 mt-1">
                              Dodano {formatDistanceToNow(new Date(event.created_at), { 
                                addSuffix: true, 
                                locale: pl 
                              })}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm">
                            <div className="font-medium text-gray-900">
                              {event.organizer?.name || event.organizer_name}
                            </div>
                            <div className="text-gray-500">
                              {event.organizer?.email}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {new Date(event.start_date).toLocaleDateString('pl-PL', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                          })}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status.class}`}>
                            {status.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <div className="flex items-center gap-2">
                            <a
                              href={`/events/${event.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800"
                            >
                              Podgląd
                            </a>
                            {event.status === 'DRAFT' && (
                              <>
                                <button
                                  onClick={() => updateEventStatus(event.id, 'ACTIVE')}
                                  className="text-green-600 hover:text-green-800 font-medium"
                                >
                                  Zatwierdź
                                </button>
                                <button
                                  onClick={() => updateEventStatus(event.id, 'ARCHIVED')}
                                  className="text-red-600 hover:text-red-800 font-medium"
                                >
                                  Odrzuć
                                </button>
                              </>
                            )}
                            {event.status === 'ACTIVE' && (
                              <button
                                onClick={() => updateEventStatus(event.id, 'ARCHIVED')}
                                className="text-red-600 hover:text-red-800 font-medium"
                              >
                                Archiwizuj
                              </button>
                            )}
                            {event.status === 'ARCHIVED' && (
                              <button
                                onClick={() => updateEventStatus(event.id, 'ACTIVE')}
                                className="text-green-600 hover:text-green-800 font-medium"
                              >
                                Przywróć
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}