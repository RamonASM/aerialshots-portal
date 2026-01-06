import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getStaffAccess } from '@/lib/auth/server-access'

// GET /api/admin/team/assignments - Get assignments for date range
export async function GET(request: Request) {
  try {
    const access = await getStaffAccess()
    if (!access) {
      return NextResponse.json({ error: 'Staff access required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')
    const from = searchParams.get('from') || date
    const to = searchParams.get('to') || date
    const photographerId = searchParams.get('photographer_id')

    if (!from || !to) {
      return NextResponse.json(
        { error: 'from and to dates are required' },
        { status: 400 }
      )
    }

    const adminSupabase = createAdminClient()

    // Build query
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (adminSupabase as any)
      .from('photographer_assignments')
      .select(`
        id,
        listing_id,
        photographer_id,
        scheduled_date,
        scheduled_time,
        status,
        notes,
        listing:listings(
          id,
          address,
          city,
          state
        )
      `)
      .gte('scheduled_date', from)
      .lte('scheduled_date', to)
      .order('scheduled_date')
      .order('scheduled_time')

    if (photographerId) {
      query = query.eq('photographer_id', photographerId)
    }

    const { data: assignments, error } = await query

    if (error) {
      console.error('Error fetching assignments:', error)
      return NextResponse.json({ error: 'Failed to fetch assignments' }, { status: 500 })
    }

    return NextResponse.json({ assignments: assignments || [] })
  } catch (error) {
    console.error('Assignments GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
