export type UserRole = 'user' | 'organizer' | 'admin' | 'moderator'
export type SubscriptionTier = 'free' | 'pro'

export interface User {
  id: string
  email: string
  name?: string
  avatarUrl?: string
  role: UserRole
  subscriptionTier: SubscriptionTier
  createdAt: Date
  updatedAt: Date
  lastLoginAt?: Date
}

export interface ChildProfile {
  id: string
  userId: string
  name: string
  age: number
  interests: string[]
  createdAt: Date
  updatedAt: Date
}