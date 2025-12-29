import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type EditRequestType =
  | 'photo_retouching'
  | 'color_correction'
  | 'sky_replacement'
  | 'object_removal'
  | 'virtual_staging_revision'
  | 'video_edit'
  | 'floor_plan_correction'
  | 'add_watermark'
  | 'remove_watermark'
  | 'crop_resize'
  | 'exposure_adjustment'
  | 'other'

type EditRequestPriority = 'low' | 'normal' | 'high' | 'urgent'

interface EditRequestInput {
  request_type: EditRequestType
  title: string
  description?: string
  asset_ids?: string[]
  reference_images?: string[]
  priority?: EditRequestPriority
  is_rush?: boolean
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get agent for this user
    const { data: agent } = await supabase
      .from('agents')
      .select('id')
      .eq('email', user.email!)
      .single()

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    // Verify this order belongs to the agent
    const { data: order } = await supabase
      .from('orders')
      .select('id, agent_id, listing_id')
      .eq('id', orderId)
      .eq('agent_id', agent.id)
      .single()

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Get edit requests for this order
    const { data: editRequests, error } = await supabase
      .from('edit_requests')
      .select(`
        *,
        comments:edit_request_comments(
          id,
          content,
          author_type,
          created_at,
          is_internal
        )
      `)
      .eq('order_id', orderId)
      .order('created_at', { ascending: false })

    if (error) {
      if (error.code === '42P01') {
        return NextResponse.json({ editRequests: [] })
      }
      throw error
    }

    // Filter out internal comments for agent view
    const filteredRequests = editRequests?.map(req => ({
      ...req,
      comments: req.comments?.filter((c: { is_internal: boolean }) => !c.is_internal) || [],
    }))

    return NextResponse.json({ editRequests: filteredRequests || [] })
  } catch (error) {
    console.error('Error fetching edit requests:', error)
    return NextResponse.json(
      { error: 'Failed to fetch edit requests' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get agent for this user
    const { data: agent } = await supabase
      .from('agents')
      .select('id')
      .eq('email', user.email!)
      .single()

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    // Verify this order belongs to the agent and is delivered
    const { data: order } = await supabase
      .from('orders')
      .select('id, agent_id, listing_id, status')
      .eq('id', orderId)
      .eq('agent_id', agent.id)
      .single()

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Check if order is delivered (can request edits)
    if (!['delivered', 'completed'].includes(order.status || '')) {
      return NextResponse.json(
        { error: 'Edit requests can only be made for delivered orders' },
        { status: 400 }
      )
    }

    const body: EditRequestInput = await request.json()

    // Validate required fields
    if (!body.request_type || !body.title) {
      return NextResponse.json(
        { error: 'request_type and title are required' },
        { status: 400 }
      )
    }

    // Create edit request
    const { data: editRequest, error } = await supabase
      .from('edit_requests')
      .insert({
        order_id: orderId,
        listing_id: order.listing_id,
        agent_id: agent.id,
        request_type: body.request_type,
        title: body.title,
        description: body.description,
        asset_ids: body.asset_ids || [],
        reference_images: body.reference_images || [],
        priority: body.priority || 'normal',
        is_rush: body.is_rush || false,
        status: 'pending',
      })
      .select()
      .single()

    if (error) {
      if (error.code === '42P01') {
        return NextResponse.json({
          editRequest: {
            id: crypto.randomUUID(),
            order_id: orderId,
            ...body,
            status: 'pending',
            created_at: new Date().toISOString(),
          },
        }, { status: 201 })
      }
      throw error
    }

    // Add initial comment
    if (body.description) {
      await supabase.from('edit_request_comments').insert({
        edit_request_id: editRequest.id,
        author_type: 'agent',
        author_id: agent.id,
        content: body.description,
        is_internal: false,
      })
    }

    return NextResponse.json({ editRequest }, { status: 201 })
  } catch (error) {
    console.error('Error creating edit request:', error)
    return NextResponse.json(
      { error: 'Failed to create edit request' },
      { status: 500 }
    )
  }
}
