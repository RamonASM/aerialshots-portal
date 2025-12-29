import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/payments/stripe'
import { createAdminClient } from '@/lib/supabase/admin'
import Stripe from 'stripe'

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

export async function POST(request: NextRequest) {
  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET is not configured')
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })
  }

  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded': {
      const paymentIntent = event.data.object as Stripe.PaymentIntent
      await handlePaymentSuccess(paymentIntent)
      break
    }

    default:
      // Unhandled event type - credit purchases are verified via API, not webhooks
      console.log(`Unhandled event type: ${event.type}`)
  }

  return NextResponse.json({ received: true })
}

/**
 * Handle successful payment intent - used for order payments
 */
async function handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
  const metadata = paymentIntent.metadata

  // Handle order payment
  if (metadata?.order_id) {
    const supabase = createAdminClient()

    // Update order payment status
    const { error } = await supabase
      .from('orders')
      .update({
        payment_status: 'succeeded',
        paid_at: new Date().toISOString(),
        payment_intent_id: paymentIntent.id,
      })
      .eq('id', metadata.order_id)

    if (error) {
      console.error('Failed to update order payment status:', error)
    } else {
      console.log(`Order ${metadata.order_id} marked as paid`)
    }
  }
}
