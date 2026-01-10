import { NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createConnectAccount, getAccountStatus, createLoginLink } from '@/lib/payments/stripe-connect'

// Type for staff with Stripe Connect fields (columns added but types not regenerated)
interface StaffWithConnect {
  id: string
  name: string
  email: string
  stripe_connect_id: string | null
  stripe_connect_status: string | null
  stripe_payouts_enabled: boolean
  payout_type: string | null
  default_payout_percent: number | null
}

/**
 * GET /api/connect/staff/account
 * Get the current staff member's Connect account status
 */
export async function GET() {
  try {
    // Get authenticated user from Clerk
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const email = user.emailAddresses?.[0]?.emailAddress
    if (!email) {
      return NextResponse.json({ error: 'No email found' }, { status: 401 })
    }

    const supabase = createAdminClient()

    // Get staff record - cast to StaffWithConnect since types aren't regenerated yet
    const { data, error: staffError } = await supabase
      .from('staff')
      .select('id, name, email, stripe_connect_id, stripe_connect_status, stripe_payouts_enabled, payout_type, default_payout_percent')
      .eq('email', email)
      .eq('is_active', true)
      .maybeSingle()

    if (staffError) {
      console.error('[Connect] Staff lookup error:', staffError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    const staff = data as StaffWithConnect | null

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
    // Get authenticated user from Clerk
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const email = user.emailAddresses?.[0]?.emailAddress
    if (!email) {
      return NextResponse.json({ error: 'No email found' }, { status: 401 })
    }

    const supabase = createAdminClient()

    // Get staff record - cast since types aren't regenerated yet
    const { data, error: staffError } = await supabase
      .from('staff')
      .select('id, name, email, stripe_connect_id, payout_type')
      .eq('email', email)
      .eq('is_active', true)
      .maybeSingle()

    if (staffError) {
      console.error('[Connect] Staff lookup error:', staffError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    const staff = data as Pick<StaffWithConnect, 'id' | 'name' | 'email' | 'stripe_connect_id' | 'payout_type'> | null

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
