import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/admin/analytics/export - Export analytics data as CSV
export async function GET(request: Request) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const { data: staff } = await supabase
      .from('staff')
      .select('id, role')
      .eq('user_id', user.id)
      .single()

    if (!staff || !['admin', 'owner'].includes(staff.role)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'jobs'
    const period = searchParams.get('period') || '30d'
    const format = searchParams.get('format') || 'csv'

    // Calculate date range
    let startDate: Date | null = null
    const now = new Date()

    switch (period) {
      case '7d':
        startDate = new Date(now)
        startDate.setDate(startDate.getDate() - 7)
        break
      case '30d':
        startDate = new Date(now)
        startDate.setDate(startDate.getDate() - 30)
        break
      case '90d':
        startDate = new Date(now)
        startDate.setDate(startDate.getDate() - 90)
        break
      case 'ytd':
        startDate = new Date(now.getFullYear(), 0, 1)
        break
      case 'all':
      default:
        startDate = null
        break
    }

    const adminSupabase = createAdminClient()
    let csvContent = ''
    let filename = ''

    switch (type) {
      case 'jobs': {
        // Export jobs/listings data
        let query = adminSupabase
          .from('listings')
          .select(`
            id,
            address,
            city,
            state,
            zip,
            ops_status,
            photographer_id,
            created_at,
            delivered_at
          `)
          .order('created_at', { ascending: false })

        if (startDate) {
          query = query.gte('created_at', startDate.toISOString())
        }

        const { data: listings } = await query.limit(5000)

        // Get photographer names
        const photographerIds = [
          ...new Set(
            (listings || [])
              .map((l) => l.photographer_id)
              .filter((id): id is string => id !== null)
          ),
        ]
        const { data: photographers } = photographerIds.length > 0
          ? await adminSupabase.from('staff').select('id, name').in('id', photographerIds)
          : { data: [] }

        const photographerMap = new Map(
          (photographers || []).map((p) => [p.id, p.name])
        )

        // Build CSV
        const headers = ['ID', 'Address', 'City', 'State', 'ZIP', 'Status', 'Photographer', 'Created', 'Delivered']
        const rows = (listings || []).map((l) => [
          l.id,
          `"${(l.address || '').replace(/"/g, '""')}"`,
          l.city || '',
          l.state || '',
          l.zip || '',
          l.ops_status || '',
          photographerMap.get(l.photographer_id || '') || '',
          l.created_at ? new Date(l.created_at).toLocaleDateString() : '',
          l.delivered_at ? new Date(l.delivered_at).toLocaleDateString() : '',
        ])

        csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
        filename = `jobs_export_${period}_${new Date().toISOString().split('T')[0]}.csv`
        break
      }

      case 'agents': {
        // Export agent data
        const { data: agents } = await adminSupabase
          .from('agents')
          .select('id, name, email, phone, credit_balance, referral_tier, created_at')
          .order('created_at', { ascending: false })

        // Get order counts
        const { data: listings } = await adminSupabase
          .from('listings')
          .select('agent_id')

        const orderCounts: Record<string, number> = {}
        for (const l of listings || []) {
          if (l.agent_id) {
            orderCounts[l.agent_id] = (orderCounts[l.agent_id] || 0) + 1
          }
        }

        const headers = ['ID', 'Name', 'Email', 'Phone', 'Credit Balance', 'Referral Tier', 'Orders', 'Created']
        const rows = (agents || []).map((a) => [
          a.id,
          `"${(a.name || '').replace(/"/g, '""')}"`,
          a.email || '',
          a.phone || '',
          a.credit_balance || 0,
          a.referral_tier || '',
          orderCounts[a.id] || 0,
          a.created_at ? new Date(a.created_at).toLocaleDateString() : '',
        ])

        csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
        filename = `agents_export_${new Date().toISOString().split('T')[0]}.csv`
        break
      }

      case 'team': {
        // Export team performance
        const { data: staffMembers } = await adminSupabase
          .from('staff')
          .select('id, name, email, role, team_role, is_active, max_daily_jobs, created_at')
          .order('name')

        // Get job counts per photographer
        let listingsQuery = adminSupabase
          .from('listings')
          .select('photographer_id, ops_status')

        if (startDate) {
          listingsQuery = listingsQuery.gte('created_at', startDate.toISOString())
        }

        const { data: listings } = await listingsQuery

        const jobCounts: Record<string, { total: number; delivered: number }> = {}
        for (const l of listings || []) {
          if (l.photographer_id) {
            if (!jobCounts[l.photographer_id]) {
              jobCounts[l.photographer_id] = { total: 0, delivered: 0 }
            }
            jobCounts[l.photographer_id].total++
            if (l.ops_status === 'delivered') {
              jobCounts[l.photographer_id].delivered++
            }
          }
        }

        const headers = ['ID', 'Name', 'Email', 'Role', 'Team Role', 'Active', 'Max Daily Jobs', 'Total Jobs', 'Delivered', 'Completion Rate', 'Created']
        const rows = (staffMembers || []).map((s) => {
          const stats = jobCounts[s.id] || { total: 0, delivered: 0 }
          const completionRate = stats.total > 0
            ? Math.round((stats.delivered / stats.total) * 100)
            : 0
          return [
            s.id,
            `"${(s.name || '').replace(/"/g, '""')}"`,
            s.email || '',
            s.role || '',
            s.team_role || '',
            s.is_active ? 'Yes' : 'No',
            s.max_daily_jobs || 6,
            stats.total,
            stats.delivered,
            `${completionRate}%`,
            s.created_at ? new Date(s.created_at).toLocaleDateString() : '',
          ]
        })

        csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
        filename = `team_export_${period}_${new Date().toISOString().split('T')[0]}.csv`
        break
      }

      case 'geographic': {
        // Export geographic data
        let query = adminSupabase
          .from('listings')
          .select('city, state, zip')

        if (startDate) {
          query = query.gte('created_at', startDate.toISOString())
        }

        const { data: listings } = await query

        // Aggregate by city
        const cityData: Record<string, number> = {}
        const zipData: Record<string, { city: string; count: number }> = {}

        for (const l of listings || []) {
          if (l.city) {
            const key = `${l.city}, ${l.state || 'FL'}`
            cityData[key] = (cityData[key] || 0) + 1
          }
          if (l.zip) {
            if (!zipData[l.zip]) {
              zipData[l.zip] = { city: l.city || '', count: 0 }
            }
            zipData[l.zip].count++
          }
        }

        const headers = ['Location', 'Type', 'Count']
        const rows = [
          ...Object.entries(cityData)
            .sort((a, b) => b[1] - a[1])
            .map(([city, count]) => [`"${city}"`, 'City', count]),
          ...Object.entries(zipData)
            .sort((a, b) => b[1].count - a[1].count)
            .map(([zip, data]) => [zip, 'ZIP', data.count]),
        ]

        csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
        filename = `geographic_export_${period}_${new Date().toISOString().split('T')[0]}.csv`
        break
      }

      default:
        return NextResponse.json({ error: 'Invalid export type' }, { status: 400 })
    }

    // Return CSV file
    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json({ error: 'Export failed' }, { status: 500 })
  }
}
