/**
 * Availability API Endpoint
 *
 * Returns available booking slots based on duration and scheduling rules.
 * Ported from asm-agent-backend /availability endpoint.
 */

import { NextRequest, NextResponse } from 'next/server'
import { calculateShootDuration, formatDuration } from '@/lib/scheduling/duration'

export interface AvailabilitySlot {
  slotId: string
  start: string
  end: string
  durationMinutes: number
  available: boolean
}

export interface AvailabilityResponse {
  duration: number
  durationFormatted: string
  slots: AvailabilitySlot[]
}

/**
 * Generates simulated availability slots
 * TODO: Integrate with actual calendar/scheduling system
 */
function generateSlots(
  dateFrom: Date,
  duration: number,
  count: number = 10
): AvailabilitySlot[] {
  const slots: AvailabilitySlot[] = []
  const now = new Date()

  // Start from the next available hour
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

  while (slots.length < count) {
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

    // Check if the shoot would end before 6 PM (allowing some buffer)
    const endTime = new Date(current.getTime() + duration * 60 * 1000)
    if (endTime.getHours() > 18) {
      current.setDate(current.getDate() + 1)
      current.setHours(9)
      continue
    }

    // Skip if in the past
    if (current <= now) {
      current.setHours(current.getHours() + 1)
      continue
    }

    slots.push({
      slotId: `slot_${current.toISOString()}`,
      start: current.toISOString(),
      end: endTime.toISOString(),
      durationMinutes: duration,
      available: true, // TODO: Check against actual bookings
    })

    // Move to next hour slot
    current.setHours(current.getHours() + 1)
  }

  return slots
}

export async function GET(request: NextRequest) {
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

  // Generate available slots
  const slots = generateSlots(dateFrom, duration, count)

  const response: AvailabilityResponse = {
    duration,
    durationFormatted: formatDuration(duration),
    slots,
  }

  return NextResponse.json(response)
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
    const slots = generateSlots(parsedDateFrom, duration, count)

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
