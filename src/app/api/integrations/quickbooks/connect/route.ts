import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getQuickBooksClient } from '@/lib/integrations/quickbooks/client'
import { randomUUID } from 'crypto'
import { cookies } from 'next/headers'
import { apiLogger } from '@/lib/logger'

/**
 * GET /api/integrations/quickbooks/connect
 * Initiate OAuth connection to QuickBooks
 * Requires staff authentication
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

    const qbClient = getQuickBooksClient()

    if (!qbClient.isConfigured()) {
      return NextResponse.json(
        { error: 'QuickBooks integration not configured. Please set environment variables.' },
        { status: 500 }
      )
    }

    // Generate state for CSRF protection
    const state = randomUUID()

    // Store state in cookie for verification
    const cookieStore = await cookies()
    cookieStore.set('qb_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
    })

    const authUrl = qbClient.getAuthorizationUrl(state)

    apiLogger.info({ staffId: staff.id }, 'QuickBooks OAuth initiated')

    return NextResponse.redirect(authUrl)
  } catch (error) {
    apiLogger.error({ error: String(error) }, 'QuickBooks connect error')
    return NextResponse.json({ error: 'Failed to initiate connection' }, { status: 500 })
  }
}
