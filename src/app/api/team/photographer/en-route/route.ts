import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
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
    const supabase = await createClient()

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get staff member
    const { data: staff } = await supabase
      .from('staff')
      .select('id, name')
      .eq('email', user.email!)
      .eq('is_active', true)
      .single()

    if (!staff) {
      return NextResponse.json({ error: 'Staff member not found' }, { status: 403 })
    }

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
    const { data: listing } = await supabase
      .from('listings')
      .select('id, photographer_id')
      .eq('id', listingId)
      .single()

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
    const { data: currentListing } = await supabase
      .from('listings')
      .select('ops_status')
      .eq('id', listingId)
      .single()

    if (currentListing?.ops_status === 'scheduled') {
      await supabase
        .from('listings')
        .update({ ops_status: 'en_route' })
        .eq('id', listingId)
    }

    // Log activity
    await supabase.from('portal_activity_log').insert({
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
