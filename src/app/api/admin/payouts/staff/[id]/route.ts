import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireStaffAccess } from '@/lib/auth/server-access'

/**
 * GET /api/admin/payouts/staff/[id]
 * Get payout config for a staff member
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireStaffAccess(['admin'])
    const supabase = createAdminClient()
    const { id } = await params

    // Get staff member
    const { data: staff, error } = await supabase
      .from('staff')
      .select(`
        id,
        name,
        email,
        role,
        payout_type,
        default_payout_percent,
        hourly_rate,
        stripe_connect_id,
        stripe_connect_status,
        stripe_payouts_enabled,
        partner_id
      `)
      .eq('id', id)
      .single()

    if (error || !staff) {
      return NextResponse.json({ error: 'Staff member not found' }, { status: 404 })
    }

    return NextResponse.json({ staff })
  } catch (error) {
    console.error('[Payouts] Error getting staff:', error)
    return NextResponse.json(
      { error: 'Failed to get staff member' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/admin/payouts/staff/[id]
 * Update payout config for a staff member
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireStaffAccess(['admin'])
    const supabase = createAdminClient()
    const { id } = await params

    const body = await request.json()
    const {
      payout_type,
      default_payout_percent,
      hourly_rate,
      partner_id,
    } = body

    // Validate
    if (payout_type && !['w2', '1099', 'hourly'].includes(payout_type)) {
      return NextResponse.json({ error: 'Invalid payout type' }, { status: 400 })
    }

    if (default_payout_percent !== undefined) {
      const percent = parseFloat(default_payout_percent)
      if (isNaN(percent) || percent < 0 || percent > 100) {
        return NextResponse.json({ error: 'Invalid payout percent' }, { status: 400 })
      }
    }

    if (hourly_rate !== undefined) {
      const rate = parseFloat(hourly_rate)
      if (isNaN(rate) || rate < 0) {
        return NextResponse.json({ error: 'Invalid hourly rate' }, { status: 400 })
      }
    }

    // Build update object
    const updateData: Record<string, unknown> = {}
    if (payout_type !== undefined) updateData.payout_type = payout_type
    if (default_payout_percent !== undefined) updateData.default_payout_percent = parseFloat(default_payout_percent)
    if (hourly_rate !== undefined) updateData.hourly_rate = parseFloat(hourly_rate)
    if (partner_id !== undefined) updateData.partner_id = partner_id || null

    const { data: staff, error } = await supabase
      .from('staff')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true, staff })
  } catch (error) {
    console.error('[Payouts] Error updating staff:', error)
    return NextResponse.json(
      { error: 'Failed to update staff member' },
      { status: 500 }
    )
  }
}
