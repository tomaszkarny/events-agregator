export type AlertFrequency = 'immediate' | 'daily' | 'weekly'
export type AlertChannel = 'push' | 'email' | 'in-app'

export interface Alert {
  id: string
  userId: string
  name: string
  filters: {
    cities?: string[]
    categories?: string[]
    ageMin?: number
    ageMax?: number
    keywords?: string[]
    priceType?: 'free' | 'paid' | 'any'
  }
  frequency: AlertFrequency
  channels: AlertChannel[]
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  lastTriggeredAt?: Date
}

export interface Subscription {
  id: string
  userId: string
  stripeCustomerId: string
  stripeSubscriptionId: string
  status: 'active' | 'canceled' | 'past_due' | 'trialing'
  currentPeriodStart: Date
  currentPeriodEnd: Date
  canceledAt?: Date
  createdAt: Date
  updatedAt: Date
}