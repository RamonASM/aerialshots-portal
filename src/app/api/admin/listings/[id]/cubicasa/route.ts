import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCubicasaClient } from '@/lib/integrations/cubicasa'
import { apiLogger, formatError } from '@/lib/logger'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * POST /api/admin/listings/[id]/cubicasa
 * Create a Cubicasa floor plan order for a listing
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id: listingId } = await params
    const supabase = await createClient()

    // Verify staff authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user?.email) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Verify staff role
    const { data: staff } = await supabase
      .from('staff')
      .select('id, role')
      .eq('email', user.email)
      .eq('is_active', true)
      .single()

    if (!staff) {
      return NextResponse.json({ error: 'Staff access required' }, { status: 403 })
    }

    // Get listing details
    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .select('id, address, city, state, zip, sqft, beds, cubicasa_order_id, cubicasa_status')
      .eq('id', listingId)
      .single()

    if (listingError || !listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
    }

    // Check if order already exists
    if (listing.cubicasa_order_id && listing.cubicasa_status !== 'failed') {
      return NextResponse.json({
        success: false,
        error: 'Cubicasa order already exists for this listing',
        orderId: listing.cubicasa_order_id,
        status: listing.cubicasa_status,
      }, { status: 409 })
    }

    // Check if Cubicasa is configured
    const cubicasa = getCubicasaClient()
    if (!cubicasa.isConfigured()) {
      return NextResponse.json(
        { error: 'Cubicasa integration not configured' },
        { status: 503 }
      )
    }

    try {
      // Create Cubicasa order
      const result = await cubicasa.createOrderForListing({
        id: listing.id,
        address: listing.address ?? '',
        city: listing.city ?? '',
        state: listing.state ?? '',
        zip: listing.zip ?? '',
        sqft: listing.sqft || undefined,
        beds: listing.beds || undefined,
      })

      // Update listing with Cubicasa order info
      await supabase
        .from('listings')
        .update({
          cubicasa_order_id: result.orderId,
          cubicasa_status: 'pending',
          last_integration_check: new Date().toISOString(),
        })
        .eq('id', listingId)

      // Log job event
      await supabase.from('job_events').insert({
        listing_id: listingId,
        event_type: 'cubicasa_order_created',
        new_value: {
          order_id: result.orderId,
          go_to_scan_url: result.goToScanUrl,
          created_by: user.email,
        },
        actor_id: staff.id,
        actor_type: 'staff',
      })

      apiLogger.info({
        listingId,
        orderId: result.orderId,
        staffEmail: user.email,
      }, 'Cubicasa order created')

      return NextResponse.json({
        success: true,
        message: 'Cubicasa floor plan order created',
        orderId: result.orderId,
        goToScanUrl: result.goToScanUrl,
        status: result.status,
      })
    } catch (cubicasaError) {
      apiLogger.error({
        error: formatError(cubicasaError),
        listingId,
      }, 'Failed to create Cubicasa order')

      // Update listing with error
      await supabase
        .from('listings')
        .update({
          cubicasa_status: 'failed',
          integration_error_message: JSON.stringify(formatError(cubicasaError)),
          last_integration_check: new Date().toISOString(),
        })
        .eq('id', listingId)

      return NextResponse.json(
        { error: 'Failed to create Cubicasa order' },
        { status: 502 }
      )
    }
  } catch (error) {
    apiLogger.error({ error: formatError(error) }, 'Cubicasa order creation error')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * GET /api/admin/listings/[id]/cubicasa
 * Get Cubicasa order status for a listing
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id: listingId } = await params
    const supabase = await createClient()

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user?.email) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Get listing with Cubicasa info
    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .select('id, cubicasa_order_id, cubicasa_status, integration_error_message, last_integration_check')
      .eq('id', listingId)
      .single()

    if (listingError || !listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
    }

    if (!listing.cubicasa_order_id) {
      return NextResponse.json({
        success: true,
        hasOrder: false,
        message: 'No Cubicasa order for this listing',
      })
    }

    // Try to fetch latest status from Cubicasa
    const cubicasa = getCubicasaClient()
    let cubicasaOrder = null

    if (cubicasa.isConfigured()) {
      try {
        cubicasaOrder = await cubicasa.getOrder(listing.cubicasa_order_id)

        // Update local status if different
        // Note: Cubicasa API may return statuses not in IntegrationStatus enum
        if (cubicasaOrder.status !== listing.cubicasa_status) {
          await supabase
            .from('listings')
            .update({
              cubicasa_status: cubicasaOrder.status as 'pending' | 'ordered' | 'processing' | 'delivered' | 'needs_manual' | 'failed' | 'not_applicable',
              last_integration_check: new Date().toISOString(),
            })
            .eq('id', listingId)
        }
      } catch (error) {
        apiLogger.warn({
          error: formatError(error),
          listingId,
          orderId: listing.cubicasa_order_id,
        }, 'Failed to fetch Cubicasa order status')
      }
    }

    return NextResponse.json({
      success: true,
      hasOrder: true,
      orderId: listing.cubicasa_order_id,
      status: cubicasaOrder?.status || listing.cubicasa_status,
      floorPlan2dUrl: cubicasaOrder?.floor_plan_2d_url,
      floorPlan3dUrl: cubicasaOrder?.floor_plan_3d_url,
      measuredSqft: cubicasaOrder?.measured_sqft,
      roomCount: cubicasaOrder?.room_count,
      errorMessage: listing.integration_error_message,
      lastCheck: listing.last_integration_check,
    })
  } catch (error) {
    apiLogger.error({ error: formatError(error) }, 'Cubicasa status error')
    return NextResponse.json({ error: 'Failed to get status' }, { status: 500 })
  }
}

