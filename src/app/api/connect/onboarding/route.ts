import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateOnboardingLink } from '@/lib/payments/stripe-connect'

/**
 * POST /api/connect/onboarding
 * Generate a new onboarding link for an existing Connect account
 * Used when the previous link expires or user needs to complete onboarding
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { type } = body as { type?: 'staff' | 'partner' }

    if (!type || !['staff', 'partner'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid type. Must be "staff" or "partner"' },
        { status: 400 }
      )
    }

    let entityId: string
    let accountId: string

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anySupabase = supabase as any

    if (type === 'staff') {
      // Get staff record
      const { data: staff, error: staffError } = await anySupabase
        .from('staff')
        .select('id, stripe_connect_id')
        .eq('email', user.email!)
        .eq('is_active', true)
        .maybeSingle()

      if (staffError) {
        console.error('[Connect] Staff lookup error:', staffError)
        return NextResponse.json({ error: 'Database error' }, { status: 500 })
      }

      if (!staff) {
        return NextResponse.json({ error: 'Staff member not found' }, { status: 404 })
      }

      if (!staff.stripe_connect_id) {
        return NextResponse.json(
          { error: 'No Connect account exists. Create one first.' },
          { status: 400 }
        )
      }

      entityId = staff.id
      accountId = staff.stripe_connect_id
    } else {
      // Get partner record
      const { data: partner, error: partnerError } = await anySupabase
        .from('partners')
        .select('id, stripe_connect_id')
        .or(`user_id.eq.${user.id},email.eq.${user.email}`)
        .eq('is_active', true)
        .maybeSingle()

      if (partnerError) {
        console.error('[Connect] Partner lookup error:', partnerError)
        return NextResponse.json({ error: 'Database error' }, { status: 500 })
      }

      if (!partner) {
        return NextResponse.json({ error: 'Partner not found' }, { status: 404 })
      }

      if (!partner.stripe_connect_id) {
        return NextResponse.json(
          { error: 'No Connect account exists. Create one first.' },
          { status: 400 }
        )
      }

      entityId = partner.id
      accountId = partner.stripe_connect_id
    }

    // Generate new onboarding link
    const result = await generateOnboardingLink({
      type,
      entityId,
      accountId,
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to generate onboarding link' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      onboardingUrl: result.onboardingUrl,
    })
  } catch (error) {
    console.error('[Connect] Error generating onboarding link:', error)
    return NextResponse.json(
      { error: 'Failed to generate onboarding link' },
      { status: 500 }
    )
  }
}
