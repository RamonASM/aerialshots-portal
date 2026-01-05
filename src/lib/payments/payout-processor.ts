import { createAdminClient } from '@/lib/supabase/admin'
import { createTransfer, reverseTransfer } from './stripe-connect'
import { apiLogger, formatError } from '@/lib/logger'
import { createHash } from 'crypto'

const logger = apiLogger.child({ module: 'payout-processor' })

/**
 * Type definitions for RPC functions
 * These will be properly typed once the migration is applied
 */
type AcquirePayoutLockResult = {
  acquired: boolean
  existing_status: string
}

type CompleteJobPayoutsResult = {
  success: boolean
  message: string
}

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
 * Transfer record for tracking successful Stripe transfers
 */
interface TransferRecord {
  transferId: string
  type: 'staff' | 'partner'
  staffId?: string
  partnerId?: string
  role?: string
}

/**
 * Generate deterministic idempotency key for a payout operation
 */
function generateIdempotencyKey(orderId: string, listingId: string): string {
  return createHash('sha256')
    .update(`payout:${orderId}:${listingId}`)
    .digest('hex')
    .substring(0, 32)
}

/**
 * Generate deterministic Stripe idempotency key for a transfer
 */
function generateStripeIdempotencyKey(
  orderId: string,
  entityId: string,
  role: string
): string {
  return `transfer:${orderId}:${entityId}:${role}`
}

/**
 * Compensate failed payouts by reversing successful Stripe transfers
 */
async function compensateFailedPayouts(
  successfulTransfers: TransferRecord[]
): Promise<void> {
  logger.warn(
    { transferCount: successfulTransfers.length },
    'Compensating failed payouts by reversing successful transfers'
  )

  for (const transfer of successfulTransfers) {
    try {
      const result = await reverseTransfer({
        transferId: transfer.transferId,
        reason: 'Payout transaction failed - automatic reversal',
      })

      if (result.success) {
        logger.info(
          { transferId: transfer.transferId, reversalId: result.reversalId },
          'Transfer reversed successfully'
        )
      } else {
        logger.error(
          { transferId: transfer.transferId, error: result.error },
          'Failed to reverse transfer - manual intervention required'
        )
      }
    } catch (error) {
      logger.error(
        { transferId: transfer.transferId, ...formatError(error) },
        'Error reversing transfer - manual intervention required'
      )
    }
  }
}

/**
 * Get payout settings from database
 */
async function getPayoutSettings(): Promise<PayoutSettings> {
  const supabase = createAdminClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from('payout_settings')
    .select('key, value') as { data: Array<{ key: string; value: string | unknown }> | null }

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: assignment } = await (supabase as any)
    .from('photographer_assignments')
    .select('photographer_id')
    .eq('listing_id', listingId)
    .single() as { data: { photographer_id: string } | null }

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
 * Process contractor payout via Stripe Connect
 * Returns transfer record if successful, null if failed
 */
