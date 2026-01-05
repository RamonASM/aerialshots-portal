import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/admin/team/assignments - Get assignments for date range
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify staff access
    const { data: staffMember } = await supabase
      .from('staff')
      .select('id, role')
      .eq('auth_user_id', user.id)
      .single()

    if (!staffMember) {
      return NextResponse.json({ error: 'Staff access required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const from = searchParams.get('from')
    const to = searchParams.get('to')
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
