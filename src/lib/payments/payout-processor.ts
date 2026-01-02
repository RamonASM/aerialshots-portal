import { createAdminClient } from '@/lib/supabase/admin'
import { createTransfer, reverseTransfer } from './stripe-connect'
import { apiLogger, formatError } from '@/lib/logger'

const logger = apiLogger.child({ module: 'payout-processor' })

/**
 * Order data needed for payout processing
 */
export interface OrderForPayout {
  id: string
  listing_id: string
  total_cents: number
  payment_status: string
  property_address?: string
}

/**
 * Listing data needed for payout processing
 */
export interface ListingForPayout {
  id: string
  photographer_id: string | null
  agent_id: string
}

/**
 * Staff member data
 */
interface StaffMember {
  id: string
  name: string
  email: string
  role: string
  payout_type: string
  default_payout_percent: number
  stripe_connect_id: string | null
  stripe_payouts_enabled: boolean
  partner_id: string | null
}

/**
 * Partner data
 */
interface Partner {
  id: string
  name: string
  email: string
  default_profit_percent: number
  stripe_connect_id: string | null
  stripe_payouts_enabled: boolean
}

/**
 * Payout settings from database
 */
interface PayoutSettings {
  photographer_default_percent: number
  videographer_default_percent: number
  partner_default_percent: number
  video_editor_pool_percent: number
  qc_pool_percent: number
  operating_pool_percent: number
  auto_payout_enabled: boolean
}

/**
 * Calculated payout splits
 */
interface PayoutSplits {
  photographer: { cents: number; percent: number } | null
  videographer: { cents: number; percent: number } | null
  partner: { cents: number; percent: number } | null
  pools: {
    video_editor: { cents: number; percent: number }
    qc_fund: { cents: number; percent: number }
    operating: { cents: number; percent: number }
  }
}

/**
 * Get payout settings from database
 */
