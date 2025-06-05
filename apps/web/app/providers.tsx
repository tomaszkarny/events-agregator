'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { AuthProvider } from '@/contexts/auth-context-v2'
import { Toaster } from '@/lib/toast'
import { ErrorBoundary } from '@/components/error-boundary'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: 1,
          },
          mutations: {
            retry: 1,
          },
        },
      })
  )

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          {children}
          <Toaster position="top-right" />
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}