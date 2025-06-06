'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User, Session, AuthChangeEvent } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase-client'
import { getProfile } from '@/lib/supabase-queries'
import type { Database } from '../../../lib/supabase-types'

type Profile = Database['public']['Tables']['profiles']['Row']

interface AuthContextType {
  user: User | null
  profile: Profile | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signUp: (email: string, password: string, metadata?: any) => Promise<{ error: any }>
  signOut: () => Promise<{ error: any }>
  signInWithProvider: (provider: 'google' | 'facebook' | 'github' | 'apple') => Promise<{ error: any }>
  getAccessToken: () => Promise<string | null>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  
  // Add debug logging
  useEffect(() => {
    console.log('AuthProvider state:', { user: user?.email, loading, session: !!session })
  }, [user, loading, session])

  // Load user profile
  const loadProfile = async (userId: string) => {
    try {
      // First ensure profile exists using safe RPC function
      console.log('Ensuring profile exists for user:', userId)
      const { error: ensureError } = await supabase
        .rpc('ensure_profile_exists')
      
      if (ensureError) {
        console.error('ensure_profile_exists error:', ensureError)
      }
      
      // Now load the profile
      const profileData = await getProfile(userId)
      if (profileData) {
        setProfile(profileData)
      } else {
        console.log('Profile not found after ensure_profile_exists')
      }
    } catch (error) {
      console.error('Error loading profile:', error)
      // Don't throw - profile might not exist yet
    }
  }

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') {
      console.log('AuthProvider: Skipping - not on client')
      return
    }
    
    // Get initial session
    console.log('AuthProvider: Getting initial session...')
    const initAuth = async () => {
      // Add timeout to prevent infinite hanging
      const timeoutId = setTimeout(() => {
        console.warn('AuthProvider: Session check timed out after 5s')
        setLoading(false)
      }, 5000)
      
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        clearTimeout(timeoutId)
        console.log('AuthProvider: Session response:', { 
          hasSession: !!session, 
          hasError: !!error,
          errorMessage: error?.message 
        })
        
        if (error) {
          console.error('AuthProvider: Session error:', error)
          // Don't fail hard on auth errors - allow app to load
          setLoading(false)
          return
        }
        
        setSession(session)
        setUser(session?.user ?? null)
        
        if (session?.user) {
          // Load profile but don't block on it
          loadProfile(session.user.id).catch(err => {
            console.warn('AuthProvider: Profile load failed:', err)
          })
        }
      } catch (error) {
        console.error('AuthProvider: Error initializing auth:', error)
      } finally {
        setLoading(false)
      }
    }
    
    initAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: AuthChangeEvent, session: Session | null) => {
      console.log('Auth event:', event)
      setSession(session)
      setUser(session?.user ?? null)
      
      if (session?.user) {
        // Load profile but don't block on it
        loadProfile(session.user.id).catch(err => {
          console.warn('AuthProvider: Profile load failed on auth change:', err)
        })
      } else {
        setProfile(null)
      }
      
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { error }
  }

  const signUp = async (email: string, password: string, metadata?: any) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
      },
    })
    return { error }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    return { error }
  }

  const signInWithProvider = async (provider: 'google' | 'facebook' | 'github' | 'apple') => {
    console.log('Signing in with provider:', provider)
    console.log('Redirect URL:', `${window.location.origin}/auth/callback`)
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    })
    
    if (error) {
      console.error('OAuth error:', error)
    } else {
      console.log('OAuth initiated:', data)
    }
    
    return { error }
  }

  const getAccessToken = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token || null
  }

  const value = {
    user,
    profile,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    signInWithProvider,
    getAccessToken,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}