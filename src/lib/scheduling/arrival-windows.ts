import { createAdminClient } from '@/lib/supabase/admin'

export interface ArrivalWindow {
  id: string // Format: "HH:MM-HH:MM"
  start: string // HH:MM format
  end: string // HH:MM format
  available?: boolean
  label?: string
}

export interface ArrivalWindowConfig {
  start_time: string // HH:MM format
  end_time: string // HH:MM format
  window_duration_minutes: number
  buffer_between_windows: number
}

export interface ConfirmArrivalResult {
  success: boolean
  confirmed_time?: string
  error?: string
}

export interface FormatOptions {
  short?: boolean
}

/**
 * Parse time string to minutes since midnight
 */
function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

/**
 * Convert minutes since midnight to HH:MM format
 */
function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
}

/**
 * Format 24h time to 12h format with AM/PM
 */
function formatTime12h(time: string): string {
  const [hours, minutes] = time.split(':').map(Number)
  const period = hours >= 12 ? 'PM' : 'AM'
  const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`
}

/**
 * Generate arrival windows based on configuration
 */
export function generateArrivalWindows(
  config: ArrivalWindowConfig,
  bookedSlots: string[] = []
): ArrivalWindow[] {
  const windows: ArrivalWindow[] = []

  const startMinutes = parseTimeToMinutes(config.start_time)
  const endMinutes = parseTimeToMinutes(config.end_time)

  // Validate config
  if (endMinutes <= startMinutes) {
    return []
  }

  let currentStart = startMinutes
  const { window_duration_minutes, buffer_between_windows } = config

  while (currentStart + window_duration_minutes <= endMinutes) {
    const windowEnd = currentStart + window_duration_minutes
    const startTime = minutesToTime(currentStart)
    const endTime = minutesToTime(windowEnd)
    const windowId = `${startTime}-${endTime}`

    windows.push({
      id: windowId,
      start: startTime,
      end: endTime,
      available: !bookedSlots.includes(windowId),
      label: formatArrivalWindow({ id: windowId, start: startTime, end: endTime }),
    })

    // Move to next window start (window duration + buffer)
    currentStart = windowEnd + buffer_between_windows
  }

  return windows
}

/**
 * Format an arrival window as a human-readable string
 */
export function formatArrivalWindow(
  window: ArrivalWindow,
  options: FormatOptions = {}
): string {
  if (options.short) {
    const [startH] = window.start.split(':').map(Number)
    const [endH] = window.end.split(':').map(Number)
    const period = endH >= 12 ? 'PM' : 'AM'
    const displayStart = startH > 12 ? startH - 12 : startH
    const displayEnd = endH > 12 ? endH - 12 : endH
    return `${displayStart}-${displayEnd} ${period}`
  }

  return `${formatTime12h(window.start)} - ${formatTime12h(window.end)}`
}

/**
 * Check if a specific time falls within an arrival window
 */
export function isWithinWindow(time: string, window: ArrivalWindow): boolean {
  const timeMinutes = parseTimeToMinutes(time)
  const startMinutes = parseTimeToMinutes(window.start)
  const endMinutes = parseTimeToMinutes(window.end)

  // Start is inclusive, end is exclusive
  return timeMinutes >= startMinutes && timeMinutes < endMinutes
}

/**
 * Find the window that contains a specific time
 */
export function getWindowForTime(
  time: string,
  windows: ArrivalWindow[]
): ArrivalWindow | null {
  for (const window of windows) {
    if (isWithinWindow(time, window)) {
      return window
    }
  }
  return null
}

/**
 * Confirm a specific arrival time within an assigned window
 * Called by photographer to specify their exact arrival time
 */
export async function confirmArrivalTime(
  scheduleId: string,
  confirmedTime: string
): Promise<ConfirmArrivalResult> {
  try {
    const supabase = createAdminClient()

    // First, get the schedule to check the window
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: schedule, error: fetchError } = await (supabase as any)
      .from('seller_schedules')
      .select('id, arrival_window_start, arrival_window_end')
      .eq('id', scheduleId)
      .single() as {
        data: {
          id: string
          arrival_window_start: string
          arrival_window_end: string
        } | null
        error: Error | null
      }

    if (fetchError || !schedule) {
      return {
        success: false,
        error: 'Schedule not found',
      }
    }

    // Check if confirmed time is within the window
    const window: ArrivalWindow = {
      id: `${schedule.arrival_window_start}-${schedule.arrival_window_end}`,
      start: schedule.arrival_window_start,
      end: schedule.arrival_window_end,
    }

    if (!isWithinWindow(confirmedTime, window)) {
      return {
        success: false,
        error: `Confirmed time ${confirmedTime} is outside the assigned window (${formatArrivalWindow(window)})`,
      }
    }

    // Update the schedule with confirmed time
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = await (supabase as any)
      .from('seller_schedules')
      .update({ confirmed_arrival_time: confirmedTime })
      .eq('id', scheduleId)

    if (updateError) {
      return {
        success: false,
        error: 'Failed to update schedule',
      }
    }

    return {
      success: true,
      confirmed_time: confirmedTime,
    }
  } catch (error) {
    console.error('[ArrivalWindows] Error confirming time:', error)
    return {
      success: false,
      error: 'An unexpected error occurred',
    }
  }
}

/**
 * Get default arrival window configuration
 */
export function getDefaultWindowConfig(): ArrivalWindowConfig {
  return {
    start_time: '08:00',
    end_time: '17:00',
    window_duration_minutes: 60,
    buffer_between_windows: 0,
  }
}

/**
 * Get available windows for a territory on a specific date
 */
export async function getAvailableWindows(
  territoryId: string,
  date: Date
): Promise<ArrivalWindow[]> {
  try {
    const supabase = createAdminClient()

    // Get territory schedule for the day of week
    const dayOfWeek = date.getDay()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: schedule } = await (supabase as any)
      .from('territory_availability')
      .select('start_time, end_time')
      .eq('territory_id', territoryId)
      .eq('day_of_week', dayOfWeek)
      .single() as { data: { start_time: string; end_time: string } | null }

    if (!schedule) {
      return []
    }

    // Get already booked windows for this date
    const startOfDay = new Date(date)
    startOfDay.setHours(0, 0, 0, 0)

    const endOfDay = new Date(date)
    endOfDay.setHours(23, 59, 59, 999)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: bookings } = await (supabase as any)
      .from('seller_schedules')
      .select('arrival_window_start, arrival_window_end')
      .eq('territory_id', territoryId)
      .gte('scheduled_date', startOfDay.toISOString())
      .lt('scheduled_date', endOfDay.toISOString()) as {
        data: Array<{ arrival_window_start: string; arrival_window_end: string }> | null
      }

    const bookedSlots = (bookings || []).map(
      (b) => `${b.arrival_window_start}-${b.arrival_window_end}`
    )

    const config: ArrivalWindowConfig = {
      start_time: schedule.start_time,
      end_time: schedule.end_time,
      window_duration_minutes: 60, // Default 1-hour windows
      buffer_between_windows: 0,
    }

    return generateArrivalWindows(config, bookedSlots)
  } catch (error) {
    console.error('[ArrivalWindows] Error getting available windows:', error)
    return []
  }
}
