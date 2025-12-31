/**
 * Availability API Endpoint
 *
 * Returns available booking slots based on duration and scheduling rules.
 * Uses real database tables for actual availability.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { calculateShootDuration, formatDuration } from '@/lib/scheduling/duration'

// Use service role for booking availability (public endpoint)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export interface AvailabilitySlot {
  slotId: string
  start: string
  end: string
  durationMinutes: number
  available: boolean
  photographerId?: string
  isPeak?: boolean
}

export interface AvailabilityResponse {
  duration: number
  durationFormatted: string
  slots: AvailabilitySlot[]
}

interface BookingTimeSlot {
  id: string
  date: string
  start_time: string
  end_time: string
  photographer_id: string | null
  status: string
  duration_minutes: number | null
}

interface ServiceAvailability {
  date: string
  total_slots: number
  booked_slots: number
  blocked_slots: number
  morning_available: boolean
  afternoon_available: boolean
  evening_available: boolean
  is_peak: boolean
}

/**
 * Fetches real availability from database
 */
async function getRealSlots(
  dateFrom: Date,
  duration: number,
  count: number = 10
): Promise<AvailabilitySlot[]> {
  const now = new Date()
  const slots: AvailabilitySlot[] = []

  // Calculate date range - look ahead up to 30 days
  const dateEnd = new Date(dateFrom)
  dateEnd.setDate(dateEnd.getDate() + 30)

  const dateFromStr = dateFrom.toISOString().split('T')[0]
  const dateEndStr = dateEnd.toISOString().split('T')[0]

  // First, try to get pre-defined time slots from booking_time_slots table
  const { data: timeSlots, error: timeSlotsError } = await supabase
    .from('booking_time_slots')
    .select('*')
    .gte('date', dateFromStr)
    .lte('date', dateEndStr)
    .eq('status', 'available')
    .order('date')
    .order('start_time')
    .limit(count * 2) // Get extra in case some don't fit duration

  // Also get service availability for day-level capacity
  const { data: serviceAvailability } = await supabase
    .from('service_availability')
    .select('*')
    .gte('date', dateFromStr)
    .lte('date', dateEndStr)

  // Create a map of date -> availability info
  const availabilityMap = new Map<string, ServiceAvailability>()
  if (serviceAvailability) {
    for (const sa of serviceAvailability) {
      availabilityMap.set(sa.date, sa as ServiceAvailability)
    }
  }

  // Also check existing bookings/assignments for conflicts
  const { data: existingBookings } = await supabase
    .from('photographer_assignments')
    .select('scheduled_at, photographer_id')
    .gte('scheduled_at', dateFrom.toISOString())
    .lte('scheduled_at', dateEnd.toISOString())
    .in('status', ['pending', 'confirmed', 'in_progress'])

  // Create a set of booked times for conflict checking
  const bookedTimes = new Set<string>()
  if (existingBookings) {
    for (const booking of existingBookings) {
      if (booking.scheduled_at) {
        // Mark the hour as booked
        const bookedDate = new Date(booking.scheduled_at)
        bookedTimes.add(bookedDate.toISOString())
      }
    }
  }

  // If we have pre-defined time slots, use them
  if (timeSlots && timeSlots.length > 0) {
    for (const slot of timeSlots as BookingTimeSlot[]) {
      if (slots.length >= count) break

      const slotDate = new Date(`${slot.date}T${slot.start_time}`)
      const slotEnd = new Date(`${slot.date}T${slot.end_time}`)

      // Skip if in the past
      if (slotDate <= now) continue

      // Check if the slot duration is sufficient
      const slotDuration = slot.duration_minutes ||
        (slotEnd.getTime() - slotDate.getTime()) / 60000

      if (slotDuration < duration) continue

      // Check if this time conflicts with existing bookings
      if (bookedTimes.has(slotDate.toISOString())) continue

      // Get day-level availability info
      const dayAvail = availabilityMap.get(slot.date)

      slots.push({
        slotId: slot.id,
        start: slotDate.toISOString(),
        end: new Date(slotDate.getTime() + duration * 60000).toISOString(),
        durationMinutes: duration,
        available: true,
        photographerId: slot.photographer_id || undefined,
        isPeak: dayAvail?.is_peak || false,
      })
    }
  }

  // If we don't have enough slots from the database, generate based on service_availability
  if (slots.length < count) {
    let current = new Date(dateFrom)
    current.setMinutes(0, 0, 0)

    if (current.getHours() < 9) {
      current.setHours(9)
    } else if (current.getHours() >= 17) {
      current.setDate(current.getDate() + 1)
      current.setHours(9)
    } else {
      current.setHours(current.getHours() + 1)
    }

    while (slots.length < count && current < dateEnd) {
      // Skip weekends
      if (current.getDay() === 0 || current.getDay() === 6) {
        current.setDate(current.getDate() + 1)
        current.setHours(9)
        continue
      }

      // Only generate slots between 9 AM and 5 PM
      if (current.getHours() >= 17) {
        current.setDate(current.getDate() + 1)
        current.setHours(9)
        continue
      }

      if (current.getHours() < 9) {
        current.setHours(9)
        continue
      }

      // Skip if in the past
      if (current <= now) {
        current.setHours(current.getHours() + 1)
        continue
      }

      // Check day-level availability
      const dateStr = current.toISOString().split('T')[0]
      const dayAvail = availabilityMap.get(dateStr)

      if (dayAvail) {
        // Check if day is fully booked
        const availableSlots = dayAvail.total_slots - dayAvail.booked_slots - dayAvail.blocked_slots
        if (availableSlots <= 0) {
          current.setDate(current.getDate() + 1)
          current.setHours(9)
          continue
        }

        // Check time-of-day availability
        const hour = current.getHours()
        if (hour < 12 && !dayAvail.morning_available) {
          current.setHours(12)
          continue
        }
        if (hour >= 12 && hour < 17 && !dayAvail.afternoon_available) {
          current.setDate(current.getDate() + 1)
          current.setHours(9)
          continue
        }
      }

      // Check if the shoot would end before 6 PM
      const endTime = new Date(current.getTime() + duration * 60 * 1000)
      if (endTime.getHours() > 18) {
        current.setDate(current.getDate() + 1)
        current.setHours(9)
        continue
      }

      // Check for conflicts with existing bookings
      if (bookedTimes.has(current.toISOString())) {
        current.setHours(current.getHours() + 1)
        continue
      }

      // Check if this slot already exists in our results
      const slotExists = slots.some(s => s.start === current.toISOString())
      if (!slotExists) {
        slots.push({
          slotId: `slot_${current.toISOString()}`,
          start: current.toISOString(),
          end: endTime.toISOString(),
          durationMinutes: duration,
          available: true,
          isPeak: dayAvail?.is_peak || false,
        })
      }

      current.setHours(current.getHours() + 1)
    }
  }

  return slots
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams

    // Parse parameters
    const dateFromParam = searchParams.get('dateFrom')
    const sqftParam = searchParams.get('sqft')
    const servicesParam = searchParams.get('services')
    const countParam = searchParams.get('count')

    const dateFrom = dateFromParam ? new Date(dateFromParam) : new Date()
    const sqft = sqftParam ? Number(sqftParam) : 2000
    const services = servicesParam ? servicesParam.split(',').filter(Boolean) : []
    const count = countParam ? Number(countParam) : 10

    // Validate date
    if (isNaN(dateFrom.getTime())) {
      return NextResponse.json(
        { error: 'Invalid dateFrom format' },
        { status: 400 }
      )
    }

    // Calculate duration based on services
    const duration = calculateShootDuration(sqft, services)

    // Get real available slots from database
    const slots = await getRealSlots(dateFrom, duration, count)

    const response: AvailabilityResponse = {
      duration,
      durationFormatted: formatDuration(duration),
      slots,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Availability GET error:', error)
    return NextResponse.json(
      { error: 'Failed to get availability' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { dateFrom, sqft = 2000, services = [], count = 10 } = body

    const parsedDateFrom = dateFrom ? new Date(dateFrom) : new Date()

    if (isNaN(parsedDateFrom.getTime())) {
      return NextResponse.json(
        { error: 'Invalid dateFrom format' },
        { status: 400 }
      )
    }

    const duration = calculateShootDuration(sqft, services)

    // Get real available slots from database
    const slots = await getRealSlots(parsedDateFrom, duration, count)

    const response: AvailabilityResponse = {
      duration,
      durationFormatted: formatDuration(duration),
      slots,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Availability API error:', error)
    return NextResponse.json(
      { error: 'Failed to get availability' },
      { status: 500 }
    )
  }
}
