import { createAdminClient } from '@/lib/supabase/admin'

export interface AnytimeBooking {
  id: string
  listing_id: string
  is_anytime: boolean
  anytime_start_date: string
  anytime_end_date: string
  access_instructions?: string
  territory_id?: string
  status: 'pending_claim' | 'claimed' | 'completed' | 'cancelled'
  claimed_by?: string
  claimed_at?: string
  scheduled_date?: string
  priority?: 'normal' | 'high' | 'urgent'
  listing?: {
    address: string
  }
}

export interface CreateAnytimeBookingParams {
  listing_id: string
  start_date: Date
  end_date: Date
  access_instructions: string
  territory_id: string
  priority?: 'normal' | 'high' | 'urgent'
}

export interface CreateAnytimeBookingResult {
  success: boolean
  booking?: AnytimeBooking
  error?: string
}

export interface EligibilityCheck {
  is_vacant: boolean
  has_lockbox: boolean
  access_instructions?: string
}

export interface EligibilityResult {
  eligible: boolean
  reason?: string
}

export interface AnytimeClaimResult {
  success: boolean
  claimed_date?: string
  error?: string
}

export interface DateRangeFilter {
  from?: Date
  to?: Date
}

const MAX_DATE_RANGE_DAYS = 14
const MIN_DATE_RANGE_DAYS = 2

/**
 * Check if a property is eligible for Go Anytime scheduling
 */
export function isAnytimeEligible(booking: EligibilityCheck): EligibilityResult {
  if (!booking.is_vacant) {
    return {
      eligible: false,
      reason: 'Property must be vacant and unoccupied for Go Anytime scheduling.',
    }
  }

  if (!booking.has_lockbox) {
    return {
      eligible: false,
      reason: 'Property must have lockbox access for Go Anytime scheduling.',
    }
  }

  if (!booking.access_instructions || booking.access_instructions.trim() === '') {
    return {
      eligible: false,
      reason: 'Access instructions are required for Go Anytime scheduling.',
    }
  }

  return { eligible: true }
}

/**
 * Create a Go Anytime booking with a date range
 */
export async function createAnytimeBooking(
  params: CreateAnytimeBookingParams
): Promise<CreateAnytimeBookingResult> {
  const { listing_id, start_date, end_date, access_instructions, territory_id, priority } =
    params

  // Validate date range
  const now = new Date()
  now.setHours(0, 0, 0, 0)

  const startDay = new Date(start_date)
  startDay.setHours(0, 0, 0, 0)

  const endDay = new Date(end_date)
  endDay.setHours(0, 0, 0, 0)

  // Start date must be in the future
  if (startDay < now) {
    return {
      success: false,
      error: 'Start date must be in the future.',
    }
  }

  // Calculate range in days
  const rangeDays =
    Math.ceil((endDay.getTime() - startDay.getTime()) / (1000 * 60 * 60 * 24)) + 1

  if (rangeDays < MIN_DATE_RANGE_DAYS) {
    return {
      success: false,
      error: `Date range must be at least ${MIN_DATE_RANGE_DAYS} days.`,
    }
  }

  if (rangeDays > MAX_DATE_RANGE_DAYS) {
    return {
      success: false,
      error: `Date range cannot exceed ${MAX_DATE_RANGE_DAYS} days.`,
    }
  }

  try {
    const supabase = createAdminClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('seller_schedules')
      .insert({
        listing_id,
        is_anytime: true,
        anytime_start_date: startDay.toISOString().split('T')[0],
        anytime_end_date: endDay.toISOString().split('T')[0],
        access_instructions,
        territory_id,
        status: 'pending_claim',
        priority: priority || 'normal',
      })
      .select()
      .single() as { data: AnytimeBooking | null; error: Error | null }

    if (error || !data) {
      return {
        success: false,
        error: 'Failed to create booking.',
      }
    }

    return {
      success: true,
      booking: data,
    }
  } catch (error) {
    console.error('[GoAnytime] Error creating booking:', error)
    return {
      success: false,
      error: 'An unexpected error occurred.',
    }
  }
}

/**
 * Get unclaimed Go Anytime schedules for a territory
 */
export async function getAnytimeSchedules(
  territoryId: string,
  dateFilter?: DateRangeFilter
): Promise<AnytimeBooking[]> {
  try {
    const supabase = createAdminClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase as any)
      .from('seller_schedules')
      .select('*, listing:listings(address)')
      .eq('territory_id', territoryId)
      .eq('is_anytime', true)
      .is('claimed_by', null)
      .gte('anytime_end_date', new Date().toISOString().split('T')[0])

    if (dateFilter?.from) {
      query = query.gte('anytime_start_date', dateFilter.from.toISOString().split('T')[0])
    }

    if (dateFilter?.to) {
      query = query.lte('anytime_end_date', dateFilter.to.toISOString().split('T')[0])
    }

    const { data, error } = await query as {
      data: AnytimeBooking[] | null
      error: Error | null
    }

    if (error || !data) {
      return []
    }

    return data
  } catch (error) {
    console.error('[GoAnytime] Error fetching schedules:', error)
    return []
  }
}

