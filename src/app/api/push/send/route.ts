import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import webpush from 'web-push'

// Configure web-push with VAPID keys
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || ''
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:support@aerialshots.media'

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey)
}

interface PushPayload {
  title: string
  body?: string
  url?: string
  tag?: string
  actions?: Array<{ action: string; title: string }>
}

// POST /api/push/send - Send push notification to user(s)
export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is staff
    const { data: staff } = await supabase
      .from('staff')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!staff) {
      return NextResponse.json({ error: 'Staff access required' }, { status: 403 })
    }

    const body = await request.json()
    const { user_ids, payload }: { user_ids: string[]; payload: PushPayload } = body

    if (!user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
      return NextResponse.json({ error: 'user_ids array is required' }, { status: 400 })
    }

    if (!payload || !payload.title) {
      return NextResponse.json({ error: 'Payload with title is required' }, { status: 400 })
    }

    const adminSupabase = createAdminClient()

    // Get active subscriptions for target users
    const { data: subscriptions } = await adminSupabase
      .from('push_subscriptions')
      .select('*')
      .in('user_id', user_ids)
      .eq('is_active', true)

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({
        success: true,
        sent: 0,
        message: 'No active subscriptions found',
      })
    }

    type PushSubscriptionRow = typeof subscriptions[number]

    const results = await Promise.allSettled(
      subscriptions.map(async (subscription: PushSubscriptionRow) => {
        const pushSubscription = {
          endpoint: subscription.endpoint,
          keys: subscription.keys as { p256dh: string; auth: string },
        }

        try {
          await webpush.sendNotification(
            pushSubscription,
            JSON.stringify(payload)
          )

          // Log successful send
          await adminSupabase.from('push_notification_history').insert({
            subscription_id: subscription.id,
            user_id: subscription.user_id,
            title: payload.title,
            body: payload.body,
            data: JSON.parse(JSON.stringify(payload)),
            status: 'sent',
            sent_at: new Date().toISOString(),
          })

          // Update last used
          await adminSupabase
            .from('push_subscriptions')
            .update({ last_used_at: new Date().toISOString() })
            .eq('id', subscription.id)

          return { success: true, subscription_id: subscription.id }
        } catch (error: unknown) {
          const err = error as { statusCode?: number; message?: string }
          // Handle expired/invalid subscriptions
          if (err.statusCode === 410 || err.statusCode === 404) {
            await adminSupabase
              .from('push_subscriptions')
              .update({ is_active: false })
              .eq('id', subscription.id)
          }

          // Log failed send
          await adminSupabase.from('push_notification_history').insert({
            subscription_id: subscription.id,
            user_id: subscription.user_id,
            title: payload.title,
            body: payload.body,
            data: JSON.parse(JSON.stringify(payload)),
            status: 'failed',
            error_message: err.message || 'Unknown error',
          })

          return { success: false, subscription_id: subscription.id, error: err.message }
        }
      })
    )

    const successful = results.filter(
      (r) => r.status === 'fulfilled' && (r.value as { success: boolean }).success
    ).length
    const failed = results.length - successful

    return NextResponse.json({
      success: true,
      sent: successful,
      failed,
      total: results.length,
    })
  } catch (error) {
    console.error('Error sending push notifications:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
