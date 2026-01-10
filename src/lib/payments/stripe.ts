import Stripe from 'stripe'

let stripeInstance: Stripe | null = null

/**
 * Server-side Stripe client (lazy loaded)
 * Used for creating payment intents, managing customers, etc.
 */
export function getStripe(): Stripe {
  if (!stripeInstance) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is not set')
    }
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-12-18.acacia',
      typescript: true,
    })
  }
  return stripeInstance
}

// For backwards compatibility, export a getter that returns the client
export const stripe = {
  get paymentIntents() {
    return getStripe().paymentIntents
  },
  get customers() {
    return getStripe().customers
  },
  get webhooks() {
    return getStripe().webhooks
  },
  get checkout() {
    return getStripe().checkout
  },
}

/**
 * Stripe publishable key for client-side
 */
export const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ''

/**
 * Convert dollars to cents for Stripe
 */
export function toCents(dollars: number): number {
  return Math.round(dollars * 100)
}

/**
 * Convert cents to dollars for display
 */
export function toDollars(cents: number): number {
  return cents / 100
}

/**
 * Format amount for Stripe metadata (as string)
 */
export function formatAmountForStripe(amount: number): number {
  return toCents(amount)
}

/**
 * Create a payment intent
 */
export async function createPaymentIntent(params: {
  amount: number // in dollars
  currency?: string
  customer_id?: string
  metadata?: Record<string, string>
  idempotencyKey?: string
}): Promise<{
  success: boolean
  clientSecret?: string
  paymentIntentId?: string
  error?: string
}> {
  try {
    const stripe = getStripe()

    const paymentIntent = await stripe.paymentIntents.create(
      {
        amount: toCents(params.amount),
        currency: params.currency || 'usd',
        customer: params.customer_id,
        metadata: params.metadata,
        automatic_payment_methods: {
          enabled: true,
        },
      },
      params.idempotencyKey ? { idempotencyKey: params.idempotencyKey } : undefined
    )

    return {
      success: true,
      clientSecret: paymentIntent.client_secret || undefined,
      paymentIntentId: paymentIntent.id,
    }
  } catch (error) {
    console.error('[Stripe] Error creating payment intent:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create payment intent',
    }
  }
}
