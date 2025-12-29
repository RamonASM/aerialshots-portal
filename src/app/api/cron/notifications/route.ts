import { NextRequest, NextResponse } from 'next/server'
import { processScheduledNotifications } from '@/lib/notifications/auto-triggers'
import { apiLogger, formatError } from '@/lib/logger'

/**
 * GET /api/cron/notifications
 * Process scheduled notifications (called by Vercel Cron or external scheduler)
 *
 * Configure in vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/notifications",
 *     "schedule": "0 * * * *"
 *   }]
 * }
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret (for security)
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const processedCount = await processScheduledNotifications()

    apiLogger.info({ processedCount }, 'Cron: notifications processed')

    return NextResponse.json({
      success: true,
      processed: processedCount,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    apiLogger.error({ error: formatError(error) }, 'Cron: notifications error')
    return NextResponse.json(
      { error: 'Failed to process notifications' },
      { status: 500 }
    )
  }
}
