import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createConnectAccount, getAccountStatus, createLoginLink } from '@/lib/payments/stripe-connect'

/**
 * GET /api/connect/staff/account
 * Get the current staff member's Connect account status
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

    // Get staff record
    const { data: staff } = await anySupabase
      .from('staff')
      .select('id, name, email, stripe_connect_id, stripe_connect_status, stripe_payouts_enabled, payout_type, default_payout_percent')
      .eq('email', user.email!)
      .eq('is_active', true)
      .single()

    if (!staff) {
      return NextResponse.json({ error: 'Staff member not found' }, { status: 404 })
    }

    // If no Connect account, return basic info
    if (!staff.stripe_connect_id) {
      return NextResponse.json({
        hasAccount: false,
        staff: {
          id: staff.id,
          name: staff.name,
          email: staff.email,
          payoutType: staff.payout_type,
          payoutPercent: staff.default_payout_percent,
        },
      })
    }

    // Get account status from Stripe
    const accountStatus = await getAccountStatus(staff.stripe_connect_id)

    // Generate login link if account is active
    let dashboardUrl: string | null = null
    if (accountStatus?.payoutsEnabled) {
      dashboardUrl = await createLoginLink(staff.stripe_connect_id)
    }

    return NextResponse.json({
      hasAccount: true,
      staff: {
        id: staff.id,
        name: staff.name,
        email: staff.email,
        payoutType: staff.payout_type,
        payoutPercent: staff.default_payout_percent,
      },
      connect: {
        accountId: staff.stripe_connect_id,
        status: staff.stripe_connect_status,
        payoutsEnabled: staff.stripe_payouts_enabled,
        ...accountStatus,
        dashboardUrl,
      },
    })
  } catch (error) {
    console.error('[Connect] Error getting staff account:', error)
    return NextResponse.json(
      { error: 'Failed to get account status' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/connect/staff/account
 * Create a new Connect account for the current staff member
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

    // Get staff record
    const { data: staff } = await anySupabase
      .from('staff')
      .select('id, name, email, stripe_connect_id, payout_type')
      .eq('email', user.email!)
      .eq('is_active', true)
      .single()

    if (!staff) {
      return NextResponse.json({ error: 'Staff member not found' }, { status: 404 })
    }

    // Check if already has account
    if (staff.stripe_connect_id) {
      return NextResponse.json(
        { error: 'Already has a Connect account' },
        { status: 400 }
      )
    }

    // Check if eligible (must be 1099 contractor)
    if (staff.payout_type !== '1099') {
      return NextResponse.json(
        { error: 'Only 1099 contractors can create Connect accounts' },
        { status: 400 }
      )
    }

    // Create Connect account
    const result = await createConnectAccount({
      type: 'staff',
      entityId: staff.id,
      email: staff.email,
      name: staff.name,
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
    console.error('[Connect] Error creating staff account:', error)
    return NextResponse.json(
      { error: 'Failed to create account' },
      { status: 500 }
    )
  }
}
