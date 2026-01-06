import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireStaffAccess } from '@/lib/auth/server-access'
import { checkRateLimit, getRateLimitHeaders } from '@/lib/utils/rate-limit'
import type { IntegrationStatus, Zillow3DStatus } from '@/lib/supabase/types'

// Rate limit: 30 integration orders per minute (prevent duplicate order spam)
const RATE_LIMIT_CONFIG = { limit: 30, windowSeconds: 60 }

// Valid integration types
const INTEGRATION_TYPES = ['cubicasa', 'zillow_3d'] as const
type IntegrationType = (typeof INTEGRATION_TYPES)[number]

// Valid statuses for each integration
const CUBICASA_STATUSES: IntegrationStatus[] = [
  'pending',
  'ordered',
  'processing',
  'delivered',
  'failed',
  'not_applicable',
]

const ZILLOW_3D_STATUSES: Zillow3DStatus[] = [
  'pending',
  'scheduled',
  'scanned',
  'processing',
  'live',
  'failed',
  'not_applicable',
]

interface UpdateIntegrationBody {
  integration: IntegrationType
  status: string
  external_id?: string | null
  error_message?: string | null
  notes?: string
}

// GET - Fetch integration statuses for a listing
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await requireStaffAccess()
    const supabase = createAdminClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: listing, error } = await (supabase as any)
      .from('listings')
      .select(`
        id,
        address,
        cubicasa_order_id,
        cubicasa_status,
        zillow_3d_id,
        zillow_3d_status,
        integration_error_message,
        last_integration_check,
        ops_status
      `)
      .eq('id', id)
      .single()

    if (error || !listing) {
      return NextResponse.json(
        { error: 'Listing not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      listing_id: listing.id,
      address: listing.address,
      ops_status: listing.ops_status,
      integrations: {
        cubicasa: {
          status: listing.cubicasa_status,
          external_id: listing.cubicasa_order_id,
        },
        zillow_3d: {
          status: listing.zillow_3d_status,
          external_id: listing.zillow_3d_id,
        },
      },
      error_message: listing.integration_error_message,
      last_check: listing.last_integration_check,
    })
  } catch (error) {
    console.error('Error fetching integration status:', error)
    return NextResponse.json(
      { error: 'Failed to fetch integration status' },
      { status: 500 }
    )
  }
}

// PATCH - Update integration status manually
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body: UpdateIntegrationBody = await request.json()
    const { integration, status, external_id, error_message, notes } = body

    await requireStaffAccess()
    const supabase = createAdminClient()

    // Validate integration type
    if (!INTEGRATION_TYPES.includes(integration)) {
      return NextResponse.json(
        { error: `Invalid integration type. Must be one of: ${INTEGRATION_TYPES.join(', ')}` },
        { status: 400 }
      )
    }

    // Validate status for the integration type
    const validStatuses: string[] = integration === 'cubicasa'
      ? CUBICASA_STATUSES
      : ZILLOW_3D_STATUSES

    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status for ${integration}. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      )
    }

    // Build update object based on integration type
    const updateData: Record<string, unknown> = {
      last_integration_check: new Date().toISOString(),
    }

    if (integration === 'cubicasa') {
      updateData.cubicasa_status = status
      if (external_id !== undefined) updateData.cubicasa_order_id = external_id
    } else if (integration === 'zillow_3d') {
      updateData.zillow_3d_status = status
      if (external_id !== undefined) updateData.zillow_3d_id = external_id
    }

    // Update error message if provided (or clear it if status is 'delivered' or 'live')
    if (error_message !== undefined) {
      updateData.integration_error_message = error_message
    } else if (status === 'delivered' || status === 'live') {
      updateData.integration_error_message = null
    }

    // Update the listing
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: updatedListing, error: updateError } = await (supabase as any)
      .from('listings')
      .update(updateData)
      .eq('id', id)
      .select(`
        id,
        cubicasa_status,
        zillow_3d_status,
        integration_error_message
      `)
      .single()

    if (updateError) {
      console.error('Error updating integration status:', updateError)
      return NextResponse.json(
        { error: 'Failed to update integration status' },
        { status: 500 }
      )
    }

    // Log the event
    await supabase.from('job_events').insert({
      listing_id: id,
      event_type: 'integration_status_change',
      new_value: {
        integration,
        status,
        external_id,
        notes,
      },
      actor_type: 'staff',
    })

    return NextResponse.json({
      success: true,
      listing_id: id,
      integration,
      status,
      updated: updatedListing,
    })
  } catch (error) {
    console.error('Error updating integration status:', error)
    return NextResponse.json(
      { error: 'Failed to update integration status' },
      { status: 500 }
    )
  }
}

// POST - Trigger integration order (Cubicasa API call)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { integration } = body

    const access = await requireStaffAccess()
    const supabase = createAdminClient()

    // Rate limiting by staff user ID
    const rateLimitResult = checkRateLimit(`integration-order:${access.id}`, RATE_LIMIT_CONFIG)
    if (!rateLimitResult.allowed) {
      const response = NextResponse.json(
        { error: 'Too many integration order requests. Please wait.' },
        { status: 429 }
      )
      Object.entries(getRateLimitHeaders(rateLimitResult)).forEach(([key, value]) => {
        response.headers.set(key, value)
      })
      return response
    }

    if (!INTEGRATION_TYPES.includes(integration)) {
      return NextResponse.json(
        { error: `Invalid integration type. Must be one of: ${INTEGRATION_TYPES.join(', ')}` },
        { status: 400 }
      )
    }

    // Get listing details
    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .select('id, address, city, state, zip, lat, lng, sqft')
      .eq('id', id)
      .single()

    if (listingError || !listing) {
      return NextResponse.json(
        { error: 'Listing not found' },
        { status: 404 }
      )
    }

    // For now, we'll just update status to 'ordered' since we don't have API credentials yet
    // When we get Cubicasa API credentials, we'll add the actual API call here
    if (integration === 'cubicasa') {
      // TODO: Implement actual Cubicasa API call when credentials are available
      // const cubicasaResponse = await orderCubicasaFloorPlan(listing)

      // For now, just mark as ordered
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: updateError } = await (supabase as any)
        .from('listings')
        .update({
          cubicasa_status: 'ordered',
          last_integration_check: new Date().toISOString(),
        })
        .eq('id', id)

      if (updateError) throw updateError

      // Log the event
      await supabase.from('job_events').insert({
        listing_id: id,
        event_type: 'integration_ordered',
        new_value: {
          integration,
          message: 'Floor plan order initiated (manual)',
        },
        actor_type: 'staff',
      })

      return NextResponse.json({
        success: true,
        message: 'Cubicasa floor plan order initiated',
        listing_id: id,
        integration: 'cubicasa',
        status: 'ordered',
      })
    }

    if (integration === 'zillow_3d') {
      // Zillow 3D doesn't have a direct API
      return NextResponse.json({
        success: false,
        error: 'Zillow 3D does not have a direct API. Update status manually after scheduling the 3D tour.',
        action: 'manual',
      }, { status: 400 })
    }

    return NextResponse.json(
      { error: 'Integration not supported' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Error triggering integration order:', error)
    return NextResponse.json(
      { error: 'Failed to trigger integration order' },
      { status: 500 }
    )
  }
}
