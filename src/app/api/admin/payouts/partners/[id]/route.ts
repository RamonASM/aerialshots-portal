import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * GET /api/admin/payouts/partners/[id]
 * Get payout config for a partner
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await params

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is staff (admin)
    const { data: staff } = await supabase
      .from('staff')
      .select('id')
      .eq('email', user.email!)
      .eq('is_active', true)
      .single()

    if (!staff) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get partner
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: partner, error } = await (supabase as any)
      .from('partners')
      .select(`
        id,
        name,
        email,
        default_profit_percent,
        payout_schedule,
        stripe_connect_id,
        stripe_connect_status,
        stripe_payouts_enabled
      `)
      .eq('id', id)
      .single()

    if (error || !partner) {
      return NextResponse.json({ error: 'Partner not found' }, { status: 404 })
    }

    return NextResponse.json({ partner })
  } catch (error) {
    console.error('[Payouts] Error getting partner:', error)
    return NextResponse.json(
      { error: 'Failed to get partner' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/admin/payouts/partners/[id]
 * Update payout config for a partner
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await params

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is staff (admin)
    const { data: staff } = await supabase
      .from('staff')
      .select('id')
      .eq('email', user.email!)
      .eq('is_active', true)
      .single()

    if (!staff) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      default_profit_percent,
      payout_schedule,
    } = body

    // Validate
    if (default_profit_percent !== undefined) {
      const percent = parseFloat(default_profit_percent)
      if (isNaN(percent) || percent < 0 || percent > 100) {
        return NextResponse.json({ error: 'Invalid profit percent' }, { status: 400 })
      }
    }

    if (payout_schedule && !['instant', 'daily', 'weekly'].includes(payout_schedule)) {
      return NextResponse.json({ error: 'Invalid payout schedule' }, { status: 400 })
    }

    // Build update object
    const updateData: Record<string, unknown> = {}
    if (default_profit_percent !== undefined) updateData.default_profit_percent = parseFloat(default_profit_percent)
    if (payout_schedule !== undefined) updateData.payout_schedule = payout_schedule

    const adminSupabase = createAdminClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: partner, error } = await (adminSupabase as any)
      .from('partners')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true, partner })
  } catch (error) {
    console.error('[Payouts] Error updating partner:', error)
    return NextResponse.json(
      { error: 'Failed to update partner' },
      { status: 500 }
    )
  }
}
