import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { syncAssignmentsToCalendar } from '@/lib/integrations/google-calendar'

// POST /api/integrations/google-calendar/sync - Trigger calendar sync
export async function POST() {
  try {
    const supabase = await createClient()

    // Check authentication
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
      .eq('auth_user_id', user.id)
      .single()

    if (!staff) {
      return NextResponse.json({ error: 'Staff access required' }, { status: 403 })
    }

    // Trigger sync
    const result = await syncAssignmentsToCalendar(staff.id)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Google Calendar sync error:', error)
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 })
  }
}

// GET /api/integrations/google-calendar/sync - Get sync status
export async function GET() {
  try {
    const supabase = await createClient()

    // Check authentication
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
      .eq('auth_user_id', user.id)
      .single()

    if (!staff) {
      return NextResponse.json({ error: 'Staff access required' }, { status: 403 })
    }

    // Get connection status (use type cast since calendar_connections is a new table)
    const { data: connection } = await (supabase as any)
      .from('calendar_connections')
      .select('id, provider, calendar_name, sync_enabled, last_sync_at, sync_errors')
      .eq('staff_id', staff.id)
      .eq('provider', 'google')
      .single()

    if (!connection) {
      return NextResponse.json({ connected: false })
    }

    return NextResponse.json({
      connected: true,
      calendarName: connection.calendar_name,
      syncEnabled: connection.sync_enabled,
      lastSyncAt: connection.last_sync_at,
      syncErrors: connection.sync_errors,
    })
  } catch (error) {
    console.error('Google Calendar status error:', error)
    return NextResponse.json({ error: 'Failed to get status' }, { status: 500 })
  }
}
