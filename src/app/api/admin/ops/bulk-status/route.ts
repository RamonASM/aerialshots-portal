import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireStaff } from '@/lib/middleware/auth'

const VALID_STATUSES = [
  'pending',
  'scheduled',
  'in_progress',
  'staged',
  'awaiting_editing',
  'in_editing',
  'ready_for_qc',
  'in_qc',
  'delivered',
]

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Require staff authentication
    await requireStaff(supabase)

    const body = await request.json()
    const { jobIds, newStatus } = body

    // Validate inputs
    if (!Array.isArray(jobIds) || jobIds.length === 0) {
      return NextResponse.json(
        { error: 'jobIds must be a non-empty array' },
        { status: 400 }
      )
    }

    if (!VALID_STATUSES.includes(newStatus)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` },
        { status: 400 }
      )
    }

    // Update all jobs
    const { data, error } = await supabase
      .from('listings')
      .update({
        ops_status: newStatus,
        ...(newStatus === 'delivered' ? { delivered_at: new Date().toISOString() } : {}),
      })
      .in('id', jobIds)
      .select('id, address, ops_status')

    if (error) {
      console.error('Bulk status update error:', error)
      return NextResponse.json(
        { error: 'Failed to update jobs' },
        { status: 500 }
      )
    }

    // Log events for each job
    const events = jobIds.map(jobId => ({
      listing_id: jobId,
      event_type: 'status_change',
      new_value: { ops_status: newStatus },
      actor_type: 'staff' as const,
    }))

    await supabase.from('job_events').insert(events)

    return NextResponse.json({
      success: true,
      updated: data?.length || 0,
      jobs: data,
    })
  } catch (error) {
    console.error('Bulk status update error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
