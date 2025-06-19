import { createClient } from '@supabase/supabase-js'
import { logger } from '../utils/logger'
import dotenv from 'dotenv'
import path from 'path'

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') })

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export class StatusManager {
  async updateExpiredEvents(): Promise<{ success: boolean; updatedCount: number; details: string }> {
    try {
      logger.info('Starting automatic event status update...')
      
      // Call the SQL function we created
      const { data, error } = await supabase.rpc('update_expired_events')
      
      if (error) {
        logger.error('Error updating expired events:', error)
        return {
          success: false,
          updatedCount: 0,
          details: `Error: ${error.message}`
        }
      }
      
      const result = data && data.length > 0 ? data[0] : { updated_count: 0, details: 'No data returned' }
      
      logger.info(`Status update completed: ${result.details}`)
      
      return {
        success: true,
        updatedCount: result.updated_count || 0,
        details: result.details || 'Update completed'
      }
      
    } catch (error: any) {
      logger.error('Unexpected error in status update:', error)
      return {
        success: false,
        updatedCount: 0,
        details: `Unexpected error: ${error.message}`
      }
    }
  }
  
  async expireEvent(eventId: string): Promise<boolean> {
    try {
      logger.info(`Manually expiring event: ${eventId}`)
      
      const { data, error } = await supabase.rpc('expire_event', { event_id: eventId })
      
      if (error) {
        logger.error(`Error expiring event ${eventId}:`, error)
        return false
      }
      
      logger.info(`Event ${eventId} expired: ${data}`)
      return data === true
      
    } catch (error: any) {
      logger.error(`Unexpected error expiring event ${eventId}:`, error)
      return false
    }
  }
  
  async reactivateEvent(eventId: string): Promise<boolean> {
    try {
      logger.info(`Manually reactivating event: ${eventId}`)
      
      const { data, error } = await supabase.rpc('reactivate_event', { event_id: eventId })
      
      if (error) {
        logger.error(`Error reactivating event ${eventId}:`, error)
        return false
      }
      
      logger.info(`Event ${eventId} reactivated: ${data}`)
      return data === true
      
    } catch (error: any) {
      logger.error(`Unexpected error reactivating event ${eventId}:`, error)
      return false
    }
  }
  
  async getStatusStatistics(): Promise<{
    active: number
    expired: number
    draft: number
    archived: number
    total: number
  }> {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('status')
      
      if (error) {
        logger.error('Error getting status statistics:', error)
        return { active: 0, expired: 0, draft: 0, archived: 0, total: 0 }
      }
      
      const stats = data.reduce((acc, event) => {
        const status = event.status.toLowerCase() as keyof typeof acc
        if (status in acc && status !== 'total') {
          acc[status]++
        }
        acc.total++
        return acc
      }, { active: 0, expired: 0, draft: 0, archived: 0, total: 0 })
      
      return stats
      
    } catch (error: any) {
      logger.error('Unexpected error getting statistics:', error)
      return { active: 0, expired: 0, draft: 0, archived: 0, total: 0 }
    }
  }
}

export const statusManager = new StatusManager()