async function processContractorPayout(params: {
  staff: StaffMember
  order: OrderForPayout
  listing: ListingForPayout
  split: { cents: number; percent: number }
}): Promise<{
  success: boolean
  transfer?: TransferRecord
  payoutData?: Record<string, unknown>
  error?: string
}> {
  const { staff, order, listing, split } = params

  // Check if Connect is enabled
  if (!staff.stripe_connect_id || !staff.stripe_payouts_enabled) {
    const error = 'Stripe Connect not enabled'
    logger.warn({ staffId: staff.id }, error)

    return {
      success: false,
      error,
      payoutData: {
        staff_id: staff.id,
        order_id: order.id,
        listing_id: listing.id,
        role: staff.role,
        order_total_cents: order.total_cents,
        payout_amount_cents: split.cents,
        payout_percent: split.percent,
        status: 'failed',
        error_message: error,
      },
    }
  }

  // Generate deterministic idempotency key for Stripe
  const stripeIdempotencyKey = generateStripeIdempotencyKey(
    order.id,
    staff.id,
    staff.role
  )

  // Create Stripe transfer
  const transferResult = await createTransfer({
    amountCents: split.cents,
    destinationAccountId: staff.stripe_connect_id,
    orderId: order.id,
    staffId: staff.id,
    description: `Payout for job at ${order.property_address || 'property'}`,
    idempotencyKey: stripeIdempotencyKey,
  })

  if (!transferResult.success) {
    logger.error({ staffId: staff.id, error: transferResult.error }, 'Failed to create transfer')

    return {
      success: false,
      error: transferResult.error,
      payoutData: {
        staff_id: staff.id,
        order_id: order.id,
        listing_id: listing.id,
        role: staff.role,
        order_total_cents: order.total_cents,
        payout_amount_cents: split.cents,
        payout_percent: split.percent,
        status: 'failed',
        error_message: transferResult.error,
      },
    }
  }

  logger.info(
    { staffId: staff.id, amount: split.cents, transferId: transferResult.transferId },
    'Staff payout transfer created'
  )

  return {
    success: true,
    transfer: {
      transferId: transferResult.transferId!,
      type: 'staff',
      staffId: staff.id,
      role: staff.role,
    },
    payoutData: {
      staff_id: staff.id,
      order_id: order.id,
      listing_id: listing.id,
      role: staff.role,
      order_total_cents: order.total_cents,
      payout_amount_cents: split.cents,
      payout_percent: split.percent,
      stripe_transfer_id: transferResult.transferId,
      stripe_destination_account: staff.stripe_connect_id,
      status: 'completed',
      processed_at: new Date().toISOString(),
    },
  }
}

/**
 * Process partner payout via Stripe Connect
 * Returns transfer record if successful, null if failed
 */
async function processPartnerPayout(params: {
  partner: Partner
  photographer: StaffMember
  order: OrderForPayout
  listing: ListingForPayout
  split: { cents: number; percent: number }
}): Promise<{
  success: boolean
  transfer?: TransferRecord
  payoutData?: Record<string, unknown>
  error?: string
}> {
  const { partner, photographer, order, listing, split } = params

  // Check if Connect is enabled
  if (!partner.stripe_connect_id || !partner.stripe_payouts_enabled) {
    const error = 'Stripe Connect not enabled'
    logger.warn({ partnerId: partner.id }, error)

    return {
      success: false,
      error,
      payoutData: {
        partner_id: partner.id,
        order_id: order.id,
        listing_id: listing.id,
        staff_id: photographer.id,
        order_total_cents: order.total_cents,
        payout_amount_cents: split.cents,
        payout_percent: split.percent,
        status: 'failed',
        error_message: error,
      },
    }
  }

  // Generate deterministic idempotency key for Stripe
  const stripeIdempotencyKey = generateStripeIdempotencyKey(
    order.id,
    partner.id,
    'partner'
  )

  // Create Stripe transfer
  const transferResult = await createTransfer({
    amountCents: split.cents,
    destinationAccountId: partner.stripe_connect_id,
    orderId: order.id,
    partnerId: partner.id,
    description: `Partner cut for job by ${photographer.name} at ${order.property_address || 'property'}`,
    idempotencyKey: stripeIdempotencyKey,
  })

  if (!transferResult.success) {
    logger.error({ partnerId: partner.id, error: transferResult.error }, 'Failed to create partner transfer')

    return {
      success: false,
      error: transferResult.error,
      payoutData: {
        partner_id: partner.id,
        order_id: order.id,
        listing_id: listing.id,
        staff_id: photographer.id,
        order_total_cents: order.total_cents,
        payout_amount_cents: split.cents,
        payout_percent: split.percent,
        status: 'failed',
        error_message: transferResult.error,
      },
    }
  }

  logger.info(
    { partnerId: partner.id, amount: split.cents, transferId: transferResult.transferId },
    'Partner payout transfer created'
  )

  return {
    success: true,
    transfer: {
      transferId: transferResult.transferId!,
      type: 'partner',
      partnerId: partner.id,
    },
    payoutData: {
      partner_id: partner.id,
      order_id: order.id,
      listing_id: listing.id,
      staff_id: photographer.id,
      order_total_cents: order.total_cents,
      payout_amount_cents: split.cents,
      payout_percent: split.percent,
      stripe_transfer_id: transferResult.transferId,
      stripe_destination_account: partner.stripe_connect_id,
      status: 'completed',
      processed_at: new Date().toISOString(),
    },
  }
}

