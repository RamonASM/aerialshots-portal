import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  optimizeRoute,
  getDriveTime,
  geocodeAddress,
} from '@/lib/integrations/google-maps'
import type { RouteStop, Coordinates } from '@/lib/integrations/google-maps/types'

// GET - Get optimized route for a date
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const searchParams = request.nextUrl.searchParams
    const date = searchParams.get('date')

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get staff member
    const { data: staff, error: staffError } = await supabase
      .from('staff')
      .select('id')
      .eq('email', user.email!)
      .eq('is_active', true)
      .maybeSingle()

    if (staffError) {
      console.error('Staff lookup error:', staffError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    if (!staff) {
      return NextResponse.json(
        { error: 'Staff member not found' },
        { status: 403 }
      )
    }

    // Default to today if no date provided
    const routeDate = date || new Date().toISOString().slice(0, 10)

    // Check if we have a saved route for this date
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existingRoute } = await (supabase as any)
      .from('daily_routes')
      .select(
        `
        *,
        route_stops(
          *,
          listing:listings(id, address, city, state, zip, lat, lng),
          photographer_assignment:photographer_assignments(id)
        )
      `
      )
      .eq('staff_id', staff.id)
      .eq('route_date', routeDate)
      .single() as { data: { route_stops: unknown[] } | null }

    if (existingRoute) {
      return NextResponse.json({
        route: existingRoute,
        stops: existingRoute.route_stops,
      })
    }

    // No saved route - get assignments for this date
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: assignments } = await (supabase as any)
      .from('photographer_assignments')
      .select(
        `
        id,
        scheduled_date,
        scheduled_time,
        status,
        listing:listings(
          id,
          address,
          city,
          state,
          zip,
          lat,
          lng,
          sqft
        )
      `
      )
      .eq('photographer_id', staff.id)
      .eq('scheduled_date', routeDate)
      .in('status', ['assigned', 'confirmed'])
      .order('scheduled_time', { ascending: true })

    if (!assignments || assignments.length === 0) {
      return NextResponse.json({
        route: null,
        stops: [],
        message: 'No assignments for this date',
      })
    }

    // Return assignments without optimization (needs POST to optimize)
    const stops = assignments.map((a: { id: string; scheduled_time: string; status: string; listing: unknown }) => {
      const listing = a.listing as {
        id: string
        address: string
        city: string
        state: string
        zip: string
        lat: number | null
        lng: number | null
        sqft: number | null
      } | null

      return {
        assignmentId: a.id,
        address: listing
          ? `${listing.address}, ${listing.city}, ${listing.state} ${listing.zip}`
          : 'Unknown',
        lat: listing?.lat || null,
        lng: listing?.lng || null,
        scheduledTime: a.scheduled_time,
        status: a.status,
        estimatedDuration: estimatePhotoDuration(listing?.sqft || 2000),
      }
    })

    return NextResponse.json({
      route: null,
      stops,
      needsOptimization: true,
    })
  } catch (error) {
    console.error('Route API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Optimize and save route
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get staff member
    const { data: staff, error: staffError } = await supabase
      .from('staff')
      .select('id')
      .eq('email', user.email!)
      .eq('is_active', true)
      .maybeSingle()

    if (staffError) {
      console.error('Staff lookup error:', staffError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    if (!staff) {
      return NextResponse.json(
        { error: 'Staff member not found' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { date, startTime, startAddress } = body

    const routeDate = date || new Date().toISOString().slice(0, 10)

    // Determine start location (startAddress required)
    if (!startAddress) {
      return NextResponse.json(
        { error: 'Start address is required' },
        { status: 400 }
      )
    }

    const geocoded = await geocodeAddress(startAddress)
    if (!geocoded) {
      return NextResponse.json(
        { error: 'Could not geocode start address' },
        { status: 400 }
      )
    }
    const startLocation: Coordinates = geocoded

    // Get assignments for this date
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: assignments } = await (supabase as any)
      .from('photographer_assignments')
      .select(
        `
        id,
        scheduled_date,
        scheduled_time,
        status,
        listing:listings(
          id,
          address,
          city,
          state,
          zip,
          lat,
          lng,
          sqft
        )
      `
      )
      .eq('photographer_id', staff.id)
      .eq('scheduled_date', routeDate)
      .in('status', ['assigned', 'confirmed']) as { data: Array<{ id: string; scheduled_date: string; scheduled_time: string; status: string; listing: unknown }> | null }

    if (!assignments || assignments.length === 0) {
      return NextResponse.json(
        { error: 'No assignments for this date' },
        { status: 400 }
      )
    }

    // Filter out assignments without coordinates and geocode if needed
    const stopsToOptimize: RouteStop[] = []

    for (const assignment of assignments) {
      const listing = assignment.listing as {
        id: string
        address: string
        city: string
        state: string
        zip: string
        lat: number | null
        lng: number | null
        sqft: number | null
      } | null

      if (!listing) continue

      let lat = listing.lat
      let lng = listing.lng

      // Geocode if no coordinates
      if (!lat || !lng) {
        const fullAddress = `${listing.address}, ${listing.city}, ${listing.state} ${listing.zip}`
        const geocoded = await geocodeAddress(fullAddress)

        if (geocoded) {
          lat = geocoded.lat
          lng = geocoded.lng

          // Update listing with geocoded coordinates
          await supabase
            .from('listings')
            .update({ lat, lng })
            .eq('id', listing.id)
        }
      }

      if (lat && lng) {
        stopsToOptimize.push({
          id: assignment.id,
          address: `${listing.address}, ${listing.city}, ${listing.state} ${listing.zip}`,
          lat,
          lng,
          dwellTimeMinutes: estimatePhotoDuration(listing.sqft || 2000),
        })
      }
    }

    if (stopsToOptimize.length === 0) {
      return NextResponse.json(
        { error: 'No stops with valid coordinates' },
        { status: 400 }
      )
    }

    // Optimize the route
    const routeStartTime = startTime
      ? new Date(`${routeDate}T${startTime}`)
      : new Date(`${routeDate}T09:00:00`)

    const optimized = await optimizeRoute(
      startLocation,
      stopsToOptimize,
      routeStartTime
    )

    // Save the optimized route
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: dailyRoute, error: routeError } = await (supabase as any)
      .from('daily_routes')
      .upsert(
        {
          staff_id: staff.id,
          route_date: routeDate,
          start_lat: startLocation.lat,
          start_lng: startLocation.lng,
          start_time: routeStartTime.toISOString(),
          end_time: optimized.estimatedEndTime.toISOString(),
          total_distance_meters: optimized.totalDistanceMeters,
          total_duration_seconds: optimized.totalDurationSeconds,
          stop_count: optimized.stops.length,
          is_optimized: true,
          optimization_algorithm: 'nearest_neighbor',
        },
        {
          onConflict: 'staff_id,route_date',
        }
      )
      .select()
      .single() as { data: { id: string } | null; error: Error | null }

    if (routeError || !dailyRoute) {
      throw routeError || new Error('Failed to save route')
    }

    // Delete existing stops for this route
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('route_stops')
      .delete()
      .eq('route_id', dailyRoute.id)

    // Insert optimized stops
    const routeStops = optimized.stops.map((stop, index) => ({
      route_id: dailyRoute.id,
      stop_order: index + 1,
      listing_id: null, // Would need to look up from assignment
      photographer_assignment_id: stop.id,
      address: stop.address,
      lat: stop.lat,
      lng: stop.lng,
      estimated_arrival: stop.arrivalTime?.toISOString(),
      estimated_departure: stop.departureTime?.toISOString(),
      dwell_time_minutes: stop.dwellTimeMinutes,
    }))

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('route_stops').insert(routeStops)

    // Calculate drive time from start to first stop
    let driveToFirstStop = null
    if (optimized.stops.length > 0) {
      driveToFirstStop = await getDriveTime(startLocation, {
        lat: optimized.stops[0].lat,
        lng: optimized.stops[0].lng,
      })
    }

    return NextResponse.json({
      route: dailyRoute,
      stops: optimized.stops.map((stop, index) => ({
        ...stop,
        stopOrder: index + 1,
      })),
      summary: {
        totalStops: optimized.stops.length,
        totalDistance: formatDistance(optimized.totalDistanceMeters),
        totalDuration: formatDuration(optimized.totalDurationSeconds),
        startTime: routeStartTime.toISOString(),
        estimatedEndTime: optimized.estimatedEndTime.toISOString(),
        driveToFirstStop: driveToFirstStop?.durationText,
      },
    })
  } catch (error) {
    console.error('Route optimization error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Estimate photo shoot duration based on square footage
 */
function estimatePhotoDuration(sqft: number): number {
  if (sqft < 1500) return 60
  if (sqft < 2500) return 75
  if (sqft < 3500) return 90
  if (sqft < 5000) return 105
  return 120
}

/**
 * Format distance in meters
 */
function formatDistance(meters: number): string {
  const miles = meters / 1609.344
  if (miles < 0.1) {
    return `${Math.round(meters * 3.28084)} ft`
  }
  return `${miles.toFixed(1)} mi`
}

/**
 * Format duration in seconds
 */
function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.round((seconds % 3600) / 60)

  if (hours > 0) {
    return `${hours} hr ${minutes} min`
  }
  return `${minutes} min`
}
