/**
 * Photographer Location API
 *
 * Allows photographers to update their real-time location during shoots.
 * Staff can view photographer locations for active bookings.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getStaffAccess } from '@/lib/auth/server-access'
import { apiLogger, formatError } from '@/lib/logger'

interface LocationUpdate {
  listing_id?: string
  latitude: number
  longitude: number
  accuracy?: number
  heading?: number
  speed?: number
  status?: 'en_route' | 'arriving' | 'on_site' | 'shooting' | 'departing' | 'offline'
  eta_minutes?: number
}

/**
 * POST /api/team/location
 *
 * Update photographer's current location
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication via Clerk (or Supabase fallback)
    const staff = await getStaffAccess()

    if (!staff) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify photographer or videographer role
    if (!['photographer', 'videographer', 'admin'].includes(staff.role || '')) {
      return NextResponse.json(
        { error: 'Only photographers can update location' },
        { status: 403 }
      )
    }

    const adminClient = createAdminClient()

    const body: LocationUpdate = await request.json()

    // Validate required fields
    if (typeof body.latitude !== 'number' || typeof body.longitude !== 'number') {
      return NextResponse.json(
        { error: 'latitude and longitude are required' },
        { status: 400 }
      )
    }

    // Validate coordinates
    if (body.latitude < -90 || body.latitude > 90) {
      return NextResponse.json(
        { error: 'Invalid latitude (must be -90 to 90)' },
        { status: 400 }
      )
    }

    if (body.longitude < -180 || body.longitude > 180) {
      return NextResponse.json(
        { error: 'Invalid longitude (must be -180 to 180)' },
        { status: 400 }
      )
    }

    // Upsert location
    const { data: location, error } = await adminClient
      .from('photographer_locations')
      .upsert({
        staff_id: staff.id,
        listing_id: body.listing_id || null,
        latitude: body.latitude,
        longitude: body.longitude,
        accuracy: body.accuracy || null,
        heading: body.heading || null,
        speed: body.speed || null,
        status: body.status || 'en_route',
        eta_minutes: body.eta_minutes || null,
        last_updated_at: new Date().toISOString(),
      }, {
        onConflict: 'staff_id',
      })
      .select()
      .single()

    if (error) {
      apiLogger.error({ error: formatError(error) }, 'Failed to update location')
      return NextResponse.json(
        { error: 'Failed to update location' },
        { status: 500 }
      )
    }

    apiLogger.info({
      staffId: staff.id,
      staffName: staff.name,
      listingId: body.listing_id,
      status: body.status,
    }, 'Photographer location updated')

    return NextResponse.json({
      success: true,
      location,
    })
  } catch (error) {
    apiLogger.error({ error: formatError(error) }, 'Location update error')
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/team/location
 *
 * Get photographer location for a specific listing (for clients)
 * Or get own location (for photographers)
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication via Clerk (or Supabase fallback)
    const staff = await getStaffAccess()

    if (!staff) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const listingId = searchParams.get('listing_id')
    const staffId = searchParams.get('staff_id')

    const adminClient = createAdminClient()

    // Staff member - can view their own location or all locations
    let query = adminClient
      .from('photographer_locations')
      .select(`
        *,
        staff:staff_id(id, name, team_role),
        listing:listing_id(id, address, city, state)
      `)

    if (staffId) {
      query = query.eq('staff_id', staffId)
    } else if (listingId) {
      query = query.eq('listing_id', listingId)
    }

    const { data: locations, error } = await query
      .order('last_updated_at', { ascending: false })
      .limit(50)

    if (error) {
      throw error
    }

    return NextResponse.json({ locations })
  } catch (error) {
    apiLogger.error({ error: formatError(error) }, 'Location fetch error')
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/team/location
 *
 * Clear photographer's location (when going offline)
 */
export async function DELETE() {
  try {
    // Check authentication via Clerk (or Supabase fallback)
    const staff = await getStaffAccess()

    if (!staff) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient()

    // Update status to offline
    await adminClient
      .from('photographer_locations')
      .update({ status: 'offline', last_updated_at: new Date().toISOString() })
      .eq('staff_id', staff.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    apiLogger.error({ error: formatError(error) }, 'Location delete error')
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
