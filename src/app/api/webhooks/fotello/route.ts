import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import crypto from 'crypto'

/**
 * Fotello Webhook Handler (STUB)
 *
 * Fotello API documentation: https://app.fotello.co/api-docs (requires login)
 * Contact: support@fotello.co for enterprise API access
 *
 * This handler is a stub prepared for when Fotello API access is obtained.
 * Expected webhook events (to be confirmed):
 * - processing_started: Photos are being processed
 * - processing_complete: Photos are ready
 * - processing_failed: Processing encountered an error
 * - needs_manual: Manual intervention required
 */

// Placeholder webhook event types (to be confirmed with Fotello)
type FotelloWebhookEvent =
  | 'processing_started'
  | 'processing_complete'
  | 'processing_failed'
  | 'needs_manual'

interface FotelloWebhookPayload {
  event: FotelloWebhookEvent
  job_id: string
  timestamp: string
  data?: {
    photos_processed?: number
    photos_total?: number
    download_url?: string
    error_message?: string
  }
}

// Map Fotello events to our integration statuses
const EVENT_STATUS_MAP: Record<FotelloWebhookEvent, string> = {
  processing_started: 'processing',
  processing_complete: 'delivered',
  processing_failed: 'failed',
  needs_manual: 'needs_manual',
}

/**
 * Verify Fotello webhook signature
 * Signature method TBD - will update when API docs are available
 */
function verifySignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  // Assuming HMAC-SHA256, adjust when API docs are available
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
    const webhookSecret = process.env.FOTELLO_WEBHOOK_SECRET

    // If no webhook secret is configured, Fotello API is not set up yet
    if (!webhookSecret) {
      console.warn('[Fotello Webhook] No webhook secret configured - Fotello API integration pending')
      return NextResponse.json({
        error: 'Fotello webhook not configured',
        message: 'Contact support@fotello.co for API access',
        status: 'pending_setup',
      }, { status: 503 })
    }

    const rawBody = await request.text()
    const signature = request.headers.get('x-fotello-signature') || ''

    // Verify signature
    if (signature) {
      const isValid = verifySignature(rawBody, signature, webhookSecret)
      if (!isValid) {
        console.error('[Fotello Webhook] Invalid signature')
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 }
        )
      }
    }

    const payload: FotelloWebhookPayload = JSON.parse(rawBody)
    const { event, job_id, data, timestamp } = payload

    console.log(`[Fotello Webhook] Received event: ${event} for job: ${job_id}`)

    const supabase = await createClient()

    // Find the listing by Fotello job ID
    const { data: listing, error: findError } = await supabase
      .from('listings')
      .select('id, address, fotello_status')
      .eq('fotello_job_id', job_id)
      .single()

    if (findError || !listing) {
      console.warn(`[Fotello Webhook] No listing found for job_id: ${job_id}`)
      return NextResponse.json({
        acknowledged: true,
        message: 'Job ID not found in our system',
        job_id,
      })
    }

    // Log the webhook event
    await supabase.from('webhook_events').insert({
      aryeo_event_id: `fotello_${job_id}_${Date.now()}`,
      event_type: `fotello.${event}`,
      payload: {
        job_id,
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
      fotello_status: newStatus,
      last_integration_check: new Date().toISOString(),
    }

    // Handle specific events
    if (event === 'processing_complete') {
      updateData.integration_error_message = null
      // TODO: Download processed photos from Fotello and add to media_assets
    }

    if (event === 'processing_failed' || event === 'needs_manual') {
      updateData.integration_error_message = data?.error_message || `Fotello ${event}`
    }

    // Update the listing
    const { error: updateError } = await supabase
      .from('listings')
      .update(updateData)
      .eq('id', listing.id)

    if (updateError) {
      console.error('[Fotello Webhook] Error updating listing:', updateError)
      throw updateError
    }

    // Log job event
    await supabase.from('job_events').insert({
      listing_id: listing.id,
      event_type: 'integration_webhook',
      new_value: {
        integration: 'fotello',
        event,
        job_id,
        status: newStatus,
        photos_processed: data?.photos_processed,
        photos_total: data?.photos_total,
      },
      actor_type: 'system',
    })

    console.log(`[Fotello Webhook] Successfully processed ${event} for listing ${listing.id}`)

    return NextResponse.json({
      success: true,
      listing_id: listing.id,
      event,
      new_status: newStatus,
    })
  } catch (error) {
    console.error('[Fotello Webhook] Error processing webhook:', error)
    return NextResponse.json(
      { error: 'Failed to process webhook' },
      { status: 500 }
    )
  }
}

// GET endpoint for status and setup instructions
export async function GET() {
  const isConfigured = !!process.env.FOTELLO_WEBHOOK_SECRET

  return NextResponse.json({
    service: 'Fotello Webhook Handler',
    status: isConfigured ? 'active' : 'pending_setup',
    configured: isConfigured,
    setup_instructions: isConfigured ? null : {
      step1: 'Contact support@fotello.co for enterprise API access',
      step2: 'Obtain webhook secret from Fotello dashboard',
      step3: 'Set FOTELLO_WEBHOOK_SECRET environment variable',
      step4: 'Configure webhook URL in Fotello: POST /api/webhooks/fotello',
    },
  })
}
