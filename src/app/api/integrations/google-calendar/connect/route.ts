import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthUrl } from '@/lib/integrations/google-calendar'

// GET /api/integrations/google-calendar/connect - Initiate OAuth flow
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

    // Generate state for OAuth (includes staff ID for callback)
    const state = Buffer.from(
      JSON.stringify({
        staffId: staff.id,
        timestamp: Date.now(),
      })
    ).toString('base64')

    // Generate OAuth URL
    const authUrl = getAuthUrl(state)

    return NextResponse.json({ authUrl })
  } catch (error) {
    console.error('Google Calendar connect error:', error)
    return NextResponse.json({ error: 'Failed to initiate connection' }, { status: 500 })
  }
}
