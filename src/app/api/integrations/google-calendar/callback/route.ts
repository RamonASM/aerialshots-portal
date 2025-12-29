import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  getTokensFromCode,
  listCalendars,
  getPrimaryCalendarId,
} from '@/lib/integrations/google-calendar'

// GET /api/integrations/google-calendar/callback - Handle OAuth callback
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    // Handle OAuth errors
    if (error) {
      console.error('OAuth error:', error)
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/admin/settings/integrations?error=oauth_denied`
      )
    }

    if (!code || !state) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/admin/settings/integrations?error=invalid_request`
      )
    }

    // Decode state to get staff ID
    let stateData: { staffId: string; timestamp: number }
    try {
      stateData = JSON.parse(Buffer.from(state, 'base64').toString())
    } catch {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/admin/settings/integrations?error=invalid_state`
      )
    }

    // Check state is not too old (15 minutes)
    if (Date.now() - stateData.timestamp > 15 * 60 * 1000) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/admin/settings/integrations?error=expired_state`
      )
    }

    // Exchange code for tokens
    const tokens = await getTokensFromCode(code)

    if (!tokens.refresh_token) {
      console.error('No refresh token received')
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/admin/settings/integrations?error=no_refresh_token`
      )
    }

    // Get primary calendar
    const calendars = await listCalendars(tokens.access_token, tokens.refresh_token)
    const primaryCalendarId = await getPrimaryCalendarId(tokens.access_token, tokens.refresh_token)
    const primaryCalendar = calendars.find((c) => c.id === primaryCalendarId)

    // Store connection in database
    const adminSupabase = createAdminClient()

    // Upsert connection (replace existing if any)
    const { error: upsertError } = await adminSupabase
      .from('calendar_connections')
      .upsert(
        {
          staff_id: stateData.staffId,
          provider: 'google',
          calendar_id: primaryCalendarId,
          calendar_name: primaryCalendar?.summary || 'Primary Calendar',
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          token_expires_at: tokens.expiry_date
            ? new Date(tokens.expiry_date).toISOString()
            : new Date(Date.now() + 3600000).toISOString(),
          sync_enabled: true,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'staff_id,provider',
        }
      )

    if (upsertError) {
      console.error('Failed to store connection:', upsertError)
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/admin/settings/integrations?error=storage_failed`
      )
    }

    // Redirect to settings with success
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/admin/settings/integrations?success=google_connected`
    )
  } catch (error) {
    console.error('Google Calendar callback error:', error)
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/admin/settings/integrations?error=callback_failed`
    )
  }
}
