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
      apiVersion: '2025-12-15.clover',
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
