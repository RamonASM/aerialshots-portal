import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendLowBalanceEmail } from '@/lib/email/resend'

// Threshold for low balance notifications
const LOW_BALANCE_THRESHOLD = 50

// Minimum hours between notifications to same agent
const NOTIFICATION_COOLDOWN_HOURS = 72

export async function GET(request: NextRequest) {
  // Verify cron secret for security
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()

  try {
    // Find agents with low credit balance who haven't been notified recently
    const cooldownDate = new Date()
    cooldownDate.setHours(cooldownDate.getHours() - NOTIFICATION_COOLDOWN_HOURS)

    // Get agents with low balance
    const { data: agents, error: agentsError } = await supabase
      .from('agents')
      .select('id, name, email, credit_balance')
      .lt('credit_balance', LOW_BALANCE_THRESHOLD)
      .gt('credit_balance', 0) // Only notify if they have some credits (not zero)

    if (agentsError) {
      console.error('Error fetching agents:', agentsError)
      return NextResponse.json({ error: 'Failed to fetch agents' }, { status: 500 })
    }

    if (!agents || agents.length === 0) {
      return NextResponse.json({
        message: 'No agents with low balance',
        checked: 0,
        notified: 0,
      })
    }

    // Check recent notifications for these agents
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

    // Filter out recently notified agents
    const agentsToNotify = agents.filter(
      (agent) => agent.email && !recentlyNotified.has(agent.email)
    )

    let notified = 0
    const errors: string[] = []

    // Send notifications
    for (const agent of agentsToNotify) {
      try {
        await sendLowBalanceEmail({
          to: agent.email,
          agentName: agent.name,
          currentBalance: agent.credit_balance || 0,
          threshold: LOW_BALANCE_THRESHOLD,
        })

        // Log the notification
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
        console.error(`Failed to notify agent ${agent.email}:`, error)
        errors.push(agent.email)
      }
    }

    return NextResponse.json({
      message: 'Low balance check completed',
      checked: agents.length,
      notified,
      skipped: agents.length - agentsToNotify.length,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    console.error('Low balance check failed:', error)
    return NextResponse.json({ error: 'Check failed' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  // POST with same logic for flexibility
  return GET(request)
}
