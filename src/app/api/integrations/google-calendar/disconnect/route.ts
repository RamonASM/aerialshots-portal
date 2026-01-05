import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/integrations/google-calendar/disconnect - Remove calendar connection
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

    // Delete connection (use type cast since calendar_connections is a new table)
    const { error: deleteError } = await (supabase as any)
      .from('calendar_connections')
      .delete()
      .eq('staff_id', staff.id)
      .eq('provider', 'google')

    if (deleteError) {
      console.error('Failed to delete connection:', deleteError)
      return NextResponse.json({ error: 'Failed to disconnect' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Google Calendar disconnect error:', error)
    return NextResponse.json({ error: 'Disconnect failed' }, { status: 500 })
  }
}
