import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '../../../lib/supabase-types'

// Single source of truth for Supabase client
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Export singleton instance for convenience
export const supabase = createClient()