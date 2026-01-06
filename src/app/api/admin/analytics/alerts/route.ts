import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireStaffAccess } from '@/lib/auth/server-access'

export async function GET() {
  try {
    await requireStaffAccess()
    const supabase = createAdminClient()

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
    const access = await requireStaffAccess()
    const supabase = createAdminClient()
    const body = await request.json()

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
        created_by: access.id,
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
