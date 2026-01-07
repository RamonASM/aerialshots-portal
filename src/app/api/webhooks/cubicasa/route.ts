import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { webhookLogger, formatError } from '@/lib/logger'
import crypto from 'crypto'

/**
 * Cubicasa Webhook Handler
 *
 * Cubicasa sends webhook notifications for the following events:
 * - delivered: Floor plan has been delivered
 * - deleted: Order was cancelled/deleted
 * - model_modified: Floor plan was updated
 *
 * Documentation: https://app.cubi.casa/api/integrate/v3
 */

// Webhook event types from Cubicasa
type CubicasaWebhookEvent = 'delivered' | 'deleted' | 'model_modified'

interface CubicasaWebhookPayload {
  event: CubicasaWebhookEvent
  order_id: string
  project_id?: string
  timestamp: string
  data?: {
    floor_plan_url?: string
    floor_plan_2d_url?: string
    floor_plan_3d_url?: string
    square_footage?: number
    room_count?: number
    model_version?: number
  }
}

// Map Cubicasa events to our integration statuses
const EVENT_STATUS_MAP: Record<CubicasaWebhookEvent, string> = {
  delivered: 'delivered',
  deleted: 'not_applicable', // Treat deleted as cancelled
  model_modified: 'delivered', // Still delivered, just updated
}

/**
 * Verify Cubicasa webhook signature
 * Cubicasa uses HMAC-SHA256 for webhook verification
 */
function verifySignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex')

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  )
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text()
    const signature = request.headers.get('x-cubicasa-signature') || ''
    const webhookSecret = process.env.CUBICASA_WEBHOOK_SECRET
    const isProduction = process.env.NODE_ENV === 'production'

    // SECURITY: Verify webhook signature
    if (webhookSecret) {
      // Secret is configured - require valid signature
      if (!signature) {
        webhookLogger.error({ source: 'cubicasa' }, 'Webhook signature missing')
        return NextResponse.json(
          { error: 'Signature required' },
          { status: 401 }
        )
      }
      const isValid = verifySignature(rawBody, signature, webhookSecret)
      if (!isValid) {
        webhookLogger.error({ source: 'cubicasa' }, 'Invalid webhook signature')
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 }
        )
      }
    } else if (isProduction) {
      // No secret in production - reject request
      webhookLogger.error({ source: 'cubicasa' }, 'CUBICASA_WEBHOOK_SECRET not configured in production')
      return NextResponse.json(
        { error: 'Webhook secret not configured' },
        { status: 500 }
      )
    }

    const payload: CubicasaWebhookPayload = JSON.parse(rawBody)
    const { event, order_id, data, timestamp } = payload

    webhookLogger.info({ source: 'cubicasa', event, orderId: order_id }, 'Received Cubicasa webhook')

    const supabase = createAdminClient()

    // Find the listing by Cubicasa order ID
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: listing, error: findError } = await (supabase as any)
      .from('listings')
      .select('id, address, cubicasa_status')
      .eq('cubicasa_order_id', order_id)
      .maybeSingle() as { data: { id: string; address: string; cubicasa_status: string | null } | null; error: Error | null }

    if (findError || !listing) {
      webhookLogger.warn({ source: 'cubicasa', orderId: order_id }, 'No listing found for Cubicasa order')
      // Still return 200 to acknowledge receipt
      return NextResponse.json({
        acknowledged: true,
        message: 'Order ID not found in our system',
        order_id,
      })
    }

    // Log the webhook event
    await supabase.from('webhook_events').insert({
      aryeo_event_id: `cubicasa_${order_id}_${Date.now()}`,
      event_type: `cubicasa.${event}`,
      payload: {
        order_id,
        event,
        timestamp,
        data,
        listing_id: listing.id,
      },
      status: 'pending',
    })

    // Determine new status
    const newStatus = EVENT_STATUS_MAP[event] || 'processing'

    // Build update object
    const updateData: Record<string, unknown> = {
      cubicasa_status: newStatus,
      last_integration_check: new Date().toISOString(),
    }

    // If floor plan was delivered, store the URLs in the listing or media_assets
    if (event === 'delivered' && data) {
      // Clear any error message
      updateData.integration_error_message = null

      // If we have floor plan URLs, add them as media assets
      const floorPlanUrl = data.floor_plan_2d_url || data.floor_plan_url
      if (floorPlanUrl) {
        // Check if floor plan asset already exists
        const { data: existingAsset } = await supabase
          .from('media_assets')
          .select('id')
          .eq('listing_id', listing.id)
          .eq('category', 'floor_plan')
          .maybeSingle()

        if (existingAsset) {
          // Update existing asset
          await supabase
            .from('media_assets')
            .update({
              aryeo_url: floorPlanUrl,
              qc_status: 'pending',
            })
            .eq('id', existingAsset.id)
        } else {
          // Create new floor plan asset
          await supabase.from('media_assets').insert({
            listing_id: listing.id as string,
            aryeo_url: floorPlanUrl,
            type: 'floorplan',
            category: 'floor_plan',
            qc_status: 'pending',
          })
        }
      }

      // If we have square footage, update the listing
      if (data.square_footage) {
        updateData.sqft = data.square_footage
      }
    }

    // If order was deleted, mark as not applicable
    if (event === 'deleted') {
      updateData.integration_error_message = 'Cubicasa order was cancelled'
    }

    // Update the listing
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = await (supabase as any)
      .from('listings')
      .update(updateData)
      .eq('id', listing.id) as { error: Error | null }

    if (updateError) {
      webhookLogger.error({ source: 'cubicasa', listingId: listing.id, ...formatError(updateError) }, 'Error updating listing')
      throw updateError
    }

    // Log job event
    await supabase.from('job_events').insert({
      listing_id: listing.id,
      event_type: 'integration_webhook',
      new_value: {
        integration: 'cubicasa',
        event,
        order_id,
        status: newStatus,
        floor_plan_delivered: event === 'delivered',
        square_footage: data?.square_footage,
      },
      actor_type: 'system',
    })

    // Mark webhook as processed
    await supabase
      .from('webhook_events')
      .update({
        status: 'processed',
        processed_at: new Date().toISOString(),
      })
      .eq('aryeo_event_id', `cubicasa_${order_id}_${Date.now()}`)

    // Notify QC team when floor plan is delivered
    if (event === 'delivered') {
      // Log a job event that can be picked up by notification system
      const { error: eventError } = await supabase.from('job_events').insert({
        listing_id: listing.id,
        event_type: 'qc_handoff',
        new_value: {
          source: 'cubicasa',
          message: `Floor plan delivered for ${listing.address}`,
          requires_review: true,
        },
        actor_type: 'system',
      })
      if (eventError) {
        webhookLogger.error({ source: 'cubicasa', listingId: listing.id, ...formatError(eventError) }, 'Failed to create QC handoff event')
      }
    }

    webhookLogger.info({ source: 'cubicasa', event, listingId: listing.id, status: newStatus }, 'Successfully processed Cubicasa webhook')

    return NextResponse.json({
      success: true,
      listing_id: listing.id,
      event,
      new_status: newStatus,
    })
  } catch (error) {
    webhookLogger.error({ source: 'cubicasa', ...formatError(error) }, 'Error processing Cubicasa webhook')
    return NextResponse.json(
      { error: 'Failed to process webhook' },
      { status: 500 }
    )
  }
}

// GET endpoint for webhook verification (some services require this)
export async function GET(request: NextRequest) {
  const challenge = request.nextUrl.searchParams.get('challenge')

  if (challenge) {
    // Return the challenge for webhook verification
    return NextResponse.json({ challenge })
  }

  return NextResponse.json({
    service: 'Cubicasa Webhook Handler',
    status: 'active',
    documentation: 'https://app.cubi.casa/api/integrate/v3',
  })
}
