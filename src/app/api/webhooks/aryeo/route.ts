import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAryeoClient } from '@/lib/integrations/aryeo/client'
import {
  transformListing,
  transformMedia,
  transformAgent,
  transformOrderToListingUpdate,
  determineOrderType,
} from '@/lib/integrations/aryeo/transformer'
import type { WebhookPayload, WebhookEventType } from '@/lib/integrations/aryeo/types'

// Verify webhook signature (if using direct webhooks)
function verifyWebhookSignature(
  payload: string,
  signature: string | null,
  secret: string | undefined
): boolean {
  // Security: In production, require webhook secret
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      console.error('ARYEO_WEBHOOK_SECRET not configured in production - rejecting request')
      return false
    }
    console.warn('Webhook secret not configured - development mode only')
    return true
  }

  // Secret is configured, signature MUST be valid
  if (!signature) {
    console.error('Webhook signature missing')
    return false
  }

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex')

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    )
  } catch {
    return false
  }
}

// Process webhook event idempotently
async function processWebhookEvent(
  eventId: string,
  eventType: WebhookEventType,
  payload: WebhookPayload
): Promise<{ success: boolean; message: string }> {
  const supabase = createAdminClient()

  // Check for duplicate event (idempotency)
  const { data: existingEvent } = await supabase
    .from('webhook_events')
    .select('id, status')
    .eq('aryeo_event_id', eventId)
    .single()

  if (existingEvent) {
    if (existingEvent.status === 'success') {
      return { success: true, message: 'Event already processed' }
    }
    // Retry failed events
  }

  // Record the webhook event
  const { error: insertError } = await supabase.from('webhook_events').upsert(
    {
      aryeo_event_id: eventId,
      event_type: eventType,
      payload: JSON.parse(JSON.stringify(payload)),
      status: 'pending',
    },
    { onConflict: 'aryeo_event_id' }
  )

  if (insertError) {
    console.error('Failed to record webhook event:', insertError)
  }

  try {
    // Handle different event types
    switch (eventType) {
      case 'order.created':
        await handleOrderCreated(payload)
        break
      case 'order.fulfilled':
        await handleOrderFulfilled(payload)
        break
      case 'order.paid':
        await handleOrderPaid(payload)
        break
      case 'customer.created':
      case 'customer.updated':
        await handleCustomerUpdate(payload)
        break
      case 'appointment.scheduled':
        await handleAppointmentScheduled(payload)
        break
      case 'appointment.canceled':
      case 'appointment.rescheduled':
        // Handle appointment changes if needed
        break
      default:
        console.log(`Unhandled event type: ${eventType}`)
    }

    // Mark event as successful
    await supabase
      .from('webhook_events')
      .update({ status: 'success', processed_at: new Date().toISOString() })
      .eq('aryeo_event_id', eventId)

    return { success: true, message: `Processed ${eventType}` }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    // Mark event as failed
    await supabase
      .from('webhook_events')
      .update({
        status: 'failed',
        error_message: errorMessage,
        retry_count: (existingEvent?.status === 'failed' ? 1 : 0) + 1,
      })
      .eq('aryeo_event_id', eventId)

    return { success: false, message: errorMessage }
  }
}

// Handle new order created
async function handleOrderCreated(payload: WebhookPayload) {
  const orderId = payload.data.order_id
  if (!orderId) return

  const aryeo = getAryeoClient()
  const supabase = createAdminClient()

  // Fetch full order details from Aryeo
  const order = await aryeo.getOrderWithDetails(orderId)

  // If order has a customer, ensure agent exists
  if (order.customer?.email) {
    const agentData = {
      email: order.customer.email,
      name: order.customer.name ?? 'Unknown Agent',
      slug: order.customer.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '-'),
      phone: order.customer.phone ?? null,
      headshot_url: order.customer.avatar_url ?? null,
      logo_url: order.customer.logo_url ?? null,
      aryeo_customer_id: order.customer.id,
    }

    await supabase.from('agents').upsert(agentData, {
      onConflict: 'email',
      ignoreDuplicates: false,
    })
  }

  // If order has a listing, create/update listing record
  if (order.listing) {
    // Get agent ID
    const { data: agent } = await supabase
      .from('agents')
      .select('id')
      .eq('aryeo_customer_id', order.customer?.id ?? '')
      .single()

    const listingData = transformListing(order.listing, agent?.id)
    listingData.aryeo_order_id = orderId

    const { data: listing, error } = await supabase
      .from('listings')
      .upsert(listingData, { onConflict: 'aryeo_listing_id' })
      .select('id')
      .single()

    if (error) {
      console.error('Failed to upsert listing:', error)
      throw error
    }

    // Add media assets if listing was delivered
    if (order.listing.delivery_status === 'DELIVERED' && listing?.id) {
      const mediaAssets = transformMedia(order.listing, listing.id)
      if (mediaAssets.length > 0) {
        await supabase.from('media_assets').upsert(mediaAssets, {
          onConflict: 'id',
        })
      }
    }
  }
}