async function getPayoutSettings(): Promise<PayoutSettings> {
  const supabase = createAdminClient()

  const { data } = await supabase
    .from('payout_settings')
    .select('key, value')

  const settings: Record<string, string> = {}
  data?.forEach(row => {
    settings[row.key] = typeof row.value === 'string'
      ? row.value.replace(/"/g, '')
      : String(row.value)
  })

  return {
    photographer_default_percent: parseFloat(settings.photographer_default_percent) || 40,
    videographer_default_percent: parseFloat(settings.videographer_default_percent) || 20,
    partner_default_percent: parseFloat(settings.partner_default_percent) || 25,
    video_editor_pool_percent: parseFloat(settings.video_editor_pool_percent) || 5,
    qc_pool_percent: parseFloat(settings.qc_pool_percent) || 5,
    operating_pool_percent: parseFloat(settings.operating_pool_percent) || 5,
    auto_payout_enabled: settings.auto_payout_enabled !== 'false',
  }
}

/**
 * Get staff member by ID
 */
async function getStaffById(staffId: string): Promise<StaffMember | null> {
  const supabase = createAdminClient()

  const { data } = await supabase
    .from('staff')
    .select('id, name, email, role, payout_type, default_payout_percent, stripe_connect_id, stripe_payouts_enabled, partner_id')
    .eq('id', staffId)
    .single()

  return data as StaffMember | null
}

/**
 * Get partner by ID
 */
async function getPartnerById(partnerId: string): Promise<Partner | null> {
  const supabase = createAdminClient()

  const { data } = await supabase
    .from('partners')
    .select('id, name, email, default_profit_percent, stripe_connect_id, stripe_payouts_enabled')
    .eq('id', partnerId)
    .single()

  return data as Partner | null
}

/**
 * Get videographer for a listing (from assignments)
 */
async function getVideographerForListing(listingId: string): Promise<StaffMember | null> {
  const supabase = createAdminClient()

  // Check if there's a videographer assignment
  // Note: You may need to adjust this based on your assignment table structure
  const { data: assignment } = await supabase
    .from('photographer_assignments')
    .select('photographer_id')
    .eq('listing_id', listingId)
    .single()

  if (!assignment?.photographer_id) return null

  // Check if this staff member has videographer skills
  const staff = await getStaffById(assignment.photographer_id)
  if (staff?.role === 'videographer') {
    return staff
  }

  return null
}

/**
 * Calculate payout splits for a job
 */
function calculateSplits(params: {
  orderTotalCents: number
  photographer: StaffMember | null
  videographer: StaffMember | null
  partner: Partner | null
  settings: PayoutSettings
}): PayoutSplits {
  const { orderTotalCents, photographer, videographer, partner, settings } = params

  let photographerSplit: { cents: number; percent: number } | null = null
  let videographerSplit: { cents: number; percent: number } | null = null
  let partnerSplit: { cents: number; percent: number } | null = null

  // Calculate photographer cut
  if (photographer && photographer.payout_type === '1099') {
    const percent = photographer.default_payout_percent || settings.photographer_default_percent
    photographerSplit = {
      percent,
      cents: Math.round(orderTotalCents * (percent / 100)),
    }
  }

  // Calculate videographer cut (only if different from photographer)
  if (videographer && videographer.id !== photographer?.id && videographer.payout_type === '1099') {
    const percent = videographer.default_payout_percent || settings.videographer_default_percent
    videographerSplit = {
      percent,
      cents: Math.round(orderTotalCents * (percent / 100)),
    }
  }

  // Calculate partner cut
  if (partner) {
    const percent = partner.default_profit_percent || settings.partner_default_percent
    partnerSplit = {
      percent,
      cents: Math.round(orderTotalCents * (percent / 100)),
    }
  }

  // Calculate company pool allocations
  const pools = {
    video_editor: {
      percent: settings.video_editor_pool_percent,
      cents: Math.round(orderTotalCents * (settings.video_editor_pool_percent / 100)),
    },
    qc_fund: {
      percent: settings.qc_pool_percent,
      cents: Math.round(orderTotalCents * (settings.qc_pool_percent / 100)),
    },
    operating: {
      percent: settings.operating_pool_percent,
      cents: Math.round(orderTotalCents * (settings.operating_pool_percent / 100)),
    },
  }

  return {
    photographer: photographerSplit,
    videographer: videographerSplit,
    partner: partnerSplit,
    pools,
  }
}

/**
 * Record a staff payout in the database
 */
async function recordStaffPayout(params: {
  staffId: string
  orderId: string
  listingId: string
  role: string
  orderTotalCents: number
  payoutAmountCents: number
  payoutPercent: number
  stripeTransferId?: string
  stripeDestinationAccount?: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  errorMessage?: string
}): Promise<string | null> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('staff_payouts')
    .insert({
      staff_id: params.staffId,
      order_id: params.orderId,
      listing_id: params.listingId,
      role: params.role,
      order_total_cents: params.orderTotalCents,
      payout_amount_cents: params.payoutAmountCents,
      payout_percent: params.payoutPercent,
      stripe_transfer_id: params.stripeTransferId,
      stripe_destination_account: params.stripeDestinationAccount,
      status: params.status,
      error_message: params.errorMessage,
      processed_at: params.status === 'completed' ? new Date().toISOString() : null,
    })
    .select('id')
    .single()

  if (error) {
    logger.error({ ...formatError(error) }, 'Failed to record staff payout')
    return null
  }

  return data?.id || null
}

/**
 * Record a partner payout in the database
 */
async function recordPartnerPayout(params: {
  partnerId: string
  orderId: string
  listingId: string
  staffId?: string
  orderTotalCents: number
  payoutAmountCents: number
  payoutPercent: number
  stripeTransferId?: string
  stripeDestinationAccount?: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  errorMessage?: string
}): Promise<string | null> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('partner_payouts')
    .insert({
      partner_id: params.partnerId,
      order_id: params.orderId,
      listing_id: params.listingId,
      staff_id: params.staffId,
      order_total_cents: params.orderTotalCents,
      payout_amount_cents: params.payoutAmountCents,
      payout_percent: params.payoutPercent,
      stripe_transfer_id: params.stripeTransferId,
      stripe_destination_account: params.stripeDestinationAccount,
      status: params.status,
      error_message: params.errorMessage,
      processed_at: params.status === 'completed' ? new Date().toISOString() : null,
    })
    .select('id')
    .single()

  if (error) {
    logger.error({ ...formatError(error) }, 'Failed to record partner payout')
    return null
  }

  return data?.id || null
}

