import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type EditRequestStatus = 'pending' | 'reviewing' | 'approved' | 'in_progress' | 'completed' | 'rejected' | 'cancelled'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is staff
    const { data: staff } = await supabase
      .from('staff')
      .select('id')
      .eq('email', user.email!)
      .eq('is_active', true)
      .single()

    if (!staff) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    const priority = searchParams.get('priority')
    const requestType = searchParams.get('request_type')
    const assignedTo = searchParams.get('assigned_to')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    // Build query with filters (using simple select to avoid deep type issues)
    let query = supabase
      .from('edit_requests')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply filters
    if (status && status !== 'all') {
      query = query.eq('status', status as EditRequestStatus)
    }

    if (priority && priority !== 'all') {
      query = query.eq('priority', priority)
    }

    if (requestType && requestType !== 'all') {
      query = query.eq('request_type', requestType)
    }

    if (assignedTo) {
      if (assignedTo === 'unassigned') {
        query = query.is('assigned_to', null)
      } else {
        query = query.eq('assigned_to', assignedTo)
      }
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`)
    }

    const { data: requestsData, count, error } = await query

    // Fetch related data for each request
    const editRequests = requestsData ? await Promise.all(
      requestsData.map(async (req) => {
        const [agentResult, listingResult, assignedStaffResult, resolverResult] = await Promise.all([
          req.agent_id
            ? supabase.from('agents').select('id, name, email').eq('id', req.agent_id).single()
            : { data: null },
          req.listing_id
            ? supabase.from('listings').select('id, address, city, state').eq('id', req.listing_id).single()
            : { data: null },
          req.assigned_to
            ? supabase.from('staff').select('id, name, avatar_url').eq('id', req.assigned_to).single()
            : { data: null },
          req.resolved_by
            ? supabase.from('staff').select('id, name').eq('id', req.resolved_by).single()
            : { data: null },
        ])

        return {
          ...req,
          agent: agentResult.data,
          listing: listingResult.data,
          assigned_staff: assignedStaffResult.data,
          resolver: resolverResult.data,
        }
      })
    ) : []

    if (error) {
      if (error.code === '42P01') {
        return NextResponse.json({
          editRequests: [],
          stats: {
            total: 0,
            pending: 0,
            inProgress: 0,
            completedToday: 0,
          },
          total: 0,
          page,
          limit,
          totalPages: 0,
        })
      }
      throw error
    }

    // Get stats
    const { data: allRequests } = await supabase
      .from('edit_requests')
      .select('status, resolved_at')

    const today = new Date().toISOString().split('T')[0]
    const stats = {
      total: allRequests?.length || 0,
      pending: allRequests?.filter(r => r.status === 'pending').length || 0,
      inProgress: allRequests?.filter(r => ['reviewing', 'approved', 'in_progress'].includes(r.status)).length || 0,
      completedToday: allRequests?.filter(r =>
        r.status === 'completed' && r.resolved_at?.startsWith(today)
      ).length || 0,
    }

    return NextResponse.json({
      editRequests: editRequests || [],
      stats,
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    })
  } catch (error) {
    console.error('Error fetching edit requests:', error)
    return NextResponse.json(
      { error: 'Failed to fetch edit requests' },
      { status: 500 }
    )
  }
}
