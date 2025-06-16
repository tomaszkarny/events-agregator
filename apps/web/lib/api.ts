import { EventsSearchResponse, EventApiResponse, UserProfile } from './types'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

export interface ApiError {
  message: string
  status: number
}

class ApiClient {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_URL}/api${endpoint}`
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      credentials: 'include',
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error?.message || 'API Error')
    }

    return response.json()
  }

  // Events
  async searchEvents(params: {
    city?: string
    category?: string
    ageMin?: number
    ageMax?: number
    priceType?: string
    search?: string
    cursor?: string
  }) {
    const query = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        query.append(key, value.toString())
      }
    })

    return this.request<EventsSearchResponse>(`/events?${query}`)
  }

  async getEvent(id: string) {
    return this.request<EventApiResponse>(`/events/${id}`)
  }

  async trackClick(eventId: string) {
    return this.request(`/events/${eventId}/click`, {
      method: 'POST',
    })
  }

  async createEvent(token: string, data: Partial<EventApiResponse>) {
    return this.request<EventApiResponse>('/events', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    })
  }

  async updateEvent(token: string, id: string, data: Partial<EventApiResponse>) {
    return this.request<EventApiResponse>(`/events/${id}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    })
  }

  async deleteEvent(token: string, id: string) {
    return this.request(`/events/${id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
  }

  // Auth
  async login(email: string, password: string) {
    return this.request<{
      user: UserProfile
      session: any
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
  }

  async register(email: string, password: string, name?: string) {
    return this.request<{
      user: UserProfile
      session: any
    }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    })
  }

  async getProfile(token: string) {
    return this.request<UserProfile>('/auth/profile', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
  }

  async logout(token: string) {
    return this.request('/auth/logout', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
  }

  // Alerts
  async getAlerts(token: string) {
    return this.request<Array<{
      id: string
      name: string
      filters: any
      frequency: 'IMMEDIATE' | 'DAILY' | 'WEEKLY'
      channels: ('PUSH' | 'EMAIL' | 'IN_APP')[]
      is_active: boolean
      created_at: string
      updated_at: string
      user_id: string
    }>>('/alerts', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
  }

  async createAlert(token: string, data: {name: string; filters: any; frequency: string; channels: string[]}) {
    return this.request<{
      id: string
      name: string
      filters: any
      frequency: 'IMMEDIATE' | 'DAILY' | 'WEEKLY'
      channels: ('PUSH' | 'EMAIL' | 'IN_APP')[]
      is_active: boolean
      created_at: string
      updated_at: string
      user_id: string
    }>('/alerts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    })
  }

  async updateAlert(token: string, id: string, data: Partial<{name: string; filters: any; frequency: string; channels: string[]; isActive: boolean}>) {
    return this.request<{
      id: string
      name: string
      filters: any
      frequency: 'IMMEDIATE' | 'DAILY' | 'WEEKLY'
      channels: ('PUSH' | 'EMAIL' | 'IN_APP')[]
      is_active: boolean
      created_at: string
      updated_at: string
      user_id: string
    }>(`/alerts/${id}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    })
  }

  async deleteAlert(token: string, id: string) {
    return this.request(`/alerts/${id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
  }
}

export const api = new ApiClient()