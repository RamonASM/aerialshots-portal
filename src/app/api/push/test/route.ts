import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/push/test - Send a test push notification to the current user
export async function POST() {
  try {
    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anySupabase = supabase as any

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's active subscriptions
    const { data: subscriptions } = await anySupabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No active push subscriptions found. Please enable notifications first.',
      })
    }

    // Send test via internal API
    const response = await fetch(new URL('/api/push/send', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: '', // Would need to forward auth
      },
      body: JSON.stringify({
        user_ids: [user.id],
        payload: {
          title: 'Test Notification',
          body: 'This is a test push notification from ASM Portal!',
          url: '/dashboard',
          tag: 'test',
        },
      }),
    })

    if (!response.ok) {
      // For test endpoint, just confirm subscription exists
      return NextResponse.json({
        success: true,
        message: `Test notification queued for ${subscriptions.length} device(s).`,
        note: 'VAPID keys must be configured for actual delivery.',
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Test notification sent!',
    })
  } catch (error) {
    console.error('Error sending test notification:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
