import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import Stripe from 'stripe'
import { getStripe } from '@/lib/payments/stripe'
import { createClient } from '@/lib/supabase/server'

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
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json(
      { error: 'Webhook signature verification failed' },
      { status: 400 }
    )
  }

  const supabase = await createClient()

  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        console.log('Payment succeeded:', paymentIntent.id)

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
          console.error('Error updating order:', error)
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
        console.log('Payment failed:', paymentIntent.id)

        // Update order status
        const { error } = await supabase
          .from('orders')
          .update({
            payment_status: 'failed',
          })
          .eq('payment_intent_id', paymentIntent.id)

        if (error) {
          console.error('Error updating order:', error)
        }

        break
      }

      case 'payment_intent.canceled': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        console.log('Payment canceled:', paymentIntent.id)

        // Update order status
        const { error } = await supabase
          .from('orders')
          .update({
            payment_status: 'cancelled',
            status: 'cancelled',
          })
          .eq('payment_intent_id', paymentIntent.id)

        if (error) {
          console.error('Error updating order:', error)
        }

        break
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge
        const paymentIntentId = charge.payment_intent as string
        console.log('Charge refunded:', paymentIntentId)

        // Update order status
        const { error } = await supabase
          .from('orders')
          .update({
            payment_status: 'refunded',
            status: 'refunded',
          })
          .eq('payment_intent_id', paymentIntentId)

        if (error) {
          console.error('Error updating order:', error)
        }

        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook handler error:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}
