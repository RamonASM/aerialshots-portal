import { NextRequest, NextResponse } from 'next/server'
import { getCubicasaClient } from '@/lib/integrations/cubicasa'
import { apiLogger, formatError } from '@/lib/logger'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireStaffAccess } from '@/lib/auth/server-access'

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
    const access = await requireStaffAccess()
    const supabase = createAdminClient()

    // Get listing details
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: listing, error: listingError } = await (supabase as any)
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
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
        created_by: access.email,
      },
      actor_id: access.id,
      actor_type: 'staff',
    })

      apiLogger.info({
        listingId,
        orderId: result.orderId,
        staffEmail: access.email,
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
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
    await requireStaffAccess()
    const supabase = createAdminClient()

    // Get listing with Cubicasa info
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: listing, error: listingError } = await (supabase as any)
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
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase as any)
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
    const access = await requireStaffAccess(['admin'])
    const supabase = createAdminClient()

    // Get listing
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: listing, error: listingError } = await (supabase as any)
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
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
        cancelled_by: access.email,
      },
      actor_id: access.id,
      actor_type: 'staff',
    })

    apiLogger.info({
      listingId,
      orderId: listing.cubicasa_order_id,
      staffEmail: access.email,
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