/**
 * Main payout processor - called when QC approves a job
 * Uses atomic transaction processing with idempotency and compensation
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
    const supabase = createAdminClient()

    // 1. Generate idempotency key
    const idempotencyKey = generateIdempotencyKey(order.id, listing.id)

    // 2. Acquire payout lock
    const { data: lockResult } = await supabase.rpc('acquire_payout_lock' as never, {
      p_idempotency_key: idempotencyKey,
      p_order_id: order.id,
    } as never) as { data: AcquirePayoutLockResult[] | null }

    const lockData = lockResult?.[0]
    if (!lockData?.acquired) {
      const existingStatus = lockData?.existing_status || 'unknown'
      logger.info(
        { orderId: order.id, existingStatus },
        'Payout already processed or in progress'
      )
      return {
        success: existingStatus === 'completed',
        photographerPaid: existingStatus === 'completed',
        videographerPaid: existingStatus === 'completed',
        partnerPaid: existingStatus === 'completed',
        poolsAllocated: existingStatus === 'completed',
        errors: existingStatus === 'failed' ? ['Previous payout attempt failed'] : [],
      }
    }

    // 3. Get settings
    const settings = await getPayoutSettings()

    if (!settings.auto_payout_enabled) {
      logger.info('Auto payout disabled, skipping')

      // Update idempotency record to completed
      await supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from('payout_idempotency' as any)
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('idempotency_key', idempotencyKey)

      return { success: true, photographerPaid, videographerPaid, partnerPaid, poolsAllocated, errors }
    }

    // 4. Get photographer
    const photographer = listing.photographer_id
      ? await getStaffById(listing.photographer_id)
      : null

    if (!photographer) {
      logger.warn({ listingId: listing.id }, 'No photographer assigned to listing')
      errors.push('No photographer assigned')

      // Update idempotency to failed
      await supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from('payout_idempotency' as any)
        .update({
          status: 'failed',
          error: 'No photographer assigned',
          completed_at: new Date().toISOString(),
        })
        .eq('idempotency_key', idempotencyKey)

      return { success: false, photographerPaid, videographerPaid, partnerPaid, poolsAllocated, errors }
    }

    // 5. Get videographer (if different from photographer)
    const videographer = await getVideographerForListing(listing.id)

    // 6. Get partner (photographer's partner)
    const partner = photographer?.partner_id
      ? await getPartnerById(photographer.partner_id)
      : null

    // 7. Calculate splits
    const splits = calculateSplits({
      orderTotalCents: order.total_cents,
      photographer,
      videographer,
      partner,
      settings,
    })

    logger.info({ splits }, 'Calculated payout splits')

    // 8. Process all Stripe transfers, collecting results
    const successfulTransfers: TransferRecord[] = []
    const staffPayouts: Record<string, unknown>[] = []
    const partnerPayouts: Record<string, unknown>[] = []

    // Process photographer payout
    if (photographer && splits.photographer) {
      const result = await processContractorPayout({
        staff: photographer,
        order,
        listing,
        split: splits.photographer,
      })

      if (result.success && result.transfer && result.payoutData) {
        photographerPaid = true
        successfulTransfers.push(result.transfer)
        staffPayouts.push(result.payoutData)
      } else {
        errors.push(`Photographer payout failed: ${result.error}`)
      }
    }

    // Process videographer payout
    if (videographer && splits.videographer) {
      const result = await processContractorPayout({
        staff: videographer,
        order,
        listing,
        split: splits.videographer,
      })

      if (result.success && result.transfer && result.payoutData) {
        videographerPaid = true
        successfulTransfers.push(result.transfer)
        staffPayouts.push(result.payoutData)
      } else {
        errors.push(`Videographer payout failed: ${result.error}`)
      }
    }

    // Process partner payout
    if (partner && photographer && splits.partner) {
      const result = await processPartnerPayout({
        partner,
        photographer,
        order,
        listing,
        split: splits.partner,
      })

      if (result.success && result.transfer && result.payoutData) {
        partnerPaid = true
        successfulTransfers.push(result.transfer)
        partnerPayouts.push(result.payoutData)
      } else {
        errors.push(`Partner payout failed: ${result.error}`)
      }
    }

    // 9. If any transfer failed, compensate successful ones
    if (errors.length > 0) {
      logger.error({ errors }, 'Some payouts failed, initiating compensation')

      await compensateFailedPayouts(successfulTransfers)

      // Update idempotency to failed
      await supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from('payout_idempotency' as any)
        .update({
          status: 'failed',
          error: errors.join('; '),
          completed_at: new Date().toISOString(),
        })
        .eq('idempotency_key', idempotencyKey)

      return {
        success: false,
        photographerPaid: false,
        videographerPaid: false,
        partnerPaid: false,
        poolsAllocated: false,
        errors,
      }
    }

    // 10. Prepare company pool data
    const companyPoolData = [
      {
        order_id: order.id,
        listing_id: listing.id,
        pool_type: 'video_editor',
        amount_cents: splits.pools.video_editor.cents,
        percent: splits.pools.video_editor.percent,
        status: 'available',
      },
      {
        order_id: order.id,
        listing_id: listing.id,
        pool_type: 'qc_fund',
        amount_cents: splits.pools.qc_fund.cents,
        percent: splits.pools.qc_fund.percent,
        status: 'available',
      },
      {
        order_id: order.id,
        listing_id: listing.id,
        pool_type: 'operating',
        amount_cents: splits.pools.operating.cents,
        percent: splits.pools.operating.percent,
        status: 'available',
      },
    ]

    // 11. Commit all records atomically via RPC
    const { data: commitResult } = await supabase.rpc('complete_job_payouts' as never, {
      p_idempotency_key: idempotencyKey,
      p_order_id: order.id,
      p_staff_payouts: staffPayouts.length > 0 ? staffPayouts : null,
      p_partner_payouts: partnerPayouts.length > 0 ? partnerPayouts : null,
      p_company_pool: companyPoolData,
    } as never) as { data: CompleteJobPayoutsResult[] | null }

    const commit = commitResult?.[0]
    if (!commit?.success) {
      logger.error({ message: commit?.message }, 'Failed to commit payouts to database')

      // Compensate Stripe transfers
      await compensateFailedPayouts(successfulTransfers)

      errors.push(`Database commit failed: ${commit?.message}`)
      return {
        success: false,
        photographerPaid: false,
        videographerPaid: false,
        partnerPaid: false,
        poolsAllocated: false,
        errors,
      }
    }

    poolsAllocated = true

    logger.info(
      {
        orderId: order.id,
        photographerPaid,
        videographerPaid,
        partnerPaid,
        poolsAllocated,
        transferCount: successfulTransfers.length,
      },
      'Job payouts processed successfully'
    )

    return {
      success: true,
      photographerPaid,
      videographerPaid,
      partnerPaid,
      poolsAllocated,
      errors: [],
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: staffPayouts } = await (supabase as any)
      .from('staff_payouts')
      .select('id, stripe_transfer_id, payout_amount_cents')
      .eq('order_id', orderId)
      .eq('status', 'completed') as { data: Array<{ id: string; stripe_transfer_id: string | null; payout_amount_cents: number }> | null }

    // Get partner payouts for this order
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: partnerPayouts } = await (supabase as any)
      .from('partner_payouts')
      .select('id, stripe_transfer_id, payout_amount_cents')
      .eq('order_id', orderId)
      .eq('status', 'completed') as { data: Array<{ id: string; stripe_transfer_id: string | null; payout_amount_cents: number }> | null }

    // Reverse staff payouts
    for (const payout of staffPayouts || []) {
      if (payout.stripe_transfer_id) {
        const result = await reverseTransfer({
          transferId: payout.stripe_transfer_id,
          reason,
        })

        if (result.success) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase as any)
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
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase as any)
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
