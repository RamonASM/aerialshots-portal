import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getStaffAccess } from '@/lib/auth/server-access'
import { z } from 'zod'

const enRouteSchema = z.object({
  listingId: z.string().uuid(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  eta_minutes: z.number().min(0).max(180).optional(),
})

/**
 * POST /api/team/photographer/en-route
 * Photographer marks themselves as en route to a listing
 * Sets up location tracking for seller portal
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication via Clerk (or Supabase fallback)
    const staff = await getStaffAccess()

    if (!staff) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()

    // Parse request body
    const body = await request.json()
    const parseResult = enRouteSchema.safeParse(body)

    if (!parseResult.success) {
      return NextResponse.json({
        error: 'Validation failed',
        details: parseResult.error.flatten().fieldErrors,
      }, { status: 400 })
    }

    const { listingId, latitude, longitude, eta_minutes } = parseResult.data

    // Verify this photographer is assigned to this listing
    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .select('id, photographer_id')
      .eq('id', listingId)
      .maybeSingle()

    if (listingError) {
      console.error('Listing lookup error:', listingError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    if (!listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
    }

    if (listing.photographer_id !== staff.id) {
      return NextResponse.json({ error: 'Not assigned to this listing' }, { status: 403 })
    }

    // Upsert photographer location with en_route status
    const { data: location, error: locationError } = await supabase
      .from('photographer_locations')
      .upsert({
        staff_id: staff.id,
        listing_id: listingId,
        latitude,
        longitude,
        status: 'en_route',
        eta_minutes,
        last_updated_at: new Date().toISOString(),
      }, {
        onConflict: 'staff_id',
      })
      .select()
      .single()

    if (locationError) {
      console.error('Location update error:', locationError)
      return NextResponse.json({ error: 'Failed to update location' }, { status: 500 })
    }

    // Update listing ops_status if still scheduled
    const { data: currentListing, error: currentListingError } = await supabase
      .from('listings')
      .select('ops_status')
      .eq('id', listingId)
      .maybeSingle()

    if (currentListingError) {
      console.error('Status check error:', currentListingError)
    }

    if (currentListing?.ops_status === 'scheduled') {
      await supabase
        .from('listings')
        .update({ ops_status: 'en_route' })
        .eq('id', listingId)
    }

    // Log activity
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('portal_activity_log').insert({
      staff_id: staff.id,
      activity_type: 'photographer_en_route',
      entity_type: 'listing',
      entity_id: listingId,
      details: { latitude, longitude, eta_minutes },
    })

    return NextResponse.json({
      success: true,
      message: 'En route status set',
      location: {
        latitude: location.latitude,
        longitude: location.longitude,
        status: location.status,
        eta_minutes: location.eta_minutes,
      },
    })

  } catch (error) {
    console.error('En route error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