/**
 * Allocate funds to company pools
 */
async function allocateToCompanyPools(params: {
  orderId: string
  listingId: string
  pools: PayoutSplits['pools']
}): Promise<void> {
  const supabase = createAdminClient()
  const { orderId, listingId, pools } = params

  const entries = [
    { pool_type: 'video_editor', ...pools.video_editor },
    { pool_type: 'qc_fund', ...pools.qc_fund },
    { pool_type: 'operating', ...pools.operating },
  ].map(entry => ({
    order_id: orderId,
    listing_id: listingId,
    pool_type: entry.pool_type,
    amount_cents: entry.cents,
    percent: entry.percent,
    status: 'available',
  }))

  const { error } = await supabase.from('company_pool').insert(entries)

  if (error) {
    logger.error({ ...formatError(error) }, 'Failed to allocate to company pools')
  }
}

/**
 * Process contractor payout via Stripe Connect
 */
async function processContractorPayout(params: {
  staff: StaffMember
  order: OrderForPayout
  listing: ListingForPayout
  split: { cents: number; percent: number }
}): Promise<boolean> {
  const { staff, order, listing, split } = params

  // Check if Connect is enabled
  if (!staff.stripe_connect_id || !staff.stripe_payouts_enabled) {
    logger.warn({ staffId: staff.id }, 'Staff member not enabled for Stripe payouts')

    // Record as failed payout
    await recordStaffPayout({
      staffId: staff.id,
      orderId: order.id,
      listingId: listing.id,
      role: staff.role,
      orderTotalCents: order.total_cents,
      payoutAmountCents: split.cents,
      payoutPercent: split.percent,
      status: 'failed',
      errorMessage: 'Stripe Connect not enabled',
    })

    return false
  }

  // Create Stripe transfer
  const transferResult = await createTransfer({
    amountCents: split.cents,
    destinationAccountId: staff.stripe_connect_id,
    orderId: order.id,
    staffId: staff.id,
    description: `Payout for job at ${order.property_address || 'property'}`,
  })

  if (!transferResult.success) {
    logger.error({ staffId: staff.id, error: transferResult.error }, 'Failed to create transfer')

    await recordStaffPayout({
      staffId: staff.id,
      orderId: order.id,
      listingId: listing.id,
      role: staff.role,
      orderTotalCents: order.total_cents,
      payoutAmountCents: split.cents,
      payoutPercent: split.percent,
      status: 'failed',
      errorMessage: transferResult.error,
    })

    return false
  }

  // Record successful payout
  await recordStaffPayout({
    staffId: staff.id,
    orderId: order.id,
    listingId: listing.id,
    role: staff.role,
    orderTotalCents: order.total_cents,
    payoutAmountCents: split.cents,
    payoutPercent: split.percent,
    stripeTransferId: transferResult.transferId,
    stripeDestinationAccount: staff.stripe_connect_id,
    status: 'completed',
  })

  logger.info(
    { staffId: staff.id, amount: split.cents, transferId: transferResult.transferId },
    'Staff payout completed'
  )

  return true
}

/**
 * Process partner payout via Stripe Connect
 */
