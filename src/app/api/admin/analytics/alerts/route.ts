import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireStaff } from '@/lib/api/middleware/require-staff'

export async function GET() {
  try {
    // Require staff authentication
    try {
      await requireStaff()
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()

    // Get all alerts
    const { data: alerts, error: alertsError } = await supabase
      .from('analytics_alerts')
      .select('*')
      .order('created_at', { ascending: false })

    if (alertsError) {
      console.error('Error fetching alerts:', alertsError)
      return NextResponse.json({ alerts: [], history: [] })
    }

    // Get recent alert history
    const { data: history, error: historyError } = await supabase
      .from('analytics_alert_history')
      .select(`
        *,
        alert:analytics_alerts(name)
      `)
      .order('triggered_at', { ascending: false })
      .limit(50)

    if (historyError) {
      console.error('Error fetching history:', historyError)
    }

    const formattedHistory = history?.map((h) => ({
      ...h,
      alert_name: h.alert?.name || 'Unknown Alert',
    })) || []

    return NextResponse.json({
      alerts: alerts || [],
      history: formattedHistory,
    })
  } catch (error) {
    console.error('Error in alerts API:', error)
    return NextResponse.json({ alerts: [], history: [] })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get staff ID
    const { data: staff } = await supabase
      .from('staff')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    const { data: alert, error } = await supabase
      .from('analytics_alerts')
      .insert({
        name: body.name,
        description: body.description,
        metric_type: body.metric_type,
        condition: body.condition,
        threshold: body.threshold,
        comparison_period: body.comparison_period,
        notification_channels: body.notification_channels,
        recipients: body.recipients || [],
        is_active: true,
        created_by: staff?.id,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating alert:', error)
      return NextResponse.json({ error: 'Failed to create alert' }, { status: 500 })
    }

    return NextResponse.json({ success: true, alert })
  } catch (error) {
    console.error('Error creating alert:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
