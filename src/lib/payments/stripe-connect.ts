import Stripe from 'stripe'
import { getStripe } from './stripe'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Stripe Connect account types
 */
export type ConnectAccountType = 'staff' | 'partner'

export type ConnectAccountStatus =
  | 'not_started'
  | 'pending'
  | 'active'
  | 'rejected'
  | 'restricted'

export interface ConnectAccountInfo {
  accountId: string
  chargesEnabled: boolean
  payoutsEnabled: boolean
  detailsSubmitted: boolean
  requirements: {
    currentlyDue: string[]
    eventuallyDue: string[]
    pastDue: string[]
    pendingVerification: string[]
  }
  status: ConnectAccountStatus
}

export interface CreateAccountResult {
  success: boolean
  accountId?: string
  onboardingUrl?: string
  error?: string
}

export interface TransferResult {
  success: boolean
  transferId?: string
  error?: string
}

/**
 * App URL for redirects
 */
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.aerialshots.media'

/**
 * Create a Stripe Connect Express account for a staff member or partner
 */
export async function createConnectAccount(params: {
  type: ConnectAccountType
  entityId: string  // staff.id or partner.id
  email: string
  name: string
  businessType?: 'individual' | 'company'
}): Promise<CreateAccountResult> {
  const { type, entityId, email, name, businessType = 'individual' } = params

  try {
    const stripe = getStripe()

    console.log('[Stripe Connect] Creating account for:', { email, name, businessType })

    // Create Express connected account
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'US',
      email,
      capabilities: {
        transfers: { requested: true },
      },
      business_type: businessType,
      business_profile: {
        name: name,
        product_description: 'Real estate photography and media services',
      },
      metadata: {
        entity_type: type,
        entity_id: entityId,
      },
    })

    console.log('[Stripe Connect] Account created:', account.id)

    // Build URLs for onboarding
    const refreshUrl = `${APP_URL}/api/connect/refresh?type=${type}&id=${entityId}`
    const returnUrl = `${APP_URL}/api/connect/return?type=${type}&id=${entityId}`

    console.log('[Stripe Connect] Creating account link with URLs:', { refreshUrl, returnUrl })

    // Generate onboarding link
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: 'account_onboarding',
    })

    // Update database with new account ID
    const supabase = createAdminClient()
    const table = type === 'staff' ? 'staff' : 'partners'

    await supabase
      .from(table)
      .update({
        stripe_connect_id: account.id,
        stripe_connect_status: 'pending',
      })
      .eq('id', entityId)

    return {
      success: true,
      accountId: account.id,
      onboardingUrl: accountLink.url,
    }
  } catch (error) {
    console.error('[Stripe Connect] Error creating account:', error)
    console.error('[Stripe Connect] APP_URL used:', APP_URL)
    console.error('[Stripe Connect] Params:', { type, entityId, email, name, businessType })

    // Extract more detailed error info from Stripe errors
    const stripeError = error as { type?: string; code?: string; message?: string; param?: string }
    const errorMessage = stripeError.message || 'Failed to create Connect account'
    const errorDetails = stripeError.param ? ` (param: ${stripeError.param})` : ''

    return {
      success: false,
      error: errorMessage + errorDetails,
    }
  }
}

/**
 * Generate a new onboarding link for an existing Connect account
 */
