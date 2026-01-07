import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  getAuthUrl,
  listCalendars,
  syncAssignmentsToCalendar,
} from '@/lib/integrations/google-calendar/client'

// GET - List calendar connections or initiate OAuth
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anySupabase = supabase as any
    const searchParams = request.nextUrl.searchParams
    const action = searchParams.get('action')

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get staff member
    const { data: staff, error: staffError } = await supabase
      .from('staff')
      .select('id')
      .eq('email', user.email!)
      .eq('is_active', true)
      .maybeSingle()

    if (staffError) {
      console.error('[Calendar] Staff lookup error:', staffError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    if (!staff) {
      return NextResponse.json(
        { error: 'Staff member not found' },
        { status: 403 }
      )
    }

    // Initiate OAuth connection
    if (action === 'connect') {
      // Generate state token for CSRF protection
      const state = Buffer.from(
        JSON.stringify({
          staffId: staff.id,
          timestamp: Date.now(),
        })
      ).toString('base64url')

      const authUrl = getAuthUrl(state)
      return NextResponse.json({ authUrl })
    }

    // List calendars for connected account
    if (action === 'calendars') {
      const { data: connection, error: connectionError } = await anySupabase
        .from('calendar_connections')
        .select('*')
        .eq('staff_id', staff.id)
        .eq('provider', 'google')
        .maybeSingle()

      if (connectionError) {
        console.error('[Calendar] Connection lookup error:', connectionError)
        return NextResponse.json({ error: 'Database error' }, { status: 500 })
      }

      if (!connection) {
        return NextResponse.json(
          { error: 'No Google Calendar connection found' },
          { status: 404 }
        )
      }

      const calendars = await listCalendars(
        connection.access_token,
        connection.refresh_token
      )

      return NextResponse.json({ calendars })
    }

    // Default: Get current connections
    const { data: connections } = await anySupabase
      .from('calendar_connections')
      .select('id, provider, calendar_id, calendar_name, sync_enabled, last_sync_at, created_at')
      .eq('staff_id', staff.id)

    return NextResponse.json({ connections: connections || [] })
  } catch (error) {
    console.error('Calendar API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Sync calendar or update connection settings
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anySupabase = supabase as any

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get staff member
    const { data: staff, error: staffError } = await supabase
      .from('staff')
      .select('id')
      .eq('email', user.email!)
      .eq('is_active', true)
      .maybeSingle()

    if (staffError) {
      console.error('[Calendar] Staff lookup error:', staffError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    if (!staff) {
      return NextResponse.json(
        { error: 'Staff member not found' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { action, connectionId, calendarId, syncEnabled, syncDirection } =
      body

    // Trigger sync
    if (action === 'sync') {
      const result = await syncAssignmentsToCalendar(staff.id)
      return NextResponse.json(result)
    }

    // Update connection settings
    if (action === 'update' && connectionId) {
      const updates: Record<string, unknown> = {}

      if (calendarId !== undefined) updates.calendar_id = calendarId
      if (syncEnabled !== undefined) updates.sync_enabled = syncEnabled
      if (syncDirection !== undefined) updates.sync_direction = syncDirection

      const { error } = await anySupabase
        .from('calendar_connections')
        .update(updates)
        .eq('id', connectionId)
        .eq('staff_id', staff.id)

      if (error) {
        return NextResponse.json(
          { error: 'Failed to update connection' },
          { status: 400 }
        )
      }

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Calendar sync error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - Disconnect calendar
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anySupabase = supabase as any

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get staff member
    const { data: staff, error: staffError } = await supabase
      .from('staff')
      .select('id')
      .eq('email', user.email!)
      .eq('is_active', true)
      .maybeSingle()

    if (staffError) {
      console.error('[Calendar] Staff lookup error:', staffError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    if (!staff) {
      return NextResponse.json(
        { error: 'Staff member not found' },
        { status: 403 }
      )
    }

    const { searchParams } = request.nextUrl
    const connectionId = searchParams.get('connectionId')

    if (!connectionId) {
      return NextResponse.json(
        { error: 'Connection ID required' },
        { status: 400 }
      )
    }

    const { error } = await anySupabase
      .from('calendar_connections')
      .delete()
      .eq('id', connectionId)
      .eq('staff_id', staff.id)

    if (error) {
      return NextResponse.json(
        { error: 'Failed to disconnect calendar' },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Calendar disconnect error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
