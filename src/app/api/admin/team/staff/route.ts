import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Database } from '@/lib/supabase/types'

// GET /api/admin/team/staff - List all staff members
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify staff access
    const { data: currentStaff } = await supabase
      .from('staff')
      .select('id, role')
      .eq('user_id', user.id)
      .single()

    if (!currentStaff) {
      return NextResponse.json({ error: 'Staff access required' }, { status: 403 })
    }

    const adminSupabase = createAdminClient()

    // Get all staff members
    // Note: staff_territories table is new, types not yet regenerated
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: staff, error } = await (adminSupabase as any)
      .from('staff')
      .select(`
        id,
        name,
        email,
        role,
        phone,
        skills,
        certifications,
        max_daily_jobs,
        is_active,
        created_at
      `)
      .order('name')

    if (error) {
      console.error('Error fetching staff:', error)
      return NextResponse.json({ error: 'Failed to fetch staff' }, { status: 500 })
    }

    // Get territory assignments separately (table may not exist yet)
    let staffTerritories: Array<{
      staff_id: string
      territory_id: string
      is_primary: boolean
      territory_name?: string
    }> = []

    try {
      type StaffTerritoryRow = Database['public']['Tables']['staff_territories']['Row']
      type ServiceTerritoryRow = Database['public']['Tables']['service_territories']['Row']

      const assignmentsQuery = await adminSupabase
        .from('staff_territories')
        .select('staff_id, territory_id, is_primary')

      const assignments = assignmentsQuery.data as Pick<StaffTerritoryRow, 'staff_id' | 'territory_id' | 'is_primary'>[] | null

      if (assignments) {
        // Get territory names
        const territoriesQuery = await adminSupabase
          .from('service_territories')
          .select('id, name')

        const territories = territoriesQuery.data as Pick<ServiceTerritoryRow, 'id' | 'name'>[] | null

        const territoryMap = new Map(
          territories?.map(t => [t.id, t.name]) || []
        )

        staffTerritories = assignments.map(a => ({
          staff_id: a.staff_id,
          territory_id: a.territory_id,
          is_primary: a.is_primary ?? false,
          territory_name: territoryMap.get(a.territory_id),
        }))
      }
    } catch {
      // Table may not exist yet, ignore
    }

    // Transform the response
    const transformedStaff = staff?.map((s: {
      id: string
      name: string
      email: string
      role: string
      phone: string | null
      skills: string[] | null
      certifications: string[] | null
      max_daily_jobs: number | null
      is_active: boolean
      created_at: string
    }) => ({
      id: s.id,
      name: s.name,
      email: s.email,
      role: s.role,
      phone: s.phone,
      skills: s.skills || [],
      certifications: s.certifications || [],
      max_daily_jobs: s.max_daily_jobs,
      is_active: s.is_active,
      territories: staffTerritories
        .filter(st => st.staff_id === s.id)
        .map(st => ({
          id: st.territory_id,
          name: st.territory_name,
          is_primary: st.is_primary,
        })),
      created_at: s.created_at,
    })) || []

    return NextResponse.json({ staff: transformedStaff })
  } catch (error) {
    console.error('Staff GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
