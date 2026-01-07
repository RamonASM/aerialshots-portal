import { NextRequest, NextResponse } from 'next/server'
import { getStaffAccess, hasRequiredRole } from '@/lib/auth/server-access'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  try {
    // Check authentication via Clerk or Supabase session
    const access = await getStaffAccess()
    if (!access) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createAdminClient()
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || 'all'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    // Build query
    let query = supabase
      .from('agents')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply filters
    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,company.ilike.%${search}%`)
    }

    if (status === 'active') {
      query = query.eq('is_active', true)
    } else if (status === 'inactive') {
      query = query.eq('is_active', false)
    }

    const { data: agents, count, error } = await query

    if (error) throw error

    // Get order counts for each agent
    const agentIds = agents?.map(a => a.id) || []
    const { data: orderCounts } = agentIds.length > 0
      ? await supabase
          .from('orders')
          .select('agent_id')
          .in('agent_id', agentIds)
      : { data: [] }

    // Count orders per agent
    const orderCountMap: Record<string, number> = {}
    orderCounts?.forEach(order => {
      if (order.agent_id) {
        orderCountMap[order.agent_id] = (orderCountMap[order.agent_id] || 0) + 1
      }
    })

    // Get listing counts for each agent
    const { data: listingCounts } = agentIds.length > 0
      ? await supabase
          .from('listings')
          .select('agent_id')
          .in('agent_id', agentIds)
      : { data: [] }

    const listingCountMap: Record<string, number> = {}
    listingCounts?.forEach(listing => {
      if (listing.agent_id) {
        listingCountMap[listing.agent_id] = (listingCountMap[listing.agent_id] || 0) + 1
      }
    })

    // Enrich agents with counts
    const enrichedAgents = agents?.map(agent => ({
      ...agent,
      orderCount: orderCountMap[agent.id] || 0,
      listingCount: listingCountMap[agent.id] || 0,
    }))

    return NextResponse.json({
      agents: enrichedAgents,
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    })
  } catch (error) {
    console.error('Error fetching clients:', error)
    return NextResponse.json(
      { error: 'Failed to fetch clients' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication via Clerk or Supabase session
    const access = await getStaffAccess()
    if (!access) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Require admin role for creating clients
    if (!hasRequiredRole(access.role, ['admin'])) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const supabase = createAdminClient()
    const body = await request.json()
    const { name, email, phone } = body

    if (!name || !email) {
      return NextResponse.json(
        { error: 'Name and email are required' },
        { status: 400 }
      )
    }

    // Check if agent with email already exists
    const { data: existing, error: existingError } = await supabase
      .from('agents')
      .select('id')
      .eq('email', email)
      .maybeSingle()

    if (existingError) {
      console.error('Error checking existing agent:', existingError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    if (existing) {
      return NextResponse.json(
        { error: 'An agent with this email already exists' },
        { status: 400 }
      )
    }

    // Generate slug from name
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

    const { data: agent, error } = await supabase
      .from('agents')
      .insert({
        name,
        email,
        slug,
        phone,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ agent })
  } catch (error) {
    console.error('Error creating client:', error)
    return NextResponse.json(
      { error: 'Failed to create client' },
      { status: 500 }
    )
  }
}
