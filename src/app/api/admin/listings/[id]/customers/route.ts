import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireStaffAccess } from '@/lib/auth/server-access'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/admin/listings/[id]/customers - Get all customers for a listing
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params
    await requireStaffAccess()

    const adminSupabase = createAdminClient()

    // Get listing with primary agent
    const { data: listing, error: listingError } = await adminSupabase
      .from('listings')
      .select('id, agent_id, agents(id, name, email, phone)')
      .eq('id', id)
      .maybeSingle()

    if (listingError) {
      console.error('[Listing Customers] Listing lookup error:', listingError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    if (!listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
    }

    // Get additional customers (use type cast for new table)
    const { data: additionalCustomers } = await (adminSupabase as any)
      .from('listing_customers')
      .select(`
        id,
        agent_id,
        role,
        share_percentage,
        can_download,
        can_edit,
        notification_enabled,
        added_at,
        agent:agents(id, name, email, phone)
      `)
      .eq('listing_id', id)
      .order('added_at', { ascending: true })

    // Combine primary agent with additional customers
    const customers = [
      {
        id: 'primary',
        agent_id: listing.agent_id,
        role: 'primary',
        share_percentage: 100,
        can_download: true,
        can_edit: true,
        notification_enabled: true,
        agent: listing.agents,
        is_primary: true,
      },
      ...(additionalCustomers || []).map((c: any) => ({
        ...c,
        is_primary: false,
      })),
    ]

    return NextResponse.json({ customers })
  } catch (error) {
    console.error('Error fetching listing customers:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/admin/listings/[id]/customers - Add a customer to a listing
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params
    const access = await requireStaffAccess()

    const body = await request.json()
    const { agent_id, role, share_percentage, can_download, can_edit, notification_enabled } = body

    if (!agent_id) {
      return NextResponse.json({ error: 'Agent ID is required' }, { status: 400 })
    }

    const adminSupabase = createAdminClient()

    // Check if listing exists
    const { data: listing, error: listingError } = await adminSupabase
      .from('listings')
      .select('id, agent_id')
      .eq('id', id)
      .maybeSingle()

    if (listingError) {
      console.error('[Listing Customers] Listing lookup error:', listingError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    if (!listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
    }

    // Can't add primary agent as additional customer
    if (listing.agent_id === agent_id) {
      return NextResponse.json(
        { error: 'Cannot add primary agent as additional customer' },
        { status: 400 }
      )
    }

    // Check if agent exists
    const { data: agent, error: agentError } = await adminSupabase
      .from('agents')
      .select('id, name')
      .eq('id', agent_id)
      .maybeSingle()

    if (agentError) {
      console.error('[Listing Customers] Agent lookup error:', agentError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    // Add customer (use type cast for new table)
    const { data: customer, error } = await (adminSupabase as any)
      .from('listing_customers')
      .insert({
        listing_id: id,
        agent_id,
        role: role || 'secondary',
        share_percentage: share_percentage || 0,
        can_download: can_download !== false,
        can_edit: can_edit || false,
        notification_enabled: notification_enabled !== false,
        added_by: access.id,
      })
      .select(`
        id,
        agent_id,
        role,
        share_percentage,
        can_download,
        can_edit,
        notification_enabled,
        added_at,
        agent:agents(id, name, email, phone)
      `)
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'This agent is already a customer for this listing' },
          { status: 400 }
        )
      }
      throw error
    }

    return NextResponse.json({ customer }, { status: 201 })
  } catch (error) {
    console.error('Error adding listing customer:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/admin/listings/[id]/customers - Remove a customer from a listing
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const customerId = searchParams.get('customerId')

    if (!customerId) {
      return NextResponse.json({ error: 'Customer ID is required' }, { status: 400 })
    }

    await requireStaffAccess()

    const adminSupabase = createAdminClient()

    // Delete customer (use type cast for new table)
    const { error } = await (adminSupabase as any)
      .from('listing_customers')
      .delete()
      .eq('id', customerId)
      .eq('listing_id', id)

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error removing listing customer:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