// Handle order fulfilled (media delivered)
async function handleOrderFulfilled(payload: WebhookPayload) {
  const orderId = payload.data.order_id
  const listingId = payload.data.listing_id
  if (!orderId) return

  const aryeo = getAryeoClient()
  const supabase = createAdminClient()

  // Fetch full order with listing details
  const order = await aryeo.getOrderWithDetails(orderId)

  if (order.listing) {
    // Update listing status
    const { data: existingListing } = await supabase
      .from('listings')
      .select('id, agent_id')
      .eq('aryeo_listing_id', order.listing.id)
      .single()

    if (existingListing) {
      // Update listing as delivered
      await supabase
        .from('listings')
        .update({
          ops_status: 'delivered',
          delivered_at: new Date().toISOString(),
        })
        .eq('id', existingListing.id)

      // Sync all media assets
      const listingWithMedia = await aryeo.getListingWithMedia(order.listing.id)
      const mediaAssets = transformMedia(listingWithMedia, existingListing.id)

      if (mediaAssets.length > 0) {
        // Delete existing assets and insert new ones
        await supabase
          .from('media_assets')
          .delete()
          .eq('listing_id', existingListing.id)

        await supabase.from('media_assets').insert(mediaAssets)
      }

      // Create care task for post-delivery call
      if (existingListing.agent_id) {
        await supabase.from('care_tasks').insert({
          agent_id: existingListing.agent_id,
          listing_id: existingListing.id,
          task_type: 'care_call',
          status: 'pending',
          priority: 1,
          due_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Next day
        })
      }
    } else {
      // Create listing if it doesn't exist
      await handleOrderCreated(payload)
    }
  }
}

// Handle order paid - check for referral credits
async function handleOrderPaid(payload: WebhookPayload) {
  const orderId = payload.data.order_id
  if (!orderId) return

  const aryeo = getAryeoClient()
  const supabase = createAdminClient()

  const order = await aryeo.getOrderWithDetails(orderId)

  if (!order.customer?.email) return

  // Check if this customer was referred
  const { data: agent } = await supabase
    .from('agents')
    .select('id, referred_by_id')
    .eq('email', order.customer.email)
    .single()

  if (!agent?.referred_by_id) return

  // Check for existing referral
  const { data: referral } = await supabase
    .from('referrals')
    .select('*')
    .eq('referred_email', order.customer.email)
    .eq('status', 'signed_up')
    .single()

  if (!referral) return

  // Determine order type and credits to award
  const orderType = determineOrderType(order)
  if (!orderType) return

  const creditAmounts: Record<string, number> = {
    photo: 100,
    video: 200,
    premium: 300,
  }

  const creditsToAward = creditAmounts[orderType]

  // Update referral status and award credits
  await supabase
    .from('referrals')
    .update({
      status: 'completed',
      order_type: orderType,
      aryeo_order_id: orderId,
      credits_awarded: creditsToAward,
      completed_at: new Date().toISOString(),
    })
    .eq('id', referral.id)

  // Create credit transaction
  await supabase.from('credit_transactions').insert({
    agent_id: referral.referrer_id,
    amount: creditsToAward,
    type: 'referral',
    description: `Referral completed: ${order.customer.email} - ${orderType} package`,
    referral_id: referral.id,
  })

  // The trigger will automatically update the agent's credit_balance
}

// Handle customer created/updated
async function handleCustomerUpdate(payload: WebhookPayload) {
  const customerId = payload.data.customer_id
  if (!customerId) return

  // For now, we sync customers when orders come in
  // This could be expanded to sync customer profile changes
}

// Handle appointment scheduled
async function handleAppointmentScheduled(payload: WebhookPayload) {
  const supabase = createAdminClient()

  // Update listing ops_status if we can link it
  if (payload.data.listing_id) {
    await supabase
      .from('listings')
      .update({
        ops_status: 'scheduled',
        scheduled_at: payload.timestamp,
      })
      .eq('aryeo_listing_id', payload.data.listing_id)
  }
}

// POST handler for webhook
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text()
    const signature = request.headers.get('x-aryeo-signature')
    const webhookSecret = process.env.ARYEO_WEBHOOK_SECRET

    // Verify signature if secret is configured
    if (webhookSecret && !verifyWebhookSignature(rawBody, signature, webhookSecret)) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      )
    }

    const payload: WebhookPayload = JSON.parse(rawBody)

    // Validate required fields
    if (!payload.event_type || !payload.event_id) {
      return NextResponse.json(
        { error: 'Missing event_type or event_id' },
        { status: 400 }
      )
    }

    // Process the event
    const result = await processWebhookEvent(
      payload.event_id,
      payload.event_type,
      payload
    )

    if (result.success) {
      return NextResponse.json({ status: 'ok', message: result.message })
    } else {
      // Return 200 to prevent Zapier retries for handled errors
      // The error is logged in webhook_events for manual review
      return NextResponse.json({
        status: 'error',
        message: result.message,
      })
    }
  } catch (error) {
    console.error('Webhook processing error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET handler for webhook verification (some services ping the URL)
export async function GET() {
  return NextResponse.json({ status: 'ok', service: 'aryeo-webhook' })
}
