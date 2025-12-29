import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { stripe, toCents } from '@/lib/payments/stripe'
import { z } from 'zod'

// Zod schema for payment intent request
const PaymentIntentSchema = z.object({
  amount: z.number().positive('Amount must be positive').max(50000, 'Amount exceeds maximum allowed'),
  email: z.string().email('Invalid email format').optional(),
  name: z.string().max(200).optional(),
  orderId: z.string().uuid().optional(),
  idempotencyKey: z.string().max(255).optional(),
  metadata: z.record(z.string(), z.string()).optional().default({}),
})

/**
 * Generate idempotency key for Stripe payment intents
 * Prevents duplicate payments from retry requests
 */
function generateIdempotencyKey(userId: string, orderId?: string, amount?: number): string {
  if (orderId) {
    // Use order ID for deterministic key
    return `pi_${orderId}`
  }
  // Fallback: hash of user + amount + timestamp (hour granularity)
  const hourTimestamp = Math.floor(Date.now() / 3600000)
  const data = `${userId}-${amount}-${hourTimestamp}`
  return `pi_${crypto.createHash('sha256').update(data).digest('hex').slice(0, 24)}`
}

export async function POST(request: NextRequest) {
  try {
    // SECURITY: Require authentication for payment intent creation
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Parse and validate request body with Zod
    const rawBody = await request.json()
    const parseResult = PaymentIntentSchema.safeParse(rawBody)

    if (!parseResult.success) {
      const errors = parseResult.error.issues.map((e) => e.message).join(', ')
      return NextResponse.json({ error: errors }, { status: 400 })
    }

    const { amount, email, name, orderId, idempotencyKey: providedKey, metadata } = parseResult.data

    // Generate idempotency key to prevent duplicate payments
    const idempotencyKey = providedKey || generateIdempotencyKey(user.id, orderId, amount)

    // Create payment intent with user tracking and idempotency
    const paymentIntent = await stripe.paymentIntents.create(
      {
        amount: toCents(amount),
        currency: 'usd',
        automatic_payment_methods: {
          enabled: true,
        },
        receipt_email: email,
        metadata: {
          order_id: orderId || '',
          customer_name: name || '',
          user_id: user.id,
          user_email: user.email || '',
          ...metadata,
        },
      },
      {
        idempotencyKey,
      }
    )

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
