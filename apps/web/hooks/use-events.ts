import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { searchEvents, getEvent, createEvent, updateEvent, deleteEvent, trackEventClick } from '@/lib/supabase-queries'

export function useEvents(params: Parameters<typeof searchEvents>[0]) {
  return useQuery({
    queryKey: ['events', params],
    queryFn: () => searchEvents(params),
  })
}

export function useEvent(id: string) {
  return useQuery({
    queryKey: ['event', id],
    queryFn: () => getEvent(id),
    enabled: !!id,
  })
}

export function useCreateEvent() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (event: Parameters<typeof createEvent>[0]) => createEvent(event),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] })
      queryClient.invalidateQueries({ queryKey: ['user-events'] })
    },
  })
}

export function useUpdateEvent() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Parameters<typeof updateEvent>[1] }) => 
      updateEvent(id, updates),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['events'] })
      queryClient.invalidateQueries({ queryKey: ['event', data.id] })
      queryClient.invalidateQueries({ queryKey: ['user-events'] })
    },
  })
}

export function useDeleteEvent() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (id: string) => deleteEvent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] })
      queryClient.invalidateQueries({ queryKey: ['user-events'] })
    },
  })
}

export function useTrackEventClick() {
  return useMutation({
    mutationFn: (id: string) => trackEventClick(id),
  })
}