async function processPartnerPayout(params: {
  partner: Partner
  photographer: StaffMember
  order: OrderForPayout
  listing: ListingForPayout
  split: { cents: number; percent: number }
}): Promise<boolean> {
  const { partner, photographer, order, listing, split } = params

  // Check if Connect is enabled
  if (!partner.stripe_connect_id || !partner.stripe_payouts_enabled) {
    logger.warn({ partnerId: partner.id }, 'Partner not enabled for Stripe payouts')

    await recordPartnerPayout({
      partnerId: partner.id,
      orderId: order.id,
      listingId: listing.id,
      staffId: photographer.id,
      orderTotalCents: order.total_cents,
      payoutAmountCents: split.cents,
      payoutPercent: split.percent,
      status: 'failed',
      errorMessage: 'Stripe Connect not enabled',
    })

    return false
  }

  // Create Stripe transfer
  const transferResult = await createTransfer({
    amountCents: split.cents,
    destinationAccountId: partner.stripe_connect_id,
    orderId: order.id,
    partnerId: partner.id,
    description: `Partner cut for job by ${photographer.name} at ${order.property_address || 'property'}`,
  })

  if (!transferResult.success) {
    logger.error({ partnerId: partner.id, error: transferResult.error }, 'Failed to create partner transfer')

    await recordPartnerPayout({
      partnerId: partner.id,
      orderId: order.id,
      listingId: listing.id,
      staffId: photographer.id,
      orderTotalCents: order.total_cents,
      payoutAmountCents: split.cents,
      payoutPercent: split.percent,
      status: 'failed',
      errorMessage: transferResult.error,
    })

    return false
  }

  // Record successful payout
  await recordPartnerPayout({
    partnerId: partner.id,
    orderId: order.id,
    listingId: listing.id,
    staffId: photographer.id,
    orderTotalCents: order.total_cents,
    payoutAmountCents: split.cents,
    payoutPercent: split.percent,
    stripeTransferId: transferResult.transferId,
    stripeDestinationAccount: partner.stripe_connect_id,
    status: 'completed',
  })

  logger.info(
    { partnerId: partner.id, amount: split.cents, transferId: transferResult.transferId },
    'Partner payout completed'
  )

  return true
}

/**
 * Main payout processor - called when QC approves a job
 */
export async function processJobPayouts(
  order: OrderForPayout,
  listing: ListingForPayout
): Promise<{
  success: boolean
  photographerPaid: boolean
  videographerPaid: boolean
  partnerPaid: boolean
  poolsAllocated: boolean
  errors: string[]
}> {
  const errors: string[] = []
  let photographerPaid = false
  let videographerPaid = false
  let partnerPaid = false
  let poolsAllocated = false

  logger.info({ orderId: order.id, listingId: listing.id }, 'Processing job payouts')

  try {
    // Get settings
    const settings = await getPayoutSettings()

    if (!settings.auto_payout_enabled) {
      logger.info('Auto payout disabled, skipping')
      return { success: true, photographerPaid, videographerPaid, partnerPaid, poolsAllocated, errors }
    }

    // Get photographer
    const photographer = listing.photographer_id
      ? await getStaffById(listing.photographer_id)
      : null

    if (!photographer) {
      logger.warn({ listingId: listing.id }, 'No photographer assigned to listing')
      errors.push('No photographer assigned')
    }

    // Get videographer (if different from photographer)
    const videographer = await getVideographerForListing(listing.id)

    // Get partner (photographer's partner)
    const partner = photographer?.partner_id
      ? await getPartnerById(photographer.partner_id)
      : null

    // Calculate splits
    const splits = calculateSplits({
      orderTotalCents: order.total_cents,
      photographer,
      videographer,
      partner,
      settings,
    })

    logger.info({ splits }, 'Calculated payout splits')

    // Process photographer payout
    if (photographer && splits.photographer) {
      photographerPaid = await processContractorPayout({
        staff: photographer,
        order,
        listing,
        split: splits.photographer,
      })
      if (!photographerPaid) {
        errors.push('Failed to process photographer payout')
      }
    }

    // Process videographer payout
    if (videographer && splits.videographer) {
      videographerPaid = await processContractorPayout({
        staff: videographer,
        order,
        listing,
        split: splits.videographer,
      })
      if (!videographerPaid) {
        errors.push('Failed to process videographer payout')
      }
    }

    // Process partner payout
    if (partner && photographer && splits.partner) {
      partnerPaid = await processPartnerPayout({
        partner,
        photographer,
        order,
        listing,
        split: splits.partner,
      })
      if (!partnerPaid) {
        errors.push('Failed to process partner payout')
      }
    }

    // Allocate to company pools
    await allocateToCompanyPools({
      orderId: order.id,
      listingId: listing.id,
      pools: splits.pools,
    })
    poolsAllocated = true

    logger.info(
      { orderId: order.id, photographerPaid, videographerPaid, partnerPaid, poolsAllocated },
      'Job payouts processed'
    )

    return {
      success: errors.length === 0,
      photographerPaid,
      videographerPaid,
      partnerPaid,
      poolsAllocated,
      errors,
    }
  } catch (error) {
    logger.error({ ...formatError(error) }, 'Error processing job payouts')
    errors.push(error instanceof Error ? error.message : 'Unknown error')

    return {
      success: false,
      photographerPaid,
      videographerPaid,
      partnerPaid,
      poolsAllocated,
      errors,
    }
  }
}

