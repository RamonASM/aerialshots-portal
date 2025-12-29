import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/admin/team/territories/[id] - Get single territory
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify staff access
    const { data: staffMember } = await supabase
      .from('staff')
      .select('id, role')
      .eq('user_id', user.id)
      .single()

    if (!staffMember) {
      return NextResponse.json({ error: 'Staff access required' }, { status: 403 })
    }

    const adminSupabase = createAdminClient()

    const { data: territory, error } = await adminSupabase
      .from('service_territories')
      .select('id, name, description, zip_codes, cities, is_active, created_at')
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching territory:', error)
      return NextResponse.json({ error: 'Territory not found' }, { status: 404 })
    }

    // Get assigned staff
    let assignedStaff: Array<{ staff_id: string; is_primary: boolean; name: string; role: string }> = []
    try {
      const { data: assignments } = await adminSupabase
        .from('staff_territories')
        .select('staff_id, is_primary')
        .eq('territory_id', id)

      if (assignments?.length) {
        const staffIds = assignments.map((a) => a.staff_id)
        const { data: staffData } = await adminSupabase
          .from('staff')
          .select('id, name, role')
          .in('id', staffIds)

        const staffMap = new Map(
          staffData?.map(s => [s.id, { name: s.name, role: s.role }]) || []
        )

        assignedStaff = assignments.map((a) => ({
          staff_id: a.staff_id,
          is_primary: a.is_primary,
          name: staffMap.get(a.staff_id)?.name || 'Unknown',
          role: staffMap.get(a.staff_id)?.role || 'unknown',
        }))
      }
    } catch {
      // Table may not exist yet
    }

    return NextResponse.json({
      territory: {
        ...territory,
        assigned_staff: assignedStaff,
      },
    })
  } catch (error) {
    console.error('Territory GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/admin/team/territories/[id] - Update a territory
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify admin access
    const { data: staffMember } = await supabase
      .from('staff')
      .select('id, role')
      .eq('user_id', user.id)
      .single()

    if (!staffMember || !['admin', 'owner'].includes(staffMember.role)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { name, description, zip_codes, cities, is_active } = body

    if (name !== undefined && !name?.trim()) {
      return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 })
    }

    const adminSupabase = createAdminClient()

    // Build update object with only provided fields
    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name.trim()
    if (description !== undefined) updateData.description = description?.trim() || null
    if (zip_codes !== undefined) updateData.zip_codes = zip_codes
    if (cities !== undefined) updateData.cities = cities
    if (is_active !== undefined) updateData.is_active = is_active

    const { data: territory, error } = await adminSupabase
      .from('service_territories')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating territory:', error)
      return NextResponse.json({ error: 'Failed to update territory' }, { status: 500 })
    }

    return NextResponse.json({ territory })
  } catch (error) {
    console.error('Territory PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/admin/team/territories/[id] - Delete a territory
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify admin access
    const { data: staffMember } = await supabase
      .from('staff')
      .select('id, role')
      .eq('user_id', user.id)
      .single()

    if (!staffMember || !['admin', 'owner'].includes(staffMember.role)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const adminSupabase = createAdminClient()

    // Delete territory (staff_territories will cascade delete)
    const { error } = await adminSupabase
      .from('service_territories')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting territory:', error)
      return NextResponse.json({ error: 'Failed to delete territory' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Territory DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