export async function generateOnboardingLink(params: {
  type: ConnectAccountType
  entityId: string
  accountId: string
}): Promise<{ success: boolean; onboardingUrl?: string; error?: string }> {
  const { type, entityId, accountId } = params

  try {
    const stripe = getStripe()

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${APP_URL}/api/connect/refresh?type=${type}&id=${entityId}`,
      return_url: `${APP_URL}/api/connect/return?type=${type}&id=${entityId}`,
      type: 'account_onboarding',
    })

    return {
      success: true,
      onboardingUrl: accountLink.url,
    }
  } catch (error) {
    console.error('[Stripe Connect] Error generating onboarding link:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate onboarding link',
    }
  }
}

/**
 * Get the status of a Connect account
 */
export async function getAccountStatus(accountId: string): Promise<ConnectAccountInfo | null> {
  try {
    const stripe = getStripe()
    const account = await stripe.accounts.retrieve(accountId)

    // Determine status based on account state
    let status: ConnectAccountStatus = 'pending'

    if (account.charges_enabled && account.payouts_enabled) {
      status = 'active'
    } else if (account.requirements?.disabled_reason) {
      if (account.requirements.disabled_reason.includes('rejected')) {
        status = 'rejected'
      } else {
        status = 'restricted'
      }
    } else if (account.details_submitted) {
      status = 'pending'
    } else {
      status = 'not_started'
    }

    return {
      accountId: account.id,
      chargesEnabled: account.charges_enabled ?? false,
      payoutsEnabled: account.payouts_enabled ?? false,
      detailsSubmitted: account.details_submitted ?? false,
      requirements: {
        currentlyDue: account.requirements?.currently_due || [],
        eventuallyDue: account.requirements?.eventually_due || [],
        pastDue: account.requirements?.past_due || [],
        pendingVerification: account.requirements?.pending_verification || [],
      },
      status,
    }
  } catch (error) {
    console.error('[Stripe Connect] Error getting account status:', error)
    return null
  }
}

/**
 * Sync Connect account status from Stripe to database
 */
export async function syncAccountStatus(params: {
  type: ConnectAccountType
  entityId: string
  accountId: string
}): Promise<boolean> {
  const { type, entityId, accountId } = params

  try {
    const accountInfo = await getAccountStatus(accountId)
    if (!accountInfo) return false

    const supabase = createAdminClient()
    const table = type === 'staff' ? 'staff' : 'partners'

    const updateData: Record<string, unknown> = {
      stripe_connect_status: accountInfo.status,
      stripe_payouts_enabled: accountInfo.payoutsEnabled,
    }

    // Mark onboarding as complete if details are submitted
    if (accountInfo.detailsSubmitted && accountInfo.status === 'active') {
      updateData.stripe_onboarding_completed_at = new Date().toISOString()
    }

    await supabase
      .from(table)
      .update(updateData)
      .eq('id', entityId)

    return true
  } catch (error) {
    console.error('[Stripe Connect] Error syncing account status:', error)
    return false
  }
}

/**
 * Create a transfer to a connected account
 */
export async function createTransfer(params: {
  amountCents: number
  destinationAccountId: string
  orderId: string
  staffId?: string
  partnerId?: string
  description?: string
  idempotencyKey?: string
}): Promise<TransferResult> {
  const {
    amountCents,
    destinationAccountId,
    orderId,
    staffId,
    partnerId,
    description,
    idempotencyKey,
  } = params

  try {
    const stripe = getStripe()

    // Generate idempotency key if not provided
    const key = idempotencyKey || `transfer_${orderId}_${destinationAccountId}_${Date.now()}`

    const transfer = await stripe.transfers.create(
      {
        amount: amountCents,
        currency: 'usd',
        destination: destinationAccountId,
        description: description || `Payout for order ${orderId}`,
        metadata: {
          order_id: orderId,
          staff_id: staffId || '',
          partner_id: partnerId || '',
        },
      },
      { idempotencyKey: key }
    )

    return {
      success: true,
      transferId: transfer.id,
    }
  } catch (error) {
    console.error('[Stripe Connect] Error creating transfer:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create transfer',
    }
  }
}

/**
 * Reverse a transfer (for refunds)
 */
export async function reverseTransfer(params: {
  transferId: string
  amountCents?: number  // Partial reversal if specified
  reason?: string
}): Promise<{ success: boolean; reversalId?: string; error?: string }> {
  const { transferId, amountCents, reason } = params

  try {
    const stripe = getStripe()

    const reversal = await stripe.transfers.createReversal(transferId, {
      amount: amountCents,
      description: reason || 'Refund reversal',
    })

    return {
      success: true,
      reversalId: reversal.id,
    }
  } catch (error) {
    console.error('[Stripe Connect] Error reversing transfer:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to reverse transfer',
    }
  }
}

/**
 * Get account balance (for checking available funds)
 */
export async function getAccountBalance(): Promise<{
  available: number
  pending: number
} | null> {
  try {
    const stripe = getStripe()
    const balance = await stripe.balance.retrieve()

    const usdAvailable = balance.available.find(b => b.currency === 'usd')
    const usdPending = balance.pending.find(b => b.currency === 'usd')

    return {
      available: usdAvailable?.amount || 0,
      pending: usdPending?.amount || 0,
    }
  } catch (error) {
    console.error('[Stripe Connect] Error getting balance:', error)
    return null
  }
}

/**
 * Get transfers for an order
 */
export async function getTransfersForOrder(orderId: string): Promise<Stripe.Transfer[]> {
  try {
    const stripe = getStripe()

    const transfers = await stripe.transfers.list({
      limit: 100,
    })

    // Filter by order_id in metadata
    return transfers.data.filter(t => t.metadata?.order_id === orderId)
  } catch (error) {
    console.error('[Stripe Connect] Error getting transfers:', error)
    return []
  }
}

/**
 * Create a login link for a connected account (Express dashboard)
 */
export async function createLoginLink(accountId: string): Promise<string | null> {
  try {
    const stripe = getStripe()
    const loginLink = await stripe.accounts.createLoginLink(accountId)
    return loginLink.url
  } catch (error) {
    console.error('[Stripe Connect] Error creating login link:', error)
    return null
  }
}

/**
 * Verify a Connect webhook signature
 */
export function verifyConnectWebhook(
  payload: string,
  signature: string
): Stripe.Event | null {
  try {
    const webhookSecret = process.env.STRIPE_CONNECT_WEBHOOK_SECRET
    if (!webhookSecret) {
      console.error('[Stripe Connect] STRIPE_CONNECT_WEBHOOK_SECRET not set')
      return null
    }

    const stripe = getStripe()
    return stripe.webhooks.constructEvent(payload, signature, webhookSecret)
  } catch (error) {
    console.error('[Stripe Connect] Webhook verification failed:', error)
    return null
  }
}