/**
 * Claim a Go Anytime slot for a specific date
 */
export async function claimAnytimeSlot(
  scheduleId: string,
  photographerId: string,
  claimDate: Date
): Promise<AnytimeClaimResult> {
  try {
    const supabase = createAdminClient()

    // First, check if the schedule is available
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: schedule, error: fetchError } = await (supabase as any)
      .from('seller_schedules')
      .select('id, is_anytime, claimed_by, anytime_start_date, anytime_end_date')
      .eq('id', scheduleId)
      .single() as {
        data: {
          id: string
          is_anytime: boolean
          claimed_by: string | null
          anytime_start_date: string
          anytime_end_date: string
        } | null
        error: Error | null
      }

    if (fetchError || !schedule) {
      return {
        success: false,
        error: 'Schedule not found.',
      }
    }

    if (schedule.claimed_by) {
      return {
        success: false,
        error: 'This slot has already been claimed by another photographer.',
      }
    }

    // Validate claim date is within range
    const claimDateStr = claimDate.toISOString().split('T')[0]
    if (claimDateStr < schedule.anytime_start_date || claimDateStr > schedule.anytime_end_date) {
      return {
        success: false,
        error: `Selected date is outside the available range (${schedule.anytime_start_date} - ${schedule.anytime_end_date}).`,
      }
    }

    // Claim the slot
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = await (supabase as any)
      .from('seller_schedules')
      .update({
        claimed_by: photographerId,
        claimed_at: new Date().toISOString(),
        scheduled_date: claimDateStr,
        status: 'claimed',
      })
      .eq('id', scheduleId)

    if (updateError) {
      return {
        success: false,
        error: 'Failed to claim the slot.',
      }
    }

    return {
      success: true,
      claimed_date: claimDateStr,
    }
  } catch (error) {
    console.error('[GoAnytime] Error claiming slot:', error)
    return {
      success: false,
      error: 'An unexpected error occurred.',
    }
  }
}

/**
 * Release a previously claimed Go Anytime slot
 */
export async function releaseAnytimeSlot(
  scheduleId: string,
  photographerId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createAdminClient()

    // Verify the photographer owns this claim
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: schedule, error: fetchError } = await (supabase as any)
      .from('seller_schedules')
      .select('id, claimed_by')
      .eq('id', scheduleId)
      .single() as { data: { id: string; claimed_by: string | null } | null; error: Error | null }

    if (fetchError || !schedule) {
      return {
        success: false,
        error: 'Schedule not found.',
      }
    }

    if (schedule.claimed_by !== photographerId) {
      return {
        success: false,
        error: 'You are not authorized to release this claim.',
      }
    }

    // Release the claim
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = await (supabase as any)
      .from('seller_schedules')
      .update({
        claimed_by: null,
        claimed_at: null,
        scheduled_date: null,
        status: 'pending_claim',
      })
      .eq('id', scheduleId)

    if (updateError) {
      return {
        success: false,
        error: 'Failed to release the claim.',
      }
    }

    return { success: true }
  } catch (error) {
    console.error('[GoAnytime] Error releasing slot:', error)
    return {
      success: false,
      error: 'An unexpected error occurred.',
    }
  }
}

/**
 * Get the photographer's claimed Go Anytime queue
 */
export async function getPhotographerAnytimeQueue(
  photographerId: string
): Promise<AnytimeBooking[]> {
  try {
    const supabase = createAdminClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('seller_schedules')
      .select('*, listing:listings(address)')
      .eq('claimed_by', photographerId)
      .eq('is_anytime', true)
      .order('scheduled_date', { ascending: true }) as {
        data: AnytimeBooking[] | null
        error: Error | null
      }

    if (error || !data) {
      return []
    }

    return data
  } catch (error) {
    console.error('[GoAnytime] Error fetching queue:', error)
    return []
  }
}

/**
 * Check if there are available Go Anytime slots in a territory
 */
export async function hasAvailableAnytimeSlots(territoryId: string): Promise<boolean> {
  const schedules = await getAnytimeSchedules(territoryId)
  return schedules.length > 0
}

/**
 * Get count of unclaimed slots in a territory
 */
export async function getUnclaimedSlotCount(territoryId: string): Promise<number> {
  const schedules = await getAnytimeSchedules(territoryId)
  return schedules.length
}
