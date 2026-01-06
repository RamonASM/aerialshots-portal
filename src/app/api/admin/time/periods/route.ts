import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireStaffAccess } from '@/lib/auth/server-access'
import { getCurrentPayPeriod } from '@/lib/time-tracking/service'

/**
 * GET /api/admin/time/periods
 * Get all pay periods (admin only)
 */
export async function GET(request: NextRequest) {
  try {
    await requireStaffAccess(['admin'])
    const supabase = createAdminClient()

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status') // 'open', 'closed', 'paid'

    // Get all pay periods
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase as any)
      .from('pay_periods')
      .select('*')
      .order('start_date', { ascending: false })
      .limit(20)

    if (status) {
      query = query.eq('status', status)
    }

    const { data: periods, error } = await query

    if (error) {
      throw error
    }

    // Get current period
    const currentPeriod = await getCurrentPayPeriod()

    return NextResponse.json({
      periods,
      currentPeriod,
    })
  } catch (error) {
    console.error('[Admin Time] Error getting periods:', error)
    return NextResponse.json(
      { error: 'Failed to get pay periods' },
      { status: 500 }
    )
  }
}
