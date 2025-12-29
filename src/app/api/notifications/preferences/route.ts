import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/notifications/preferences - Get user's notification preferences
export async function GET() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get preferences (use type cast for new table)
    const { data: preferences } = await (supabase as any)
      .from('notification_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single()

    // Return default preferences if none exist
    const defaultPreferences = {
      email_enabled: true,
      sms_enabled: false,
      push_enabled: true,
      in_app_enabled: true,
      order_updates: true,
      delivery_notifications: true,
      payment_reminders: true,
      marketing_emails: false,
      system_alerts: true,
      quiet_hours_enabled: false,
      quiet_hours_start: '22:00',
      quiet_hours_end: '07:00',
    }

    return NextResponse.json({
      preferences: preferences || defaultPreferences,
    })
  } catch (error) {
    console.error('Error fetching notification preferences:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/notifications/preferences - Update user's notification preferences
export async function PUT(request: Request) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      email_enabled,
      sms_enabled,
      push_enabled,
      in_app_enabled,
      order_updates,
      delivery_notifications,
      payment_reminders,
      marketing_emails,
      system_alerts,
      quiet_hours_enabled,
      quiet_hours_start,
      quiet_hours_end,
    } = body

    // Upsert preferences (use type cast for new table)
    const { data: preferences, error } = await (supabase as any)
      .from('notification_preferences')
      .upsert(
        {
          user_id: user.id,
          email_enabled,
          sms_enabled,
          push_enabled,
          in_app_enabled,
          order_updates,
          delivery_notifications,
          payment_reminders,
          marketing_emails,
          system_alerts,
          quiet_hours_enabled,
          quiet_hours_start,
          quiet_hours_end,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id',
        }
      )
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      preferences,
    })
  } catch (error) {
    console.error('Error updating notification preferences:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
