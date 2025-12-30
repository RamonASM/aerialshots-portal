import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const locationUpdateSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().min(0).optional(),
  heading: z.number().min(0).max(360).optional(),
  speed: z.number().min(0).optional(),
  eta_minutes: z.number().min(0).max(180).optional(),
  status: z.enum(['en_route', 'arriving', 'on_site', 'shooting', 'departing', 'offline']).optional(),
})

/**
 * PATCH /api/team/photographer/location
 * Update photographer's current location
 * Called periodically while en route or on site
 */
export async function PATCH(request: NextRequest) {
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
      .select('id')
      .eq('email', user.email!)
      .eq('is_active', true)
      .single()

    if (!staff) {
      return NextResponse.json({ error: 'Staff member not found' }, { status: 403 })
    }

    // Parse request body
    const body = await request.json()
    const parseResult = locationUpdateSchema.safeParse(body)

    if (!parseResult.success) {
      return NextResponse.json({
        error: 'Validation failed',
        details: parseResult.error.flatten().fieldErrors,
      }, { status: 400 })
    }

    const { latitude, longitude, accuracy, heading, speed, eta_minutes, status } = parseResult.data

    // Update existing location record
    const updateData: Record<string, unknown> = {
      latitude,
      longitude,
      last_updated_at: new Date().toISOString(),
    }

    if (accuracy !== undefined) updateData.accuracy = accuracy
    if (heading !== undefined) updateData.heading = heading
    if (speed !== undefined) updateData.speed = speed
    if (eta_minutes !== undefined) updateData.eta_minutes = eta_minutes
    if (status !== undefined) updateData.status = status

    const { data: location, error: updateError } = await supabase
      .from('photographer_locations')
      .update(updateData)
      .eq('staff_id', staff.id)
      .select('latitude, longitude, status, eta_minutes, listing_id')
      .single()

    if (updateError) {
      // If no existing record, create one
      if (updateError.code === 'PGRST116') {
        const { data: newLocation, error: insertError } = await supabase
          .from('photographer_locations')
          .insert({
            staff_id: staff.id,
            latitude,
            longitude,
            accuracy,
            heading,
            speed,
            eta_minutes,
            status: status || 'en_route',
            last_updated_at: new Date().toISOString(),
          })
          .select('latitude, longitude, status, eta_minutes, listing_id')
          .single()

        if (insertError) {
          console.error('Location insert error:', insertError)
          return NextResponse.json({ error: 'Failed to create location' }, { status: 500 })
        }

        return NextResponse.json({
          success: true,
          location: newLocation,
        })
      }

      console.error('Location update error:', updateError)
      return NextResponse.json({ error: 'Failed to update location' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      location: {
        latitude: location.latitude,
        longitude: location.longitude,
        status: location.status,
        eta_minutes: location.eta_minutes,
      },
    })

  } catch (error) {
    console.error('Location update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/team/photographer/location
 * Stop location tracking (go offline)
 */
export async function DELETE(request: NextRequest) {
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
      .select('id')
      .eq('email', user.email!)
      .eq('is_active', true)
      .single()

    if (!staff) {
      return NextResponse.json({ error: 'Staff member not found' }, { status: 403 })
    }

    // Set status to offline instead of deleting
    const { error: updateError } = await supabase
      .from('photographer_locations')
      .update({
        status: 'offline',
        listing_id: null,
        last_updated_at: new Date().toISOString(),
      })
      .eq('staff_id', staff.id)

    if (updateError) {
      console.error('Location offline error:', updateError)
      return NextResponse.json({ error: 'Failed to go offline' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Location tracking stopped',
    })

  } catch (error) {
    console.error('Location delete error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