/**
 * Reverse payouts for an order (for refunds)
 */
export async function reverseOrderPayouts(
  orderId: string,
  reason: string
): Promise<{ success: boolean; reversedCount: number; errors: string[] }> {
  const supabase = createAdminClient()
  const errors: string[] = []
  let reversedCount = 0

  logger.info({ orderId, reason }, 'Reversing order payouts')

  try {
    // Get staff payouts for this order
    const { data: staffPayouts } = await supabase
      .from('staff_payouts')
      .select('id, stripe_transfer_id, payout_amount_cents')
      .eq('order_id', orderId)
      .eq('status', 'completed')

    // Get partner payouts for this order
    const { data: partnerPayouts } = await supabase
      .from('partner_payouts')
      .select('id, stripe_transfer_id, payout_amount_cents')
      .eq('order_id', orderId)
      .eq('status', 'completed')

    // Reverse staff payouts
    for (const payout of staffPayouts || []) {
      if (payout.stripe_transfer_id) {
        const result = await reverseTransfer({
          transferId: payout.stripe_transfer_id,
          reason,
        })

        if (result.success) {
          await supabase
            .from('staff_payouts')
            .update({
              status: 'reversed',
              reversed_at: new Date().toISOString(),
              reversal_reason: reason,
            })
            .eq('id', payout.id)

          reversedCount++
        } else {
          errors.push(`Failed to reverse staff payout ${payout.id}: ${result.error}`)
        }
      }
    }

    // Reverse partner payouts
    for (const payout of partnerPayouts || []) {
      if (payout.stripe_transfer_id) {
        const result = await reverseTransfer({
          transferId: payout.stripe_transfer_id,
          reason,
        })

        if (result.success) {
          await supabase
            .from('partner_payouts')
            .update({
              status: 'reversed',
              reversed_at: new Date().toISOString(),
              reversal_reason: reason,
            })
            .eq('id', payout.id)

          reversedCount++
        } else {
          errors.push(`Failed to reverse partner payout ${payout.id}: ${result.error}`)
        }
      }
    }

    logger.info({ orderId, reversedCount, errors: errors.length }, 'Payout reversal complete')

    return {
      success: errors.length === 0,
      reversedCount,
      errors,
    }
  } catch (error) {
    logger.error({ orderId, ...formatError(error) }, 'Error reversing payouts')
    errors.push(error instanceof Error ? error.message : 'Unknown error')

    return {
      success: false,
      reversedCount,
      errors,
    }
  }
}

/**
 * Get order by listing ID
 */
export async function getOrderByListingId(listingId: string): Promise<OrderForPayout | null> {
  const supabase = createAdminClient()

  const { data } = await supabase
    .from('orders')
    .select('id, listing_id, total_cents, payment_status, property_address')
    .eq('listing_id', listingId)
    .single()

  return data as OrderForPayout | null
}
