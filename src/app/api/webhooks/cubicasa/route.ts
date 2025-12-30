import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
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
        console.error('Cubicasa webhook signature missing')
        return NextResponse.json(
          { error: 'Signature required' },
          { status: 401 }
        )
      }
      const isValid = verifySignature(rawBody, signature, webhookSecret)
      if (!isValid) {
        console.error('Invalid Cubicasa webhook signature')
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 }
        )
      }
    } else if (isProduction) {
      // No secret in production - reject request
      console.error('CUBICASA_WEBHOOK_SECRET not configured in production')
      return NextResponse.json(
        { error: 'Webhook secret not configured' },
        { status: 500 }
      )
    }

    const payload: CubicasaWebhookPayload = JSON.parse(rawBody)
    const { event, order_id, data, timestamp } = payload

    console.log(`[Cubicasa Webhook] Received event: ${event} for order: ${order_id}`)

    const supabase = await createClient()

    // Find the listing by Cubicasa order ID
    const { data: listing, error: findError } = await supabase
      .from('listings')
      .select('id, address, cubicasa_status')
      .eq('cubicasa_order_id', order_id)
      .single()

    if (findError || !listing) {
      console.warn(`[Cubicasa Webhook] No listing found for order_id: ${order_id}`)
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
          .single()

        if (existingAsset) {
          // Update existing asset
          await supabase
            .from('media_assets')
            .update({
              media_url: floorPlanUrl,
              qc_status: 'pending',
            })
            .eq('id', existingAsset.id)
        } else {
          // Create new floor plan asset
          await supabase.from('media_assets').insert({
            listing_id: listing.id as string,
            media_url: floorPlanUrl,
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
    const { error: updateError } = await supabase
      .from('listings')
      .update(updateData)
      .eq('id', listing.id)

    if (updateError) {
      console.error('[Cubicasa Webhook] Error updating listing:', updateError)
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

    // TODO: Trigger notification to QC team when delivered
    // if (event === 'delivered') {
    //   await triggerHandoffNotification(listing.id, 'cubicasa_delivered')
    // }

    console.log(`[Cubicasa Webhook] Successfully processed ${event} for listing ${listing.id}`)

    return NextResponse.json({
      success: true,
      listing_id: listing.id,
      event,
      new_status: newStatus,
    })
  } catch (error) {
    console.error('[Cubicasa Webhook] Error processing webhook:', error)
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
