import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import crypto from 'crypto'

/**
 * Zillow 3D Home Tour Webhook Handler
 *
 * Note: Zillow does not provide a direct API for 3D tours.
 * Tours are typically created via:
 * 1. Zillow 3D Home app (mobile scanning)
 * 2. Partner integrations
 * 3. MLS virtual tour field
 *
 * This handler is designed for:
 * 1. Manual status updates from admin UI
 * 2. Future Zillow API integration if available
 * 3. Partner webhook forwarding
 *
 * Supported events:
 * - scheduled: 3D tour scan has been scheduled
 * - in_progress: Scan is being processed
 * - completed: Tour is live on Zillow
 * - failed: Processing failed
 */

type Zillow3DWebhookEvent =
  | 'scheduled'
  | 'in_progress'
  | 'completed'
  | 'failed'
  | 'cancelled'

interface Zillow3DWebhookPayload {
  event: Zillow3DWebhookEvent
  listing_id?: string
  mls_id?: string
  tour_id?: string
  timestamp: string
  data?: {
    tour_url?: string
    embed_url?: string
    thumbnail_url?: string
    error_message?: string
    scan_date?: string
  }
}

// Map events to our integration statuses
const EVENT_STATUS_MAP: Record<Zillow3DWebhookEvent, string> = {
  scheduled: 'scheduled',
  in_progress: 'processing',
  completed: 'live',
  failed: 'failed',
  cancelled: 'not_applicable',
}

/**
 * Verify webhook signature
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
    const signature = request.headers.get('x-zillow-signature') || ''
    const webhookSecret = process.env.ZILLOW_3D_WEBHOOK_SECRET

    // Verify signature if secret is configured
    if (webhookSecret && signature) {
      const isValid = verifySignature(rawBody, signature, webhookSecret)
      if (!isValid) {
        console.error('[Zillow 3D Webhook] Invalid signature')
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 }
        )
      }
    }

    const payload: Zillow3DWebhookPayload = JSON.parse(rawBody)
    const { event, listing_id, mls_id, tour_id, data, timestamp } = payload

    console.log(`[Zillow 3D Webhook] Received event: ${event} for listing: ${listing_id || mls_id}`)

    const supabase = await createClient()
    const adminSupabase = createAdminClient()

    // Find the listing by our ID or MLS ID
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (adminSupabase as any).from('listings').select('id, address, zillow_3d_status')

    if (listing_id) {
      query = query.eq('id', listing_id)
    } else if (mls_id) {
      query = query.eq('mls_id', mls_id)
    } else {
      return NextResponse.json({
        error: 'listing_id or mls_id is required',
      }, { status: 400 })
    }

    const { data: listing, error: findError } = await query.single() as { data: { id: string; address: string; zillow_3d_status: string | null } | null; error: Error | null }

    if (findError || !listing) {
      console.warn(`[Zillow 3D Webhook] No listing found for: ${listing_id || mls_id}`)
      return NextResponse.json({
        acknowledged: true,
        message: 'Listing not found in our system',
        listing_id: listing_id || mls_id,
      })
    }

    // Log the webhook event
    await adminSupabase.from('webhook_events').insert({
      aryeo_event_id: `zillow3d_${tour_id || listing.id}_${Date.now()}`,
      event_type: `zillow_3d.${event}`,
      payload: {
        listing_id: listing.id,
        event,
        tour_id,
        timestamp,
        data,
      },
      status: 'pending',
    })

    // Determine new status
    const newStatus = EVENT_STATUS_MAP[event] || 'processing'

    // Build update object
    const updateData: Record<string, unknown> = {
      zillow_3d_status: newStatus,
      last_integration_check: new Date().toISOString(),
    }

    // Store tour ID if provided
    if (tour_id) {
      updateData.zillow_3d_id = tour_id
    }

    // Handle completed event
    if (event === 'completed' && data) {
      updateData.integration_error_message = null

      // If we have a tour URL, add it as a media asset
      if (data.tour_url) {
        const { data: existingAsset } = await adminSupabase
          .from('media_assets')
          .select('id')
          .eq('listing_id', listing.id)
          .eq('category', '3d_tour')
          .single()

        if (existingAsset) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (adminSupabase as any)
            .from('media_assets')
            .update({
              aryeo_url: data.tour_url,
              qc_status: 'approved', // Auto-approve Zillow tours
            })
            .eq('id', existingAsset.id)
        } else {
          await adminSupabase.from('media_assets').insert({
            listing_id: listing.id,
            aryeo_url: data.tour_url,
            type: 'virtual_tour',
            category: '3d_tour',
            qc_status: 'approved',
          })
        }
      }
    }

    // Handle failed event
    if (event === 'failed') {
      updateData.integration_error_message = data?.error_message || 'Zillow 3D tour processing failed'
    }

    // Update the listing
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = await (adminSupabase as any)
      .from('listings')
      .update(updateData)
      .eq('id', listing.id) as { error: Error | null }

    if (updateError) {
      console.error('[Zillow 3D Webhook] Error updating listing:', updateError)
      throw updateError
    }

    // Log job event
    await adminSupabase.from('job_events').insert({
      listing_id: listing.id,
      event_type: 'integration_webhook',
      new_value: {
        integration: 'zillow_3d',
        event,
        tour_id,
        status: newStatus,
        tour_url: data?.tour_url,
      },
      actor_type: 'system',
    })

    console.log(`[Zillow 3D Webhook] Successfully processed ${event} for listing ${listing.id}`)

    return NextResponse.json({
      success: true,
      listing_id: listing.id,
      event,
      new_status: newStatus,
    })
  } catch (error) {
    console.error('[Zillow 3D Webhook] Error processing webhook:', error)
    return NextResponse.json(
      { error: 'Failed to process webhook' },
      { status: 500 }
    )
  }
}

// GET endpoint for status
export async function GET() {
  const isConfigured = !!process.env.ZILLOW_3D_WEBHOOK_SECRET

  return NextResponse.json({
    service: 'Zillow 3D Home Tour Webhook Handler',
    status: isConfigured ? 'active' : 'manual_only',
    configured: isConfigured,
    note: 'Zillow does not provide a public webhook API. Tours are typically managed via MLS virtual tour fields or partner integrations.',
    setup_instructions: {
      step1: 'Use Zillow 3D Home app to capture tours',
      step2: 'Tours appear on Zillow within 24-48 hours',
      step3: 'Update listing status manually or via integration webhook',
    },
  })
}
