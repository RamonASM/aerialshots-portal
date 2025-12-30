import { createAdminClient } from '@/lib/supabase/admin'

export interface CutoffConfig {
  cutoff_hour: number // Hour of day (0-23) when bookings close for next day
  cutoff_minute: number // Minute of hour
  minimum_lead_hours: number // Minimum hours notice required
  block_same_day: boolean // Whether to block same-day bookings
  block_weekends: boolean // Whether weekends are blocked
}

export interface BookingAllowedResult {
  allowed: boolean
  reason?: string
  earliest_available?: Date
}

const DEFAULT_CONFIG: CutoffConfig = {
  cutoff_hour: 18, // 6 PM
  cutoff_minute: 0,
  minimum_lead_hours: 12,
  block_same_day: true,
  block_weekends: false, // Can book on weekends, just can't book FOR next day after cutoff
}

/**
 * Get cutoff configuration from database or return defaults
 */
export async function getCutoffConfig(): Promise<CutoffConfig> {
  try {
    const supabase = createAdminClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from('business_settings')
      .select('setting_value')
      .eq('setting_key', 'booking_cutoff')
      .single() as { data: { setting_value: Partial<CutoffConfig> } | null }

    if (data?.setting_value) {
      return {
        ...DEFAULT_CONFIG,
        ...data.setting_value,
      }
    }
  } catch {
    // Use defaults
  }

  return DEFAULT_CONFIG
}

/**
 * Get the cutoff time for booking a specific date
 * This is the time on the PREVIOUS day when bookings close
 */
export async function getCutoffTime(bookingDate: Date): Promise<Date> {
  const config = await getCutoffConfig()

  // Cutoff is the day before the booking date
  const cutoff = new Date(bookingDate)
  cutoff.setDate(cutoff.getDate() - 1)
  cutoff.setHours(config.cutoff_hour, config.cutoff_minute, 0, 0)

  return cutoff
}

/**
 * Check if a booking is allowed for a specific date
 */
export async function isBookingAllowed(
  bookingDate: Date,
  currentTime?: Date
): Promise<BookingAllowedResult> {
  const config = await getCutoffConfig()
  const now = currentTime || new Date()

  // Normalize dates for comparison
  const bookingDay = new Date(bookingDate)
  bookingDay.setHours(0, 0, 0, 0)

  const today = new Date(now)
  today.setHours(0, 0, 0, 0)

  // Check if booking is in the past
  if (bookingDay < today) {
    return {
      allowed: false,
      reason: 'Cannot book dates in the past.',
      earliest_available: await getEarliestBookableDate(now),
    }
  }

  // Check same-day booking
  if (config.block_same_day && bookingDay.getTime() === today.getTime()) {
    return {
      allowed: false,
      reason: 'Same day bookings are not available. Please book at least one day in advance.',
      earliest_available: await getEarliestBookableDate(now),
    }
  }

  // Check if booking for next day and past cutoff time
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  if (bookingDay.getTime() === tomorrow.getTime()) {
    const cutoffTime = new Date(today)
    cutoffTime.setHours(config.cutoff_hour, config.cutoff_minute, 0, 0)

    if (now >= cutoffTime) {
      return {
        allowed: false,
        reason: `Bookings for tomorrow close at ${formatTime(config.cutoff_hour, config.cutoff_minute)}. The cutoff time has passed.`,
        earliest_available: await getEarliestBookableDate(now),
      }
    }
  }

  // Check minimum lead time
  const bookingDateTime = new Date(bookingDate)
  const leadTimeMs = bookingDateTime.getTime() - now.getTime()
  const leadTimeHours = leadTimeMs / (1000 * 60 * 60)

  if (leadTimeHours < config.minimum_lead_hours) {
    return {
      allowed: false,
      reason: `A minimum of ${config.minimum_lead_hours} hours notice is required.`,
      earliest_available: await getEarliestBookableDate(now),
    }
  }

  return { allowed: true }
}

/**
 * Get the earliest date that can be booked
 */
export async function getEarliestBookableDate(currentTime?: Date): Promise<Date> {
  const config = await getCutoffConfig()
  const now = currentTime || new Date()

  const today = new Date(now)
  today.setHours(0, 0, 0, 0)

  // Start with tomorrow
  let earliest = new Date(today)
  earliest.setDate(earliest.getDate() + 1)

  // If past cutoff, push to day after tomorrow
  const cutoffTime = new Date(today)
  cutoffTime.setHours(config.cutoff_hour, config.cutoff_minute, 0, 0)

  if (now >= cutoffTime) {
    earliest.setDate(earliest.getDate() + 1)
  }

  // If blocking same day and we're exactly on the boundary, push forward
  if (config.block_same_day) {
    const todayEnd = new Date(today)
    todayEnd.setHours(23, 59, 59, 999)

    if (earliest <= todayEnd) {
      earliest = new Date(today)
      earliest.setDate(earliest.getDate() + 1)
    }
  }

  return earliest
}

/**
 * Get available booking dates for the next N days
 */
export async function getBookableDates(
  days: number = 30,
  currentTime?: Date
): Promise<Date[]> {
  const now = currentTime || new Date()
  const earliest = await getEarliestBookableDate(now)
  const dates: Date[] = []

  for (let i = 0; i < days; i++) {
    const date = new Date(earliest)
    date.setDate(date.getDate() + i)

    const result = await isBookingAllowed(date, now)
    if (result.allowed) {
      dates.push(date)
    }
  }

  return dates
}

/**
 * Format time for display
 */
function formatTime(hour: number, minute: number): string {
  const period = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
  const displayMinute = minute.toString().padStart(2, '0')
  return `${displayHour}:${displayMinute} ${period}`
}

/**
 * Check if a date is a weekend
 */
export function isWeekend(date: Date): boolean {
  const day = date.getDay()
  return day === 0 || day === 6 // Sunday or Saturday
}

/**
 * Get human-readable reason why a date is blocked
 */
export function getBlockedReason(
  bookingDate: Date,
  now: Date,
  config: CutoffConfig
): string | null {
  const bookingDay = new Date(bookingDate)
  bookingDay.setHours(0, 0, 0, 0)

  const today = new Date(now)
  today.setHours(0, 0, 0, 0)

  if (bookingDay < today) {
    return 'This date is in the past'
  }

  if (config.block_same_day && bookingDay.getTime() === today.getTime()) {
    return 'Same-day bookings are not available'
  }

  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  if (bookingDay.getTime() === tomorrow.getTime()) {
    const cutoffTime = new Date(today)
    cutoffTime.setHours(config.cutoff_hour, config.cutoff_minute, 0, 0)

    if (now >= cutoffTime) {
      return `The booking cutoff (${formatTime(config.cutoff_hour, config.cutoff_minute)}) has passed`
    }
  }

  return null
}
