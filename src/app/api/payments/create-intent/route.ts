import { NextRequest, NextResponse } from 'next/server'
import { stripe, toCents } from '@/lib/payments/stripe'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { amount, email, name, orderId, metadata = {} } = body

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount' },
        { status: 400 }
      )
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: toCents(amount),
      currency: 'usd',
      automatic_payment_methods: {
        enabled: true,
      },
      receipt_email: email,
      metadata: {
        order_id: orderId || '',
        customer_name: name || '',
        ...metadata,
      },
    })

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    })
  } catch (error) {
    console.error('Payment intent creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create payment intent' },
      { status: 500 }
    )
  }
}
