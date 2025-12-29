import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendNotification, isSMSConfigured } from '@/lib/notifications'
import type { NotificationPayload, NotificationType, NotificationChannel } from '@/lib/notifications'

// Valid notification types
const VALID_TYPES: NotificationType[] = [
  'photographer_assigned',
  'editor_assigned',
  'qc_complete',
  'delivery_ready',
  'booking_confirmed',
  'payment_received',
  'status_update',
  'seller_schedule_request',
  'seller_media_ready',
  'schedule_confirmed',
]

// Types that agents can send (seller-facing notifications)
const AGENT_ALLOWED_TYPES: NotificationType[] = [
  'seller_schedule_request',
  'seller_media_ready',
  'schedule_confirmed',
]

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verify staff authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !user.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is staff or agent
    const { data: staff } = await supabase
      .from('staff')
      .select('id, role')
      .eq('email', user.email)
      .single()

    const { data: agent } = await supabase
      .from('agents')
      .select('id, name')
      .eq('email', user.email)
      .single()

    if (!staff && !agent) {
      return NextResponse.json({ error: 'Forbidden - Staff or Agent only' }, { status: 403 })
    }

    const body = await request.json()
    const { type, recipient, channel, data } = body as {
      type: NotificationType
      recipient: { email?: string; phone?: string; name: string }
      channel: NotificationChannel
      data: Record<string, any>
    }

    // Validate type
    if (!type || !VALID_TYPES.includes(type)) {
      return NextResponse.json(
        { error: `Invalid notification type. Must be one of: ${VALID_TYPES.join(', ')}` },
        { status: 400 }
      )
    }

    // Agents can only send seller-facing notification types
    if (agent && !staff && !AGENT_ALLOWED_TYPES.includes(type)) {
      return NextResponse.json(
        { error: `Agents can only send: ${AGENT_ALLOWED_TYPES.join(', ')}` },
        { status: 403 }
      )
    }

    // Validate recipient
    if (!recipient || (!recipient.email && !recipient.phone)) {
      return NextResponse.json(
        { error: 'Recipient must have at least an email or phone' },
        { status: 400 }
      )
    }

    if (!recipient.name) {
      return NextResponse.json(
        { error: 'Recipient name is required' },
        { status: 400 }
      )
    }

    // Validate channel
    if (!channel || !['email', 'sms', 'both'].includes(channel)) {
      return NextResponse.json(
        { error: 'Channel must be email, sms, or both' },
        { status: 400 }
      )
    }

    // Check SMS configuration if needed
    if ((channel === 'sms' || channel === 'both') && !isSMSConfigured()) {
      if (channel === 'sms') {
        return NextResponse.json(
          { error: 'SMS is not configured' },
          { status: 400 }
        )
      }
      // If 'both', continue with email only
    }

    // Send notification
    const payload: NotificationPayload = {
      type,
      recipient,
      channel,
      data,
    }

    const results = await sendNotification(payload)

    // Log notification
    await logNotification(supabase, {
      type,
      recipientEmail: recipient.email,
      recipientPhone: recipient.phone,
      channel,
      results,
      staffId: staff?.id,
      agentId: agent?.id,
    })

    const successCount = results.filter(r => r.success).length
    const failureCount = results.filter(r => !r.success).length

    return NextResponse.json({
      success: failureCount === 0,
      sent: successCount,
      failed: failureCount,
      results,
    })
  } catch (error) {
    console.error('Notification API error:', error)
    return NextResponse.json(
      { error: 'Failed to send notification' },
      { status: 500 }
    )
  }
}

// Log notification to database (optional - for audit trail)
async function logNotification(
  supabase: any,
  data: {
    type: string
    recipientEmail?: string
    recipientPhone?: string
    channel: string
    results: any[]
    staffId?: string
    agentId?: string
  }
) {
  try {
    // Try to log to notification_logs table (from enterprise migration)
    await supabase.from('notification_logs').insert({
      notification_type: data.type,
      channel: data.channel,
      recipient_email: data.recipientEmail,
      recipient_phone: data.recipientPhone,
      status: data.results.every(r => r.success) ? 'sent' : 'failed',
      error_message: data.results.find(r => !r.success)?.error || null,
      metadata: { results: data.results },
      agent_id: data.agentId || null,
    })
  } catch {
    // Table might not exist yet - silently ignore
  }
}

// GET endpoint to check notification configuration
export async function GET() {
  return NextResponse.json({
    message: 'Notification API',
    smsConfigured: isSMSConfigured(),
    supportedTypes: VALID_TYPES,
    agentAllowedTypes: AGENT_ALLOWED_TYPES,
    channels: ['email', 'sms', 'both'],
  })
}
