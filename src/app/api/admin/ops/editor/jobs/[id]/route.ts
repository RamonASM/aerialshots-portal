import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getStaffAccess, hasRequiredRole } from '@/lib/auth/server-access'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const access = await getStaffAccess()
    if (!access) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { id } = await params
    const supabase = createAdminClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: job, error } = await (supabase as any)
      .from('listings')
      .select('*, agents!listings_agent_id_fkey(id, name, phone, email)')
      .eq('id', id)
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({ job })
  } catch (error) {
    console.error('Error fetching editor job:', error)
    return NextResponse.json(
      { error: 'Failed to fetch job' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const access = await getStaffAccess()
    if (!access) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!hasRequiredRole(access.role, ['editor'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const { id } = await params
    const body = await request.json()
    const action = body?.action as string | undefined

    const supabase = createAdminClient()
    const now = new Date().toISOString()
    let update: Record<string, unknown> | null = null

    if (action === 'start') {
      update = {
        ops_status: 'in_editing',
        editor_id: access.id,
        editing_started_at: now,
      }
    }

    if (action === 'complete') {
      update = {
        ops_status: 'ready_for_qc',
        editing_completed_at: now,
      }
    }

    if (!update) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: job, error } = await (supabase as any)
      .from('listings')
      .update(update)
      .eq('id', id)
      .select('*, agents!listings_agent_id_fkey(id, name, phone, email)')
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({ job })
  } catch (error) {
    console.error('Error updating editor job:', error)
    return NextResponse.json(
      { error: 'Failed to update job' },
      { status: 500 }
    )
  }
}
