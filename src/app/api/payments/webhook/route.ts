import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import Stripe from 'stripe'
import { getStripe } from '@/lib/payments/stripe'
import { createClient } from '@/lib/supabase/server'
import { apiLogger, formatError } from '@/lib/logger'

const logger = apiLogger.child({ route: 'payments/webhook' })

/**
 * Check if a Stripe event has already been processed (idempotency check)
 * Returns true if already processed, false if new
 * Uses aryeo_event_id column with 'stripe:' prefix for Stripe events
 */
async function isEventProcessed(
  supabase: Awaited<ReturnType<typeof createClient>>,
  eventId: string
): Promise<boolean> {
  const { data } = await supabase
    .from('webhook_events')
    .select('id')
    .eq('aryeo_event_id', `stripe:${eventId}`)
    .eq('status', 'success')
    .single()

  return !!data
}

/**
 * Record a webhook event for idempotency tracking
 * Uses 'stripe:' prefix to distinguish from Aryeo events
 */
async function recordWebhookEvent(
  supabase: Awaited<ReturnType<typeof createClient>>,
  event: Stripe.Event,
  status: 'processing' | 'success' | 'failed',
  error?: string
) {
  // Map our status to the table's valid statuses
  const dbStatus = status === 'processing' ? 'processing' : status === 'success' ? 'success' : 'failed'

  const { error: dbError } = await supabase.from('webhook_events').upsert(
    {
      aryeo_event_id: `stripe:${event.id}`,
      event_type: `stripe.${event.type}`,
      payload: JSON.parse(JSON.stringify(event.data.object)),
      status: dbStatus,
      error_message: error,
      processed_at: status === 'success' ? new Date().toISOString() : null,
    },
    {
      onConflict: 'aryeo_event_id',
    }
  )

  if (dbError) {
    logger.error({ ...formatError(dbError) }, 'Error recording webhook event')
  }
}

export async function POST(request: NextRequest) {
  const body = await request.text()
  const headersList = await headers()
  const signature = headersList.get('stripe-signature')

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    )
  }

  let event: Stripe.Event

  try {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
    if (!webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET is not set')
    }
    event = getStripe().webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    logger.error({ ...formatError(err) }, 'Webhook signature verification failed')
    return NextResponse.json(
      { error: 'Webhook signature verification failed' },
      { status: 400 }
    )
  }

  const supabase = await createClient()

  // Idempotency check: Skip if already processed
  if (await isEventProcessed(supabase, event.id)) {
    logger.debug({ eventId: event.id }, 'Stripe webhook already processed, skipping')
    return NextResponse.json({ received: true, skipped: true })
  }

  // Mark as processing
  await recordWebhookEvent(supabase, event, 'processing')

  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        logger.info({ paymentIntentId: paymentIntent.id }, 'Payment succeeded')

        // Update order status
        const { error } = await supabase
          .from('orders')
          .update({
            payment_status: 'succeeded',
            status: 'paid',
            paid_at: new Date().toISOString(),
          })
          .eq('payment_intent_id', paymentIntent.id)

        if (error) {
          logger.error({ paymentIntentId: paymentIntent.id, ...formatError(error) }, 'Error updating order')
        }

        // Add to status history
        const { data: order } = await supabase
          .from('orders')
          .select('id')
          .eq('payment_intent_id', paymentIntent.id)
          .single()

        if (order) {
          await supabase.from('order_status_history').insert({
            order_id: order.id,
            previous_status: 'pending',
            new_status: 'paid',
            changed_by_type: 'stripe',
            notes: `Payment ${paymentIntent.id} succeeded`,
          })
        }

        break
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        logger.warn({ paymentIntentId: paymentIntent.id }, 'Payment failed')

        // Update order status
        const { error } = await supabase
          .from('orders')
          .update({
            payment_status: 'failed',
          })
          .eq('payment_intent_id', paymentIntent.id)

        if (error) {
          logger.error({ paymentIntentId: paymentIntent.id, ...formatError(error) }, 'Error updating order')
        }

        break
      }

      case 'payment_intent.canceled': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        logger.info({ paymentIntentId: paymentIntent.id }, 'Payment canceled')

        // Update order status
        const { error } = await supabase
          .from('orders')
          .update({
            payment_status: 'cancelled',
            status: 'cancelled',
          })
          .eq('payment_intent_id', paymentIntent.id)

        if (error) {
          logger.error({ paymentIntentId: paymentIntent.id, ...formatError(error) }, 'Error updating order')
        }

        break
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge
        const paymentIntentId = charge.payment_intent as string
        logger.info({ paymentIntentId }, 'Charge refunded')

        // Update order status
        const { error } = await supabase
          .from('orders')
          .update({
            payment_status: 'refunded',
            status: 'refunded',
          })
          .eq('payment_intent_id', paymentIntentId)

        if (error) {
          logger.error({ paymentIntentId, ...formatError(error) }, 'Error updating order')
        }

        break
      }

      default:
        logger.debug({ eventType: event.type }, 'Unhandled event type')
    }

    // Mark event as successfully processed
    await recordWebhookEvent(supabase, event, 'success')

    return NextResponse.json({ received: true })
  } catch (error) {
    logger.error({ ...formatError(error) }, 'Webhook handler error')

    // Mark event as failed
    await recordWebhookEvent(
      supabase,
      event,
      'failed',
      error instanceof Error ? error.message : 'Unknown error'
    )

    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}
