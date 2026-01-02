import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createConnectAccount, getAccountStatus, createLoginLink } from '@/lib/payments/stripe-connect'

/**
 * GET /api/connect/partner/account
 * Get the current partner's Connect account status
 */
export async function GET() {
  try {
    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anySupabase = supabase as any

    // Get authenticated user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get partner record by user_id or email
    const { data: partner } = await anySupabase
      .from('partners')
      .select('id, name, email, stripe_connect_id, stripe_connect_status, stripe_payouts_enabled, default_profit_percent, payout_schedule')
      .or(`user_id.eq.${user.id},email.eq.${user.email}`)
      .eq('is_active', true)
      .single()

    if (!partner) {
      return NextResponse.json({ error: 'Partner not found' }, { status: 404 })
    }

    // If no Connect account, return basic info
    if (!partner.stripe_connect_id) {
      return NextResponse.json({
        hasAccount: false,
        partner: {
          id: partner.id,
          name: partner.name,
          email: partner.email,
          profitPercent: partner.default_profit_percent,
          payoutSchedule: partner.payout_schedule,
        },
      })
    }

    // Get account status from Stripe
    const accountStatus = await getAccountStatus(partner.stripe_connect_id)

    // Generate login link if account is active
    let dashboardUrl: string | null = null
    if (accountStatus?.payoutsEnabled) {
      dashboardUrl = await createLoginLink(partner.stripe_connect_id)
    }

    return NextResponse.json({
      hasAccount: true,
      partner: {
        id: partner.id,
        name: partner.name,
        email: partner.email,
        profitPercent: partner.default_profit_percent,
        payoutSchedule: partner.payout_schedule,
      },
      connect: {
        accountId: partner.stripe_connect_id,
        status: partner.stripe_connect_status,
        payoutsEnabled: partner.stripe_payouts_enabled,
        ...accountStatus,
        dashboardUrl,
      },
    })
  } catch (error) {
    console.error('[Connect] Error getting partner account:', error)
    return NextResponse.json(
      { error: 'Failed to get account status' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/connect/partner/account
 * Create a new Connect account for the current partner
 */
export async function POST() {
  try {
    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anySupabase = supabase as any

    // Get authenticated user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get partner record
    const { data: partner } = await anySupabase
      .from('partners')
      .select('id, name, email, stripe_connect_id')
      .or(`user_id.eq.${user.id},email.eq.${user.email}`)
      .eq('is_active', true)
      .single()

    if (!partner) {
      return NextResponse.json({ error: 'Partner not found' }, { status: 404 })
    }

    // Check if already has account
    if (partner.stripe_connect_id) {
      return NextResponse.json(
        { error: 'Already has a Connect account' },
        { status: 400 }
      )
    }

    // Create Connect account
    const result = await createConnectAccount({
      type: 'partner',
      entityId: partner.id,
      email: partner.email,
      name: partner.name,
      businessType: 'individual', // Partners are typically individuals
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to create account' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      accountId: result.accountId,
      onboardingUrl: result.onboardingUrl,
    })
  } catch (error) {
    console.error('[Connect] Error creating partner account:', error)
    return NextResponse.json(
      { error: 'Failed to create account' },
      { status: 500 }
    )
  }
}
