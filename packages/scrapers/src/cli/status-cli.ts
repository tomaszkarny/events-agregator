#!/usr/bin/env node

import { statusManager } from '../jobs/status-manager'
import { logger } from '../utils/logger'
import dotenv from 'dotenv'
import path from 'path'

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') })

async function main() {
  const command = process.argv[2]
  const eventId = process.argv[3]
  
  try {
    switch (command) {
      case 'update':
        console.log('🔄 Updating expired events...')
        const result = await statusManager.updateExpiredEvents()
        console.log(`✅ ${result.details}`)
        if (result.updatedCount > 0) {
          console.log(`📊 Updated ${result.updatedCount} events to EXPIRED status`)
        }
        break
        
      case 'stats':
        console.log('📊 Getting status statistics...')
        const stats = await statusManager.getStatusStatistics()
        console.log('Current event status distribution:')
        console.log(`  🟢 Active: ${stats.active}`)
        console.log(`  🔴 Expired: ${stats.expired}`)
        console.log(`  🟡 Draft: ${stats.draft}`)
        console.log(`  ⚫ Archived: ${stats.archived}`)
        console.log(`  📈 Total: ${stats.total}`)
        break
        
      case 'expire':
        if (!eventId) {
          console.error('❌ Event ID required for expire command')
          console.log('Usage: npm run status:cli expire <event-id>')
          process.exit(1)
        }
        console.log(`🔄 Manually expiring event: ${eventId}`)
        const expired = await statusManager.expireEvent(eventId)
        if (expired) {
          console.log(`✅ Event ${eventId} has been expired`)
        } else {
          console.log(`❌ Failed to expire event ${eventId} (may not exist or already expired)`)
        }
        break
        
      case 'reactivate':
        if (!eventId) {
          console.error('❌ Event ID required for reactivate command')
          console.log('Usage: npm run status:cli reactivate <event-id>')
          process.exit(1)
        }
        console.log(`🔄 Manually reactivating event: ${eventId}`)
        const reactivated = await statusManager.reactivateEvent(eventId)
        if (reactivated) {
          console.log(`✅ Event ${eventId} has been reactivated`)
        } else {
          console.log(`❌ Failed to reactivate event ${eventId} (may not exist or not expired)`)
        }
        break
        
      case 'help':
      default:
        console.log('📋 Event Status Management CLI')
        console.log('')
        console.log('Available commands:')
        console.log('  update              - Update all expired events based on dates')
        console.log('  stats               - Show current status distribution')
        console.log('  expire <event-id>   - Manually expire a specific event')
        console.log('  reactivate <event-id> - Manually reactivate an expired event')
        console.log('  help                - Show this help message')
        console.log('')
        console.log('Examples:')
        console.log('  npm run status:cli update')
        console.log('  npm run status:cli stats')
        console.log('  npm run status:cli expire 123e4567-e89b-12d3-a456-426614174000')
        console.log('  npm run status:cli reactivate 123e4567-e89b-12d3-a456-426614174000')
        break
    }
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

main()