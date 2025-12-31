import { createAdminClient } from '@/lib/supabase/admin'

export interface Territory {
  id: string
  name: string
  zip_codes: string[]
  is_active?: boolean
}

export interface TerritorySchedule {
  id: string
  territory_id: string
  day_of_week: number // 0 = Sunday, 1 = Monday, etc.
  is_available: boolean
  start_time: string | null // HH:MM format
  end_time: string | null
  max_appointments: number
}

export interface TerritoryPhotographer {
  staff_id: string
  is_primary: boolean
  staff: {
    id: string
    name: string
    role: string
  }
}

export interface TerritoryAvailabilityResult {
  available: boolean
  territory?: Territory
  slots_remaining?: number
  reason?: string
  schedule?: TerritorySchedule
}

/**
 * Find territories that contain a given zip code
 */
export async function getTerritoriesForLocation(zipCode: string): Promise<Territory[]> {
  try {
    const supabase = createAdminClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('service_territories')
      .select('id, name, zip_codes')
      .contains('zip_codes', [zipCode]) as { data: Territory[] | null; error: Error | null }

    if (error || !data) {
      console.error('[Territory] Error fetching territories:', error)
      return []
    }

    return data
  } catch (error) {
    console.error('[Territory] Error:', error)
    return []
  }
}

/**
 * Get photographers assigned to a territory
 */
export async function getPhotographersByTerritory(
  territoryId: string
): Promise<TerritoryPhotographer[]> {
  try {
    const supabase = createAdminClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('staff_territories')
      .select('staff_id, is_primary, staff:staff_id(id, name, role)')
      .eq('territory_id', territoryId) as { data: TerritoryPhotographer[] | null; error: Error | null }

    if (error || !data) {
      console.error('[Territory] Error fetching photographers:', error)
      return []
    }

    return data
  } catch (error) {
    console.error('[Territory] Error:', error)
    return []
  }
}

/**
 * Get the schedule for a territory on a specific day of week
 */
export async function getTerritorySchedule(
  territoryId: string,
  dayOfWeek: number
): Promise<TerritorySchedule | null> {
  try {
    const supabase = createAdminClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('territory_availability')
      .select('*')
      .eq('territory_id', territoryId)
      .eq('day_of_week', dayOfWeek)
      .single() as { data: TerritorySchedule | null; error: Error | null }

    if (error || !data) {
      return null
    }

    return data
  } catch (error) {
    console.error('[Territory] Error fetching schedule:', error)
    return null
  }
}

/**
 * Get count of existing appointments for a territory on a date
 */
async function getAppointmentCount(territoryId: string, date: Date): Promise<number> {
  try {
    const supabase = createAdminClient()

    const startOfDay = new Date(date)
    startOfDay.setHours(0, 0, 0, 0)

    const endOfDay = new Date(date)
    endOfDay.setHours(23, 59, 59, 999)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { count, error } = await (supabase as any)
      .from('seller_schedules')
      .select('id', { count: 'exact', head: true })
      .eq('territory_id', territoryId)
      .gte('scheduled_date', startOfDay.toISOString())
      .lt('scheduled_date', endOfDay.toISOString()) as { count: number | null; error: Error | null }

    if (error) {
      console.error('[Territory] Error counting appointments:', error)
      return 0
    }

    return count || 0
  } catch (error) {
    console.error('[Territory] Error:', error)
    return 0
  }
}

/**
 * Check if a territory is available for booking on a specific date
 */
export async function checkTerritoryAvailability(
  zipCode: string,
  date: Date
): Promise<TerritoryAvailabilityResult> {
  // Find territories for this zip code
  const territories = await getTerritoriesForLocation(zipCode)

  if (territories.length === 0) {
    return {
      available: false,
      reason: 'This zip code is not serviceable. Please contact us for availability.',
    }
  }

  // Use the first matching territory
  const territory = territories[0]
  const dayOfWeek = date.getDay()

  // Get schedule for this day
  const schedule = await getTerritorySchedule(territory.id, dayOfWeek)

  if (!schedule || !schedule.is_available) {
    return {
      available: false,
      territory,
      reason: `This area is closed on ${getDayName(dayOfWeek)}s.`,
    }
  }

  // Check appointment count
  const bookedCount = await getAppointmentCount(territory.id, date)
  const slotsRemaining = Math.max(0, schedule.max_appointments - bookedCount)

  if (slotsRemaining === 0) {
    return {
      available: false,
      territory,
      schedule,
      slots_remaining: 0,
      reason: 'This date is fully booked. Please select another date or join the waitlist.',
    }
  }

  return {
    available: true,
    territory,
    schedule,
    slots_remaining: slotsRemaining,
  }
}

/**
 * Get available time slots for a territory on a date
 */
export async function getAvailableTimeSlots(
  territoryId: string,
  date: Date,
  durationMinutes: number = 60
): Promise<string[]> {
  const dayOfWeek = date.getDay()
  const schedule = await getTerritorySchedule(territoryId, dayOfWeek)

  if (!schedule || !schedule.is_available || !schedule.start_time || !schedule.end_time) {
    return []
  }

  const slots: string[] = []
  const [startHour, startMin] = schedule.start_time.split(':').map(Number)
  const [endHour, endMin] = schedule.end_time.split(':').map(Number)

  const startMinutes = startHour * 60 + startMin
  const endMinutes = endHour * 60 + endMin

  // Generate slots at 30-minute intervals
  for (let time = startMinutes; time + durationMinutes <= endMinutes; time += 30) {
    const hour = Math.floor(time / 60)
    const min = time % 60
    slots.push(`${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`)
  }

  return slots
}

/**
 * Helper to get day name
 */
function getDayName(dayOfWeek: number): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  return days[dayOfWeek]
}

/**
 * Check if a specific time slot is available
 */
export async function isTimeSlotAvailable(
  territoryId: string,
  date: Date,
  time: string
): Promise<boolean> {
  const dayOfWeek = date.getDay()
  const schedule = await getTerritorySchedule(territoryId, dayOfWeek)

  if (!schedule || !schedule.is_available) {
    return false
  }

  // Check if time is within schedule
  if (schedule.start_time && schedule.end_time) {
    if (time < schedule.start_time || time >= schedule.end_time) {
      return false
    }
  }

  // Check if specific slot is already booked
  // Query seller_schedules for confirmed bookings at this time
  try {
    const supabase = createAdminClient()
    const dateString = date.toISOString().split('T')[0]

    // Get listings in this territory via zip codes
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: territory } = await (supabase as any)
      .from('service_territories')
      .select('zip_codes')
      .eq('id', territoryId)
      .single() as { data: { zip_codes: string[] } | null; error: Error | null }

    if (!territory?.zip_codes?.length) {
      return true // No zip codes to check, slot is available
    }

    // Count confirmed bookings for this date/time in territory
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { count } = await (supabase as any)
      .from('seller_schedules')
      .select('id, listing:listings!inner(zip)', { count: 'exact', head: true })
      .in('listing.zip', territory.zip_codes)
      .eq('status', 'confirmed')
      .not('selected_slot', 'is', null)
      .filter('selected_slot->date', 'eq', dateString)
      .filter('selected_slot->start_time', 'eq', time) as { count: number | null; error: Error | null }

    // Check against max appointments for this schedule
    if (count && schedule.max_appointments && count >= schedule.max_appointments) {
      return false
    }
  } catch (bookingCheckError) {
    // Don't fail availability check if booking query fails
    console.warn('[Territory] Error checking slot bookings:', bookingCheckError)
  }

  return true
}
