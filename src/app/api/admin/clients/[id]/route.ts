import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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

    // Get agent details
    const { data: agent, error } = await supabase
      .from('agents')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    // Get recent listings
    const { data: listings } = await supabase
      .from('listings')
      .select('id, address, city, state, ops_status, created_at')
      .eq('agent_id', id)
      .order('created_at', { ascending: false })
      .limit(10)

    // Get total listings count
    const { count: totalListingsCount } = await supabase
      .from('listings')
      .select('id', { count: 'exact', head: true })
      .eq('agent_id', id)

    return NextResponse.json({
      agent,
      listings: listings || [],
      stats: {
        totalListings: totalListingsCount || 0,
      },
    })
  } catch (error) {
    console.error('Error fetching client:', error)
    return NextResponse.json(
      { error: 'Failed to fetch client' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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
      .eq('email', user.email!)
      .eq('is_active', true)
      .single()

    if (!staff || staff.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { name, email, phone, brand_color, headshot_url, logo_url, bio } = body

    // Check if agent exists
    const { data: existing } = await supabase
      .from('agents')
      .select('id')
      .eq('id', id)
      .single()

    if (!existing) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    // If email is changing, check for duplicates
    if (email) {
      const { data: duplicate } = await supabase
        .from('agents')
        .select('id')
        .eq('email', email)
        .neq('id', id)
        .single()

      if (duplicate) {
        return NextResponse.json(
          { error: 'An agent with this email already exists' },
          { status: 400 }
        )
      }
    }

    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name
    if (email !== undefined) updateData.email = email
    if (phone !== undefined) updateData.phone = phone
    if (bio !== undefined) updateData.bio = bio
    if (brand_color !== undefined) updateData.brand_color = brand_color
    if (headshot_url !== undefined) updateData.headshot_url = headshot_url
    if (logo_url !== undefined) updateData.logo_url = logo_url

    const { data: agent, error } = await supabase
      .from('agents')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ agent })
  } catch (error) {
    console.error('Error updating client:', error)
    return NextResponse.json(
      { error: 'Failed to update client' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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
      .eq('email', user.email!)
      .eq('is_active', true)
      .single()

    if (!staff || staff.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Delete agent (or handle based on your preference)
    const { error } = await supabase
      .from('agents')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting client:', error)
    return NextResponse.json(
      { error: 'Failed to delete client' },
      { status: 500 }
    )
  }
}
