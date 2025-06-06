import { createBrowserClient } from '@supabase/ssr'

// Single source of truth for Supabase client
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Export singleton instance for convenience
export const supabase = createClient()