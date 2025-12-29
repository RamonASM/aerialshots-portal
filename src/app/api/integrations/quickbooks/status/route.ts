import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { apiLogger, formatError } from '@/lib/logger'

interface QuickBooksSettings {
  connected: boolean
  realm_id?: string
  token_expiry?: string
  refresh_expiry?: string
  connected_at?: string
  connected_by?: string
}

/**
 * GET /api/integrations/quickbooks/status
 * Get QuickBooks connection status
 */
export async function GET() {
  try {
    const supabase = await createClient()

    // Verify staff authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user?.email) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Verify staff role
    const { data: staff } = await supabase
      .from('staff')
      .select('id, role')
      .eq('email', user.email)
      .eq('is_active', true)
      .single()

    if (!staff || !['admin', 'owner'].includes(staff.role)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Get QuickBooks settings
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: settings, error: settingsError } = await (supabase as any)
      .from('integration_settings')
      .select('value, updated_at')
      .eq('key', 'quickbooks')
      .single()

    if (settingsError || !settings) {
      return NextResponse.json({
        success: true,
        connected: false,
        message: 'QuickBooks not configured',
      })
    }

    const qbSettings = settings.value as QuickBooksSettings

    // Check if tokens are expired
    const tokenExpired = qbSettings.token_expiry
      ? new Date(qbSettings.token_expiry) < new Date()
      : true
    const refreshExpired = qbSettings.refresh_expiry
      ? new Date(qbSettings.refresh_expiry) < new Date()
      : true

    return NextResponse.json({
      success: true,
      connected: qbSettings.connected && !refreshExpired,
      realmId: qbSettings.realm_id,
      tokenStatus: tokenExpired ? 'expired' : 'valid',
      refreshTokenStatus: refreshExpired ? 'expired' : 'valid',
      connectedAt: qbSettings.connected_at,
      connectedBy: qbSettings.connected_by,
      needsReconnect: refreshExpired,
    })
  } catch (error) {
    apiLogger.error({ error: formatError(error) }, 'QuickBooks status error')
    return NextResponse.json({ error: 'Failed to get status' }, { status: 500 })
  }
}

/**
 * DELETE /api/integrations/quickbooks/status
 * Disconnect QuickBooks integration
 */
export async function DELETE() {
  try {
    const supabase = await createClient()

    // Verify staff authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user?.email) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Verify staff role
    const { data: staff } = await supabase
      .from('staff')
      .select('id, role')
      .eq('email', user.email)
      .eq('is_active', true)
      .single()

    if (!staff || !['admin', 'owner'].includes(staff.role)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Clear QuickBooks settings
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: deleteError } = await (supabase as any)
      .from('integration_settings')
      .delete()
      .eq('key', 'quickbooks')

    if (deleteError) {
      apiLogger.error({ error: formatError(deleteError) }, 'Failed to disconnect QuickBooks')
      return NextResponse.json({ error: 'Failed to disconnect' }, { status: 500 })
    }

    apiLogger.info({ staffEmail: user.email }, 'QuickBooks disconnected')

    return NextResponse.json({
      success: true,
      message: 'QuickBooks disconnected successfully',
    })
  } catch (error) {
    apiLogger.error({ error: formatError(error) }, 'QuickBooks disconnect error')
    return NextResponse.json({ error: 'Failed to disconnect' }, { status: 500 })
  }
}
