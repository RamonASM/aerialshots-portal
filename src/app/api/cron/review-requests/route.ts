/**
 * Review Request Cron Job
 *
 * Processes pending review requests and sends them
 * Should be called every 15 minutes via Vercel cron
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPendingRequests, sendReviewRequest, getReviewSettings } from '@/lib/marketing/reviews/service'

export const dynamic = 'force-dynamic'
export const maxDuration = 60 // 60 seconds for processing

export async function GET(request: NextRequest) {
  // Verify cron secret - MUST be configured
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    console.error('CRON_SECRET environment variable is not configured')
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
  }

  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()

  // Check if review requests are enabled
  const settings = await getReviewSettings()
  if (!settings?.is_enabled) {
    return NextResponse.json({ message: 'Review requests disabled', sent: 0 })
  }

  // Get pending requests
  const pendingRequests = await getPendingRequests()

  if (pendingRequests.length === 0) {
    return NextResponse.json({ message: 'No pending requests', sent: 0 })
  }

  let sentCount = 0
  const errors: string[] = []

  for (const request of pendingRequests) {
    try {
      // Get listing address if available
      let listingAddress = ''
      if (request.listing_id) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: listing } = await (supabase as any)
          .from('listings')
          .select('address')
          .eq('id', request.listing_id)
          .single()

        listingAddress = listing?.address || ''
      }

      // Send the request
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const success = await sendReviewRequest(request as any, listingAddress)

      if (success) {
        sentCount++
      }
    } catch (error) {
      errors.push(`Error sending request ${request.id}: ${error}`)
    }
  }

  return NextResponse.json({
    message: `Processed ${pendingRequests.length} requests`,
    sent: sentCount,
    errors: errors.length > 0 ? errors : undefined,
  })
}
