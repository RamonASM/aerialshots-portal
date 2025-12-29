import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createQuickBooksClient } from '@/lib/integrations/quickbooks/client'
import { cookies } from 'next/headers'
import { apiLogger, formatError } from '@/lib/logger'

/**
 * GET /api/integrations/quickbooks/callback
 * OAuth callback handler for QuickBooks
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const realmId = searchParams.get('realmId')
    const error = searchParams.get('error')

    // Handle OAuth errors
    if (error) {
      apiLogger.error({ error }, 'QuickBooks OAuth error')
      return NextResponse.redirect(
        new URL('/admin/settings/integrations?error=quickbooks_denied', request.url)
      )
    }

    if (!code || !state || !realmId) {
      return NextResponse.redirect(
        new URL('/admin/settings/integrations?error=missing_params', request.url)
      )
    }

    // Verify state
    const cookieStore = await cookies()
    const storedState = cookieStore.get('qb_oauth_state')?.value

    if (!storedState || storedState !== state) {
      apiLogger.warn({ providedState: state }, 'QuickBooks OAuth state mismatch')
      return NextResponse.redirect(
        new URL('/admin/settings/integrations?error=invalid_state', request.url)
      )
    }

    // Clear state cookie
    cookieStore.delete('qb_oauth_state')

    const supabase = await createClient()

    // Verify staff authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user?.email) {
      return NextResponse.redirect(
        new URL('/admin/settings/integrations?error=not_authenticated', request.url)
      )
    }

    // Exchange code for tokens
    const qbClient = createQuickBooksClient({})
    const tokens = await qbClient.exchangeCode(code)

    // Store tokens securely
    // In production, encrypt these tokens before storing
    const tokenExpiry = new Date(Date.now() + tokens.expires_in * 1000)
    const refreshExpiry = new Date(Date.now() + tokens.x_refresh_token_expires_in * 1000)

    // Store in integration_settings table (or similar)
    // Cast to any since this table may not be in types
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: saveError } = await (supabase as any)
      .from('integration_settings')
      .upsert({
        key: 'quickbooks',
        value: {
          connected: true,
          realm_id: realmId,
          access_token: tokens.access_token, // Should be encrypted in production
          refresh_token: tokens.refresh_token, // Should be encrypted in production
          token_expiry: tokenExpiry.toISOString(),
          refresh_expiry: refreshExpiry.toISOString(),
          connected_at: new Date().toISOString(),
          connected_by: user.email,
        },
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'key',
      })

    if (saveError) {
      apiLogger.error({ error: formatError(saveError) }, 'Failed to save QuickBooks tokens')
      return NextResponse.redirect(
        new URL('/admin/settings/integrations?error=save_failed', request.url)
      )
    }

    apiLogger.info({ realmId, userEmail: user.email }, 'QuickBooks connected successfully')

    return NextResponse.redirect(
      new URL('/admin/settings/integrations?success=quickbooks_connected', request.url)
    )
  } catch (error) {
    apiLogger.error({ error: formatError(error) }, 'QuickBooks callback error')
    return NextResponse.redirect(
      new URL('/admin/settings/integrations?error=unknown', request.url)
    )
  }
}
