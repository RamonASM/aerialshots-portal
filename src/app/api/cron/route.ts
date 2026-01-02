/**
 * Unified Cron Job Handler
 *
 * Runs all scheduled tasks in a single cron invocation
 * This consolidates multiple crons into one to work within Vercel's limits
 *
 * Schedule: Every 15 minutes (0,15,30,45 * * * *)
 *
 * Tasks:
 * - Review requests (sends review request emails after delivery)
 * - Drip campaigns (sends scheduled marketing emails)
 * - Notifications (processes scheduled notifications)
 * - Low balance alerts (notifies agents with low credit balance)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { apiLogger, formatError } from '@/lib/logger'

// Import task functions
import { getPendingRequests, sendReviewRequest, getReviewSettings } from '@/lib/marketing/reviews/service'
import { getDuePendingSteps, processEnrollmentStep } from '@/lib/marketing/drip/service'
import { processScheduledNotifications } from '@/lib/notifications/auto-triggers'
import { sendLowBalanceEmail } from '@/lib/email/resend'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutes max for all tasks

const LOW_BALANCE_THRESHOLD = 50
const NOTIFICATION_COOLDOWN_HOURS = 72

interface TaskResult {
  task: string
  success: boolean
  processed?: number
  errors?: string[]
  message?: string
}

async function runReviewRequests(): Promise<TaskResult> {
  try {
    const supabase = createAdminClient()

    // Check if review requests are enabled
    const settings = await getReviewSettings()
    if (!settings?.is_enabled) {
      return { task: 'review-requests', success: true, processed: 0, message: 'Disabled' }
    }

    const pendingRequests = await getPendingRequests()
    if (pendingRequests.length === 0) {
      return { task: 'review-requests', success: true, processed: 0 }
    }

    let sentCount = 0
    const errors: string[] = []

    for (const request of pendingRequests) {
      try {
        let listingAddress = ''
        if (request.listing_id) {
          const { data: listing } = await supabase
            .from('listings')
            .select('address')
            .eq('id', request.listing_id)
            .single()
          listingAddress = listing?.address || ''
        }

        const success = await sendReviewRequest(request, listingAddress)
        if (success) sentCount++
      } catch (error) {
        errors.push(`Request ${request.id}: ${error}`)
      }
    }

    return {
      task: 'review-requests',
      success: true,
      processed: sentCount,
      errors: errors.length > 0 ? errors : undefined
    }
  } catch (error) {
    return { task: 'review-requests', success: false, errors: [String(error)] }
  }
}

async function runDripCampaigns(): Promise<TaskResult> {
  try {
    const dueEnrollments = await getDuePendingSteps({ limit: 50 })
    if (dueEnrollments.length === 0) {
      return { task: 'drip-campaigns', success: true, processed: 0 }
    }

    let processedCount = 0
    const errors: string[] = []

    for (const enrollment of dueEnrollments) {
      try {
        const result = await processEnrollmentStep(enrollment.id)
        if (result.success) {
          processedCount++
        } else {
          errors.push(`Enrollment ${enrollment.id}: ${result.error}`)
        }
      } catch (error) {
        errors.push(`Enrollment ${enrollment.id}: ${error}`)
      }
    }

    return {
      task: 'drip-campaigns',
      success: true,
      processed: processedCount,
      errors: errors.length > 0 ? errors : undefined
    }
  } catch (error) {
    return { task: 'drip-campaigns', success: false, errors: [String(error)] }
  }
}

async function runNotifications(): Promise<TaskResult> {
  try {
    const processedCount = await processScheduledNotifications()
    return { task: 'notifications', success: true, processed: processedCount }
  } catch (error) {
    return { task: 'notifications', success: false, errors: [String(error)] }
  }
}

async function runLowBalanceCheck(): Promise<TaskResult> {
  try {
    const supabase = createAdminClient()

    const cooldownDate = new Date()
    cooldownDate.setHours(cooldownDate.getHours() - NOTIFICATION_COOLDOWN_HOURS)

    const { data: agents, error: agentsError } = await supabase
      .from('agents')
      .select('id, name, email, credit_balance')
      .lt('credit_balance', LOW_BALANCE_THRESHOLD)
      .gt('credit_balance', 0)

    if (agentsError) {
      return { task: 'low-balance', success: false, errors: [agentsError.message] }
    }

    if (!agents || agents.length === 0) {
      return { task: 'low-balance', success: true, processed: 0 }
    }

    const { data: recentNotifications } = await supabase
      .from('notification_logs')
      .select('recipient_email')
      .eq('notification_type', 'low_balance')
      .gte('sent_at', cooldownDate.toISOString())

    const recentlyNotified = new Set(
      recentNotifications
        ?.map((n: { recipient_email: string | null }) => n.recipient_email)
        .filter((email): email is string => email !== null) || []
    )

    const agentsToNotify = agents.filter(
      (agent) => agent.email && !recentlyNotified.has(agent.email)
    )

    let notified = 0
    const errors: string[] = []

    for (const agent of agentsToNotify) {
      try {
        await sendLowBalanceEmail({
          to: agent.email,
          agentName: agent.name,
          currentBalance: agent.credit_balance || 0,
          threshold: LOW_BALANCE_THRESHOLD,
        })

        await supabase.from('notification_logs').insert({
          notification_type: 'low_balance',
          channel: 'email',
          recipient_type: 'agent',
          recipient_email: agent.email,
          subject: `Low Credit Balance Alert - ${agent.credit_balance} credits remaining`,
          status: 'sent',
          sent_at: new Date().toISOString(),
          metadata: {
            recipient_name: agent.name,
            credit_balance: agent.credit_balance,
            threshold: LOW_BALANCE_THRESHOLD,
          },
        })

        notified++
      } catch (error) {
        errors.push(`Agent ${agent.email}: ${error}`)
      }
    }

    return {
      task: 'low-balance',
      success: true,
      processed: notified,
      errors: errors.length > 0 ? errors : undefined
    }
  } catch (error) {
    return { task: 'low-balance', success: false, errors: [String(error)] }
  }
}

export async function GET(request: NextRequest) {
  // Verify cron secret - MUST be configured
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    apiLogger.error('CRON_SECRET environment variable is not configured')
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
  }

  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const startTime = Date.now()

  // Run all tasks in parallel
  const [reviewResults, dripResults, notificationResults, balanceResults] = await Promise.all([
    runReviewRequests(),
    runDripCampaigns(),
    runNotifications(),
    runLowBalanceCheck(),
  ])

  const results = {
    timestamp: new Date().toISOString(),
    duration: Date.now() - startTime,
    tasks: {
      reviewRequests: reviewResults,
      dripCampaigns: dripResults,
      notifications: notificationResults,
      lowBalanceAlerts: balanceResults,
    },
    summary: {
      totalProcessed:
        (reviewResults.processed || 0) +
        (dripResults.processed || 0) +
        (notificationResults.processed || 0) +
        (balanceResults.processed || 0),
      allSuccessful:
        reviewResults.success &&
        dripResults.success &&
        notificationResults.success &&
        balanceResults.success,
    },
  }

  apiLogger.info(results, 'Unified cron completed')

  return NextResponse.json(results)
}

// Also support POST for manual triggering
export async function POST(request: NextRequest) {
  return GET(request)
}
