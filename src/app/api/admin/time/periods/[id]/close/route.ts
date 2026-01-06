import { NextRequest, NextResponse } from 'next/server'
import { requireStaffAccess } from '@/lib/auth/server-access'
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
    await requireStaffAccess(['admin'])
    const { id } = await params

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
