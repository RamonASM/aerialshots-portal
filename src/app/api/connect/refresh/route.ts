import { NextRequest, NextResponse } from 'next/server'
import { generateOnboardingLink } from '@/lib/payments/stripe-connect'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.aerialshots.media'

/**
 * GET /api/connect/refresh
 * Handle refresh when Stripe onboarding link expires
 * Generates a new link and redirects the user
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get('type') as 'staff' | 'partner' | null
    const entityId = searchParams.get('id')

    if (!type || !entityId) {
      return NextResponse.redirect(`${APP_URL}/team?error=invalid_params`)
    }

    // Get account ID from database
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

    // Generate new onboarding link
    const result = await generateOnboardingLink({
      type,
      entityId,
      accountId: entity.stripe_connect_id,
    })

    if (!result.success || !result.onboardingUrl) {
      return NextResponse.redirect(`${APP_URL}/team?error=link_generation_failed`)
    }

    // Redirect to Stripe onboarding
    return NextResponse.redirect(result.onboardingUrl)
  } catch (error) {
    console.error('[Connect] Error handling refresh:', error)
    return NextResponse.redirect(`${APP_URL}/team?error=refresh_failed`)
  }
}
