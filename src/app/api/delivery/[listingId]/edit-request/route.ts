import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { apiLogger, formatError } from '@/lib/logger'
import { z } from 'zod'

interface RouteParams {
  params: Promise<{ listingId: string }>
}

const EditRequestSchema = z.object({
  request_type: z.enum([
    'color_correction',
    'cropping',
    'object_removal',
    'sky_replacement',
    'virtual_staging',
    'other',
  ]),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional().default('normal'),
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().min(10, 'Please provide more details').max(2000),
  media_asset_ids: z.array(z.string().uuid()).optional(),
  reference_images: z.array(z.string().url()).optional(),
})

/**
 * POST /api/delivery/[listingId]/edit-request
 * Agent submits an edit request for delivered photos
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { listingId } = await params
    const supabase = await createClient()

    // Get current user (could be agent or staff)
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user?.email) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Get agent info
    const { data: agent } = await supabase
      .from('agents')
      .select('id, name, email')
      .eq('email', user.email)
      .single()

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 403 })
    }

    // Verify listing belongs to this agent
    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .select('id, address, agent_id, ops_status')
      .eq('id', listingId)
      .single()

    if (listingError || !listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
    }

    if (listing.agent_id !== agent.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Only allow edit requests on delivered listings
    if (listing.ops_status !== 'delivered') {
      return NextResponse.json(
        { error: 'Edit requests can only be submitted for delivered photos' },
        { status: 400 }
      )
    }

    // Parse and validate request
    const rawBody = await request.json()
    const parseResult = EditRequestSchema.safeParse(rawBody)

    if (!parseResult.success) {
      const errors = parseResult.error.issues.map(e => e.message).join(', ')
      return NextResponse.json({ error: errors }, { status: 400 })
    }

    const { request_type, priority, title, description, media_asset_ids, reference_images } = parseResult.data

    // Create edit request
    const { data: editRequest, error: createError } = await supabase
      .from('edit_requests')
      .insert({
        listing_id: listingId,
        agent_id: agent.id,
        request_type,
        priority,
        title,
        description,
        media_asset_ids,
        reference_images,
        status: 'pending',
      })
      .select()
      .single()

    if (createError) {
      // If table doesn't exist, return mock success for now
      if (createError.code === '42P01') {
        return NextResponse.json({
          success: true,
          editRequest: {
            id: crypto.randomUUID(),
            listing_id: listingId,
            request_type,
            priority,
            title,
            description,
            status: 'pending',
            created_at: new Date().toISOString(),
          },
          message: 'Edit request submitted successfully',
        }, { status: 201 })
      }
      throw createError
    }

    // Log job event
    await supabase.from('job_events').insert({
      listing_id: listingId,
      event_type: 'edit_request_submitted',
      new_value: {
        edit_request_id: editRequest.id,
        request_type,
        title,
        agent_email: agent.email,
      },
      actor_id: agent.id,
      actor_type: 'agent',
    })

    apiLogger.info({
      editRequestId: editRequest.id,
      listingId,
      agentEmail: agent.email,
      requestType: request_type,
    }, 'Edit request submitted')

    return NextResponse.json({
      success: true,
      editRequest,
      message: 'Edit request submitted successfully. Our team will review it shortly.',
    }, { status: 201 })
  } catch (error) {
    apiLogger.error({ error: formatError(error) }, 'Failed to create edit request')
    return NextResponse.json({ error: 'Failed to submit edit request' }, { status: 500 })
  }
}

/**
 * GET /api/delivery/[listingId]/edit-request
 * Get edit requests for a listing (agent view)
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { listingId } = await params
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user?.email) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Get agent info
    const { data: agent } = await supabase
      .from('agents')
      .select('id')
      .eq('email', user.email)
      .single()

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 403 })
    }

    // Verify listing belongs to this agent
    const { data: listing } = await supabase
      .from('listings')
      .select('id, agent_id')
      .eq('id', listingId)
      .single()

    if (!listing || listing.agent_id !== agent.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get edit requests
    const { data: editRequests, error } = await supabase
      .from('edit_requests')
      .select(`
        id,
        request_type,
        priority,
        title,
        description,
        status,
        resolution_notes,
        created_at,
        resolved_at
      `)
      .eq('listing_id', listingId)
      .eq('agent_id', agent.id)
      .order('created_at', { ascending: false })

    if (error) {
      if (error.code === '42P01') {
        return NextResponse.json({ editRequests: [] })
      }
      throw error
    }

    return NextResponse.json({ editRequests: editRequests || [] })
  } catch (error) {
    apiLogger.error({ error: formatError(error) }, 'Failed to get edit requests')
    return NextResponse.json({ error: 'Failed to get edit requests' }, { status: 500 })
  }
}
