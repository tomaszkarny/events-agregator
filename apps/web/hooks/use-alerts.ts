import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/auth-context-v2'
import { toast } from '@/lib/toast'
import { supabase } from '@/lib/supabase-client'

// Types for alerts
export interface AlertFilters {
  cities?: string[]
  categories?: string[]
  ageMin?: number
  ageMax?: number
  keywords?: string[]
  priceType?: 'free' | 'paid' | 'any'
}

export interface Alert {
  id: string
  name: string
  filters: AlertFilters
  frequency: 'IMMEDIATE' | 'DAILY' | 'WEEKLY'
  channels: ('PUSH' | 'EMAIL' | 'IN_APP')[]
  is_active: boolean
  created_at: string
  updated_at: string
  user_id: string
}

export interface CreateAlertInput {
  name: string
  filters: AlertFilters
  frequency: 'IMMEDIATE' | 'DAILY' | 'WEEKLY'
  channels: ('PUSH' | 'EMAIL' | 'IN_APP')[]
}

export interface UpdateAlertInput extends Partial<CreateAlertInput> {
  isActive?: boolean
}

// Hook to get all user alerts
export function useAlerts() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['alerts', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated')
      
      const { data, error } = await supabase
        .from('alerts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as Alert[]
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Hook to create a new alert
export function useCreateAlert() {
  const queryClient = useQueryClient()
  const { user, profile } = useAuth()

  return useMutation({
    mutationFn: async (input: CreateAlertInput) => {
      if (!user) {
        throw new Error('Musisz być zalogowany aby utworzyć alert')
      }

      // Check PRO subscription for immediate alerts
      if (input.frequency === 'IMMEDIATE' && profile?.subscription_tier !== 'PRO') {
        throw new Error('Immediate alerts require PRO subscription')
      }

      // Check alert limit (max 10 per user)
      const { count } = await supabase
        .from('alerts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)

      if ((count || 0) >= 10) {
        throw new Error('Alert limit reached (max 10)')
      }

      const { data, error } = await supabase
        .from('alerts')
        .insert({
          name: input.name,
          filters: input.filters,
          frequency: input.frequency,
          channels: input.channels,
          user_id: user.id,
          is_active: true
        })
        .select()
        .single()
      
      if (error) throw error
      return data as Alert
    },
    onSuccess: (newAlert) => {
      queryClient.invalidateQueries({ queryKey: ['alerts', user?.id] })
      toast.success(`Alert "${newAlert.name}" został utworzony`)
    },
    onError: (error: any) => {
      const message = error.message
      if (message.includes('PRO subscription')) {
        toast.error('Alerty natychmiastowe wymagają subskrypcji PRO')
      } else if (message.includes('limit reached')) {
        toast.error('Osiągnięto limit alertów (max 10)')
      } else {
        toast.error('Nie udało się utworzyć alertu')
      }
    },
  })
}

// Hook to update an alert
export function useUpdateAlert() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateAlertInput & { id: string }) => {
      if (!user) throw new Error('User not authenticated')

      const { data, error } = await supabase
        .from('alerts')
        .update({
          ...(input.name && { name: input.name }),
          ...(input.filters && { filters: input.filters }),
          ...(input.frequency && { frequency: input.frequency }),
          ...(input.channels && { channels: input.channels }),
          ...(input.isActive !== undefined && { is_active: input.isActive }),
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single()
      
      if (error) throw error
      return data as Alert
    },
    onSuccess: (updatedAlert) => {
      queryClient.invalidateQueries({ queryKey: ['alerts', user?.id] })
      toast.success(`Alert "${updatedAlert.name}" został zaktualizowany`)
    },
    onError: () => {
      toast.error('Nie udało się zaktualizować alertu')
    },
  })
}

// Hook to delete an alert
export function useDeleteAlert() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('User not authenticated')

      const { error } = await supabase
        .from('alerts')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)
      
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts', user?.id] })
      toast.success('Alert został usunięty')
    },
    onError: () => {
      toast.error('Nie udało się usunąć alertu')
    },
  })
}

// Hook to toggle alert active status
export function useToggleAlertStatus() {
  const updateAlert = useUpdateAlert()

  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      return updateAlert.mutateAsync({ id, isActive })
    },
  })
}

// Hook to get alerts count for profile stats
export function useAlertsCount(): number {
  const { data: alerts = [] } = useAlerts()
  return alerts.filter(alert => alert.is_active).length
}