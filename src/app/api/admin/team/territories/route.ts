import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/admin/team/territories - List all territories
export async function GET() {
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
      .eq('user_id', user.id)
      .single()

    if (!staffMember) {
      return NextResponse.json({ error: 'Staff access required' }, { status: 403 })
    }

    const adminSupabase = createAdminClient()

    // Get territories
    const { data: territories, error } = await adminSupabase
      .from('service_territories')
      .select('id, name, description, zip_codes, cities, is_active, created_at')
      .order('name')

    if (error) {
      console.error('Error fetching territories:', error)
      return NextResponse.json({ error: 'Failed to fetch territories' }, { status: 500 })
    }

    // Get staff counts per territory
    let staffCounts: Record<string, number> = {}
    try {
      const { data: assignments } = await adminSupabase
        .from('staff_territories')
        .select('territory_id')

      if (assignments) {
        staffCounts = assignments.reduce((acc: Record<string, number>, a) => {
          acc[a.territory_id] = (acc[a.territory_id] || 0) + 1
          return acc
        }, {})
      }
    } catch {
      // Table may not exist yet
    }

    // Transform the response to include assigned_staff count
    const transformedTerritories = territories?.map(t => ({
      id: t.id,
      name: t.name,
      description: t.description,
      zip_codes: t.zip_codes || [],
      cities: t.cities || [],
      is_active: t.is_active,
      assigned_staff: staffCounts[t.id] || 0,
      created_at: t.created_at,
    })) || []

    return NextResponse.json({ territories: transformedTerritories })
  } catch (error) {
    console.error('Territories GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/admin/team/territories - Create a new territory
export async function POST(request: Request) {
  try {
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

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const adminSupabase = createAdminClient()

    const { data: territory, error } = await adminSupabase
      .from('service_territories')
      .insert({
        name: name.trim(),
        description: description?.trim() || null,
        zip_codes: zip_codes || [],
        cities: cities || [],
        is_active: is_active ?? true,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating territory:', error)
      return NextResponse.json({ error: 'Failed to create territory' }, { status: 500 })
    }

    return NextResponse.json({ territory }, { status: 201 })
  } catch (error) {
    console.error('Territories POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
