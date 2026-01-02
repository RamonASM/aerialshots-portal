import { NextRequest, NextResponse } from 'next/server'
import { syncAccountStatus } from '@/lib/payments/stripe-connect'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.aerialshots.media'

/**
 * GET /api/connect/return
 * Handle return from Stripe Connect onboarding
 * Syncs account status and redirects to appropriate dashboard
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get('type') as 'staff' | 'partner' | null
    const entityId = searchParams.get('id')

    if (!type || !entityId) {
      return NextResponse.redirect(`${APP_URL}/team?error=invalid_params`)
    }

    // Get account ID from database and sync status
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const supabase = createAdminClient()

    const table = type === 'staff' ? 'staff' : 'partners'
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: entity } = await (supabase as any)
      .from(table)
      .select('stripe_connect_id')
      .eq('id', entityId)
      .single()

    if (!entity?.stripe_connect_id) {
      return NextResponse.redirect(`${APP_URL}/team?error=account_not_found`)
    }

    // Sync account status from Stripe
    await syncAccountStatus({
      type,
      entityId,
      accountId: entity.stripe_connect_id,
    })

    // Redirect based on type
    if (type === 'staff') {
      return NextResponse.redirect(`${APP_URL}/team/photographer/settings?connect=success`)
    } else {
      return NextResponse.redirect(`${APP_URL}/partner?connect=success`)
    }
  } catch (error) {
    console.error('[Connect] Error handling return:', error)
    return NextResponse.redirect(`${APP_URL}/team?error=sync_failed`)
  }
}
