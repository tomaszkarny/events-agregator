import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toggleFavorite, getUserFavorites } from '@/lib/supabase-queries'
import { useAuth } from '@/contexts/auth-context-v2'
import { toast } from '@/lib/toast'
import { EventApiResponse } from '@/lib/types'

// Hook to manage user's favorite events
export function useFavorites() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['favorites', user?.id],
    queryFn: () => getUserFavorites(),
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Hook to check if a specific event is favorited
export function useIsFavorited(eventId: string) {
  const { data: favorites = [], isLoading } = useFavorites()
  
  return {
    isFavorited: favorites.some((event: EventApiResponse) => event.id === eventId),
    isLoading
  }
}

// Interface for toggle favorite parameters
interface ToggleFavoriteParams {
  eventId: string
  eventData?: EventApiResponse // Optional full event data for optimistic updates
}

// Hook to toggle favorite status with complete optimistic updates
export function useToggleFavorite() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async ({ eventId }: ToggleFavoriteParams) => {
      if (!user) {
        throw new Error('Musisz być zalogowany aby dodać do ulubionych')
      }
      return toggleFavorite(eventId)
    },
    
    // Complete optimistic update implementation
    onMutate: async ({ eventId, eventData }: ToggleFavoriteParams) => {
      // Cancel any outgoing refetches to avoid race conditions
      await queryClient.cancelQueries({ queryKey: ['favorites', user?.id] })

      // Snapshot the previous value for rollback
      const previousFavorites = queryClient.getQueryData<EventApiResponse[]>(['favorites', user?.id])

      // Optimistically update the cache
      queryClient.setQueryData<EventApiResponse[]>(['favorites', user?.id], (old = []) => {
        const isCurrentlyFavorited = old.some(event => event.id === eventId)
        
        if (isCurrentlyFavorited) {
          // Remove from favorites
          return old.filter(event => event.id !== eventId)
        } else {
          // Add to favorites - use full event data if available
          if (eventData) {
            return [...old, eventData]
          } else {
            // If no event data provided, just trigger refetch (fallback)
            return old
          }
        }
      })

      // Return context with snapshot for rollback
      return { previousFavorites, wasOptimistic: !!eventData }
    },

    // Roll back on error
    onError: (err, { eventId }, context) => {
      // Restore previous state if optimistic update was made
      if (context?.previousFavorites && context.wasOptimistic) {
        queryClient.setQueryData(['favorites', user?.id], context.previousFavorites)
      }
      
      // User-friendly error messages
      if (err.message.includes('zalogowany')) {
        toast.error(err.message)
      } else {
        toast.error('Nie udało się zaktualizować ulubionych')
      }
    },

    // Ensure data consistency
    onSettled: (data, error, { eventData }, context) => {
      // Only refetch if optimistic update wasn't complete or if there was an error
      if (!context?.wasOptimistic || error) {
        queryClient.invalidateQueries({ queryKey: ['favorites', user?.id] })
      }
    },

    onSuccess: (isNowFavorited) => {
      if (isNowFavorited) {
        toast.success('Dodano do ulubionych! ❤️')
      } else {
        toast.success('Usunięto z ulubionych')
      }
    },
  })
}

// Hook to get favorites count for profile stats
export function useFavoritesCount(): number {
  const { data: favorites = [] } = useFavorites()
  return favorites.length
}