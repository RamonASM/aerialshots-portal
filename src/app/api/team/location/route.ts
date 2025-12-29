/**
 * Photographer Location API
 *
 * Allows photographers to update their real-time location during shoots.
 * Clients can view the photographer's location for their active bookings.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
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
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get staff record
    const adminClient = createAdminClient()
    const { data: staff } = await adminClient
      .from('staff')
      .select('id, name, team_role')
      .eq('email', user.email!)
      .eq('is_active', true)
      .single()

    if (!staff) {
      return NextResponse.json({ error: 'Not a staff member' }, { status: 403 })
    }

    // Verify photographer or videographer role
    if (!['photographer', 'videographer'].includes(staff.team_role || '')) {
      return NextResponse.json(
        { error: 'Only photographers can update location' },
        { status: 403 }
      )
    }

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
    // Note: photographer_locations table is new, types not regenerated
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: location, error } = await (adminClient as any)
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
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const listingId = searchParams.get('listing_id')
    const staffId = searchParams.get('staff_id')

    const adminClient = createAdminClient()

    // Check if user is staff
    const { data: staff } = await adminClient
      .from('staff')
      .select('id, team_role')
      .eq('email', user.email!)
      .eq('is_active', true)
      .single()

    if (staff) {
      // Staff member - can view their own location or all locations
      // Note: photographer_locations table is new, types not regenerated
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = (adminClient as any)
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
    }

    // Check if user is a client
    // Note: clients table may need type regeneration
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: client } = await (adminClient as any)
      .from('clients')
      .select('id')
      .eq('email', user.email!)
      .single() as { data: { id: string } | null }

    if (!client) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Client - can only view photographer location for their listings
    if (!listingId) {
      return NextResponse.json(
        { error: 'listing_id is required for clients' },
        { status: 400 }
      )
    }

    // Verify client owns this listing
    // Note: listings.client_id may need type regeneration
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: listing } = await (adminClient as any)
      .from('listings')
      .select('id, client_id')
      .eq('id', listingId)
      .single() as { data: { id: string; client_id: string | null } | null }

    if (!listing || listing.client_id !== client.id) {
      return NextResponse.json(
        { error: 'Not authorized to view this listing' },
        { status: 403 }
      )
    }

    // Get photographer location for this listing
    // Note: photographer_locations table is new, types not regenerated
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: location, error } = await (adminClient as any)
      .from('photographer_locations')
      .select(`
        id,
        latitude,
        longitude,
        accuracy,
        heading,
        speed,
        status,
        eta_minutes,
        last_updated_at,
        staff:staff_id(id, name)
      `)
      .eq('listing_id', listingId)
      .order('last_updated_at', { ascending: false })
      .limit(1)
      .single()

    if (error && error.code !== 'PGRST116') { // Not found is ok
      throw error
    }

    return NextResponse.json({
      location: location || null,
    })
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
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient()

    // Get staff record
    const { data: staff } = await adminClient
      .from('staff')
      .select('id')
      .eq('email', user.email!)
      .eq('is_active', true)
      .single()

    if (!staff) {
      return NextResponse.json({ error: 'Not a staff member' }, { status: 403 })
    }

    // Update status to offline
    // Note: photographer_locations table is new, types not regenerated
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (adminClient as any)
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
