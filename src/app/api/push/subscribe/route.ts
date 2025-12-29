import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/push/subscribe - Subscribe to push notifications
export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { endpoint, keys, expirationTime } = body

    if (!endpoint || !keys) {
      return NextResponse.json(
        { error: 'Invalid subscription data' },
        { status: 400 }
      )
    }

    // Get device info from user agent
    const userAgent = request.headers.get('user-agent') || ''
    const deviceType = getDeviceType(userAgent)

    // Upsert subscription
    const { data: subscription, error } = await supabase
      .from('push_subscriptions')
      .upsert(
        {
          user_id: user.id,
          endpoint,
          keys,
          user_agent: userAgent,
          device_type: deviceType,
          is_active: true,
          last_used_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'endpoint',
        }
      )
      .select()
      .single()

    if (error) {
      throw error
    }

    // Also ensure notification preferences exist
    await supabase
      .from('notification_preferences')
      .upsert(
        {
          user_id: user.id,
          event_type: 'all',
          is_enabled: true,
        },
        {
          onConflict: 'user_id,event_type',
        }
      )

    return NextResponse.json({
      success: true,
      subscription,
    })
  } catch (error) {
    console.error('Error subscribing to push:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function getDeviceType(userAgent: string): string {
  if (/mobile/i.test(userAgent)) return 'mobile'
  if (/tablet|ipad/i.test(userAgent)) return 'tablet'
  return 'desktop'
}