/**
 * DELETE /api/admin/listings/[id]/cubicasa
 * Cancel a Cubicasa order
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id: listingId } = await params
    const supabase = await createClient()

    // Verify staff authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user?.email) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Verify staff role (admin only)
    const { data: staff } = await supabase
      .from('staff')
      .select('id, role')
      .eq('email', user.email)
      .eq('is_active', true)
      .single()

    if (!staff || !['admin', 'owner'].includes(staff.role)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Get listing
    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .select('id, cubicasa_order_id, cubicasa_status')
      .eq('id', listingId)
      .single()

    if (listingError || !listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
    }

    if (!listing.cubicasa_order_id) {
      return NextResponse.json({ error: 'No Cubicasa order to cancel' }, { status: 400 })
    }

    // Cancel in Cubicasa if possible
    const cubicasa = getCubicasaClient()
    if (cubicasa.isConfigured() && ['pending', 'scanning'].includes(listing.cubicasa_status)) {
      await cubicasa.cancelOrder(listing.cubicasa_order_id)
    }

    // Update listing
    await supabase
      .from('listings')
      .update({
        cubicasa_status: 'not_applicable',
        integration_error_message: 'Order cancelled by admin',
        last_integration_check: new Date().toISOString(),
      })
      .eq('id', listingId)

    // Log event
    await supabase.from('job_events').insert({
      listing_id: listingId,
      event_type: 'cubicasa_order_cancelled',
      new_value: {
        order_id: listing.cubicasa_order_id,
        cancelled_by: user.email,
      },
      actor_id: staff.id,
      actor_type: 'staff',
    })

    apiLogger.info({
      listingId,
      orderId: listing.cubicasa_order_id,
      staffEmail: user.email,
    }, 'Cubicasa order cancelled')

    return NextResponse.json({
      success: true,
      message: 'Cubicasa order cancelled',
    })
  } catch (error) {
    apiLogger.error({ error: formatError(error) }, 'Cubicasa cancel error')
    return NextResponse.json({ error: 'Failed to cancel order' }, { status: 500 })
  }
}
