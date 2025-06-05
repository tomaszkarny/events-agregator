// Generated types from Supabase schema
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          name: string | null
          avatar_url: string | null
          role: 'USER' | 'ORGANIZER' | 'ADMIN' | 'MODERATOR'
          subscription_tier: 'FREE' | 'PRO'
          created_at: string
          updated_at: string
          last_login_at: string | null
        }
        Insert: {
          id: string
          email: string
          name?: string | null
          avatar_url?: string | null
          role?: 'USER' | 'ORGANIZER' | 'ADMIN' | 'MODERATOR'
          subscription_tier?: 'FREE' | 'PRO'
          created_at?: string
          updated_at?: string
          last_login_at?: string | null
        }
        Update: {
          id?: string
          email?: string
          name?: string | null
          avatar_url?: string | null
          role?: 'USER' | 'ORGANIZER' | 'ADMIN' | 'MODERATOR'
          subscription_tier?: 'FREE' | 'PRO'
          created_at?: string
          updated_at?: string
          last_login_at?: string | null
        }
      }
      events: {
        Row: {
          id: string
          title: string
          description: string
          age_min: number
          age_max: number
          price_type: 'FREE' | 'PAID' | 'DONATION'
          price: number | null
          currency: string
          location_name: string
          address: string
          lat: number
          lng: number
          city: string
          postal_code: string | null
          organizer_name: string
          organizer_id: string | null
          source_url: string
          source_hash: string | null
          source_id: string | null
          source_name: string | null
          image_urls: string[] | null
          start_date: string
          end_date: string | null
          category: 'WARSZTATY' | 'SPEKTAKLE' | 'SPORT' | 'EDUKACJA' | 'INNE'
          tags: string[] | null
          status: 'DRAFT' | 'ACTIVE' | 'EXPIRED' | 'ARCHIVED'
          view_count: number
          click_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description: string
          age_min: number
          age_max: number
          price_type: 'FREE' | 'PAID' | 'DONATION'
          price?: number | null
          currency?: string
          location_name: string
          address: string
          lat: number
          lng: number
          city: string
          postal_code?: string | null
          organizer_name: string
          organizer_id?: string | null
          source_url: string
          source_hash?: string | null
          source_id?: string | null
          source_name?: string | null
          image_urls?: string[] | null
          start_date: string
          end_date?: string | null
          category: 'WARSZTATY' | 'SPEKTAKLE' | 'SPORT' | 'EDUKACJA' | 'INNE'
          tags?: string[] | null
          status?: 'DRAFT' | 'ACTIVE' | 'EXPIRED' | 'ARCHIVED'
          view_count?: number
          click_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string
          age_min?: number
          age_max?: number
          price_type?: 'FREE' | 'PAID' | 'DONATION'
          price?: number | null
          currency?: string
          location_name?: string
          address?: string
          lat?: number
          lng?: number
          city?: string
          postal_code?: string | null
          organizer_name?: string
          organizer_id?: string | null
          source_url?: string
          source_hash?: string | null
          source_id?: string | null
          source_name?: string | null
          image_urls?: string[] | null
          start_date?: string
          end_date?: string | null
          category?: 'WARSZTATY' | 'SPEKTAKLE' | 'SPORT' | 'EDUKACJA' | 'INNE'
          tags?: string[] | null
          status?: 'DRAFT' | 'ACTIVE' | 'EXPIRED' | 'ARCHIVED'
          view_count?: number
          click_count?: number
          created_at?: string
          updated_at?: string
        }
      }
      child_profiles: {
        Row: {
          id: string
          user_id: string
          name: string
          age: number
          interests: string[] | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          age: number
          interests?: string[] | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          age?: number
          interests?: string[] | null
          created_at?: string
          updated_at?: string
        }
      }
      alerts: {
        Row: {
          id: string
          user_id: string
          name: string
          filters: Json
          frequency: 'IMMEDIATE' | 'DAILY' | 'WEEKLY'
          channels: ('PUSH' | 'EMAIL' | 'IN_APP')[]
          is_active: boolean
          created_at: string
          updated_at: string
          last_triggered_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          filters: Json
          frequency: 'IMMEDIATE' | 'DAILY' | 'WEEKLY'
          channels: ('PUSH' | 'EMAIL' | 'IN_APP')[]
          is_active?: boolean
          created_at?: string
          updated_at?: string
          last_triggered_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          filters?: Json
          frequency?: 'IMMEDIATE' | 'DAILY' | 'WEEKLY'
          channels?: ('PUSH' | 'EMAIL' | 'IN_APP')[]
          is_active?: boolean
          created_at?: string
          updated_at?: string
          last_triggered_at?: string | null
        }
      }
      subscriptions: {
        Row: {
          id: string
          user_id: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          status: string
          current_period_start: string
          current_period_end: string
          canceled_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          status: string
          current_period_start: string
          current_period_end: string
          canceled_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          status?: string
          current_period_start?: string
          current_period_end?: string
          canceled_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      user_favorite_events: {
        Row: {
          user_id: string
          event_id: string
          created_at: string
        }
        Insert: {
          user_id: string
          event_id: string
          created_at?: string
        }
        Update: {
          user_id?: string
          event_id?: string
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      event_status: 'DRAFT' | 'ACTIVE' | 'EXPIRED' | 'ARCHIVED'
      price_type: 'FREE' | 'PAID' | 'DONATION'
      event_category: 'WARSZTATY' | 'SPEKTAKLE' | 'SPORT' | 'EDUKACJA' | 'INNE'
      user_role: 'USER' | 'ORGANIZER' | 'ADMIN' | 'MODERATOR'
      subscription_tier: 'FREE' | 'PRO'
      alert_frequency: 'IMMEDIATE' | 'DAILY' | 'WEEKLY'
      alert_channel: 'PUSH' | 'EMAIL' | 'IN_APP'
    }
  }
}