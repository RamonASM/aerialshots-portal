import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { closePayPeriod } from '@/lib/time-tracking/service'

/**
 * POST /api/admin/time/periods/[id]/close
 * Close a pay period (admin only)
 */
export async function POST(
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

    // Close the pay period
    const result = await closePayPeriod(id)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      totalHours: result.totalHours,
      totalPayCents: result.totalPayCents,
    })
  } catch (error) {
    console.error('[Admin Time] Error closing period:', error)
    return NextResponse.json(
      { error: 'Failed to close pay period' },
      { status: 500 }
    )
  }
}
