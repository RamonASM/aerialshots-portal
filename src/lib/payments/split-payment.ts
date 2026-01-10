import Stripe from 'stripe'
import { getStripe } from './stripe'

export interface SplitPaymentPortion {
  amountCents: number
  percentage?: number
  paymentMethodId?: string
  cardBrand?: string
  cardLastFour?: string
}

export interface CreateSplitPaymentInput {
  orderId: string
  totalAmountCents: number
  portions: SplitPaymentPortion[]
  splitType: 'even' | 'custom' | 'percentage'
  customerEmail: string
  customerName: string
  description?: string
}

export interface ProcessPortionInput {
  portionId: string
  splitPaymentId: string
  amountCents: number
  paymentMethodId: string
  customerEmail: string
  customerName: string
  description?: string
}

export interface SplitPaymentResult {
  success: boolean
  paymentIntentId?: string
  clientSecret?: string
  error?: string
}

/**
 * Calculate even split portions
 */
export function calculateEvenSplit(
  totalAmountCents: number,
  numberOfPortions: number
): SplitPaymentPortion[] {
  if (numberOfPortions < 2) {
    throw new Error('Split payment requires at least 2 portions')
  }

  const baseAmount = Math.floor(totalAmountCents / numberOfPortions)
  const remainder = totalAmountCents % numberOfPortions

  const portions: SplitPaymentPortion[] = []
  for (let i = 0; i < numberOfPortions; i++) {
    // Add remainder to the first portion
    const amount = i === 0 ? baseAmount + remainder : baseAmount
    portions.push({
      amountCents: amount,
      percentage: Number(((amount / totalAmountCents) * 100).toFixed(2)),
    })
  }

  return portions
}

/**
 * Calculate percentage-based split portions
 */
export function calculatePercentageSplit(
  totalAmountCents: number,
  percentages: number[]
): SplitPaymentPortion[] {
  const totalPercentage = percentages.reduce((sum, p) => sum + p, 0)
  if (Math.abs(totalPercentage - 100) > 0.01) {
    throw new Error('Percentages must sum to 100%')
  }

  let allocatedCents = 0
  const portions: SplitPaymentPortion[] = percentages.map((percentage, index) => {
    const isLast = index === percentages.length - 1
    const amount = isLast
      ? totalAmountCents - allocatedCents
      : Math.round((totalAmountCents * percentage) / 100)

    allocatedCents += amount

    return {
      amountCents: amount,
      percentage,
    }
  })

  return portions
}

/**
 * Validate custom split amounts
 */
export function validateCustomSplit(
  totalAmountCents: number,
  portions: SplitPaymentPortion[]
): boolean {
  const portionTotal = portions.reduce((sum, p) => sum + p.amountCents, 0)
  return portionTotal === totalAmountCents
}

/**
 * Create a Stripe PaymentIntent for a portion
 */
export async function createPortionPaymentIntent(
  input: ProcessPortionInput
): Promise<SplitPaymentResult> {
  try {
    // Create payment intent
    const paymentIntent = await getStripe().paymentIntents.create({
      amount: input.amountCents,
      currency: 'usd',
      payment_method: input.paymentMethodId,
      confirm: true,
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'never',
      },
      metadata: {
        split_payment_id: input.splitPaymentId,
        portion_id: input.portionId,
      },
      description: input.description || 'Split payment portion',
      receipt_email: input.customerEmail,
    })

    return {
      success: paymentIntent.status === 'succeeded',
      paymentIntentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret || undefined,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Payment processing failed'
    return {
      success: false,
      error: errorMessage,
    }
  }
}

/**
 * Create a SetupIntent for collecting payment method without charging
 */
export async function createSetupIntent(
  customerEmail: string
): Promise<{ clientSecret: string | null; error?: string }> {
  try {
    // Find or create customer
    let customer: Stripe.Customer
    const existingCustomers = await getStripe().customers.list({
      email: customerEmail,
      limit: 1,
    })

    if (existingCustomers.data.length > 0) {
      customer = existingCustomers.data[0]
    } else {
      customer = await getStripe().customers.create({
        email: customerEmail,
      })
    }

    // Create setup intent
    const setupIntent = await getStripe().setupIntents.create({
      customer: customer.id,
      automatic_payment_methods: {
        enabled: true,
      },
    })

    return { clientSecret: setupIntent.client_secret }
  } catch (error) {
    return {
      clientSecret: null,
      error: error instanceof Error ? error.message : 'Failed to create setup intent',
    }
  }
}

/**
 * Get payment method details from Stripe
 */
export async function getPaymentMethodDetails(
  paymentMethodId: string
): Promise<{ brand: string; last4: string } | null> {
  try {
    const paymentMethod = await getStripe().paymentMethods.retrieve(paymentMethodId)

    if (paymentMethod.type === 'card' && paymentMethod.card) {
      return {
        brand: paymentMethod.card.brand,
        last4: paymentMethod.card.last4,
      }
    }

    return null
  } catch {
    return null
  }
}

/**
 * Refund a payment portion
 */
export async function refundPortion(
  paymentIntentId: string,
  amountCents?: number
): Promise<{ success: boolean; refundId?: string; error?: string }> {
  try {
    const refundParams: Stripe.RefundCreateParams = {
      payment_intent: paymentIntentId,
    }

    if (amountCents) {
      refundParams.amount = amountCents
    }

    const refund = await getStripe().refunds.create(refundParams)

    return {
      success: refund.status === 'succeeded',
      refundId: refund.id,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Refund failed',
    }
  }
}

/**
 * Calculate split payment summary
 */
export interface SplitPaymentSummary {
  totalAmountCents: number
  paidAmountCents: number
  remainingAmountCents: number
  portionCount: number
  completedPortions: number
  pendingPortions: number
  isComplete: boolean
}

export function calculateSplitSummary(
  portions: Array<{
    amountCents: number
    status: 'pending' | 'processing' | 'succeeded' | 'failed' | 'refunded'
  }>
): SplitPaymentSummary {
  const totalAmountCents = portions.reduce((sum, p) => sum + p.amountCents, 0)
  const paidAmountCents = portions
    .filter((p) => p.status === 'succeeded')
    .reduce((sum, p) => sum + p.amountCents, 0)

  const completedPortions = portions.filter((p) => p.status === 'succeeded').length
  const pendingPortions = portions.filter((p) => p.status === 'pending').length

  return {
    totalAmountCents,
    paidAmountCents,
    remainingAmountCents: totalAmountCents - paidAmountCents,
    portionCount: portions.length,
    completedPortions,
    pendingPortions,
    isComplete: completedPortions === portions.length,
  }
}

/**
 * Format amount for display
 */
export function formatCentsToDisplayAmount(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100)
}
