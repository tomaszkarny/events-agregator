import { createBrowserClient } from '@supabase/ssr'

// Single source of truth for Supabase client
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const hostname = typeof window !== 'undefined' ? window.location.hostname : 'server'
  
  console.log('Creating Supabase client with:', {
    url: url ? `${url.substring(0, 20)}...` : 'MISSING',
    key: key ? `${key.substring(0, 20)}...` : 'MISSING',
    hostname: hostname,
    userAgent: typeof window !== 'undefined' ? navigator.userAgent.substring(0, 50) + '...' : 'server'
  })
  
  if (!url || !key) {
    console.error('Missing Supabase environment variables')
    // Return a mock client that won't crash the app
    return {
      auth: {
        getSession: async () => ({ data: { session: null }, error: new Error('Supabase not configured') }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
        signInWithPassword: async () => ({ error: new Error('Supabase not configured') }),
        signInWithOAuth: async () => ({ error: new Error('Supabase not configured') }),
        signUp: async () => ({ error: new Error('Supabase not configured') }),
        signOut: async () => ({ error: new Error('Supabase not configured') }),
      },
      from: () => ({
        select: () => ({
          eq: () => ({
            single: async () => ({ data: null, error: new Error('Supabase not configured') })
          })
        })
      })
    } as any
  }
  
  return createBrowserClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  })
}

// Create singleton instance
let supabaseInstance: ReturnType<typeof createClient> | null = null

// Export singleton instance for convenience
export const supabase = (() => {
  if (!supabaseInstance) {
    supabaseInstance = createClient()
  }
  return supabaseInstance
})()