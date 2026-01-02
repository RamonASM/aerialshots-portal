import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentPayPeriod } from '@/lib/time-tracking/service'

/**
 * GET /api/admin/time/periods
 * Get all pay periods (admin only)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

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
