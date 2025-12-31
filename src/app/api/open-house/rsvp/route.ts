/**
 * Open House RSVP API
 *
 * Handles RSVP submissions for open houses
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { sendOpenHouseRSVPEmail } from '@/lib/email/resend'

const rsvpSchema = z.object({
  openHouseId: z.string().uuid(),
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().optional(),
  partySize: z.number().int().min(1).max(10).default(1),
  notes: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = rsvpSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { openHouseId, name, email, phone, partySize, notes } = parsed.data

    const supabase = await createClient()

    // Verify open house exists and is accepting RSVPs
    // Note: Using explicit type for joined query since relationships not fully typed
    type OpenHouseWithListing = {
      id: string
      status: string
      event_date: string
      max_attendees: number | null
      require_registration: boolean
      listing: {
        id: string
        address: string
        city: string
        state: string
        agent: { name: string; phone: string | null } | null
      } | null
    }

    const { data: openHouse, error: openHouseError } = await supabase
      .from('open_houses')
      .select(`
        id, status, event_date, max_attendees, require_registration,
        listing:listings(id, address, city, state, agent:agents(name, phone))
      `)
      .eq('id', openHouseId)
      .single() as unknown as { data: OpenHouseWithListing | null; error: Error | null }

    if (openHouseError || !openHouse) {
      return NextResponse.json(
        { error: 'Open house not found' },
        { status: 404 }
      )
    }

    if (openHouse.status !== 'scheduled') {
      return NextResponse.json(
        { error: 'This open house is no longer accepting RSVPs' },
        { status: 400 }
      )
    }

    // Check if event date has passed
    const eventDate = new Date(openHouse.event_date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (eventDate < today) {
      return NextResponse.json(
        { error: 'This open house has already occurred' },
        { status: 400 }
      )
    }

    // Check if max attendees reached
    if (openHouse.max_attendees) {
      const { count } = await supabase
        .from('open_house_rsvps')
        .select('*', { count: 'exact', head: true })
        .eq('open_house_id', openHouseId)
        .in('status', ['registered', 'confirmed'])

      if (count && count >= openHouse.max_attendees) {
        return NextResponse.json(
          { error: 'This open house is at capacity' },
          { status: 400 }
        )
      }
    }

    // Check for existing RSVP
    const { data: existingRsvp } = await supabase
      .from('open_house_rsvps')
      .select('id, status')
      .eq('open_house_id', openHouseId)
      .eq('email', email.toLowerCase())
      .single()

    if (existingRsvp) {
      if (existingRsvp.status === 'cancelled') {
        // Re-activate cancelled RSVP
        const { error: updateError } = await supabase
          .from('open_house_rsvps')
          .update({
            status: 'registered' as const,
            name,
            phone,
            party_size: partySize,
            notes,
          })
          .eq('id', existingRsvp.id)

        if (updateError) {
          console.error('Error reactivating RSVP:', updateError)
          return NextResponse.json(
            { error: 'Failed to update RSVP' },
            { status: 500 }
          )
        }

        return NextResponse.json({
          success: true,
          message: 'Your RSVP has been reactivated',
          rsvpId: existingRsvp.id,
        })
      }

      return NextResponse.json(
        { error: 'You have already registered for this open house' },
        { status: 400 }
      )
    }

    // Create new RSVP
    const { data: rsvp, error: insertError } = await supabase
      .from('open_house_rsvps')
      .insert({
        open_house_id: openHouseId,
        name,
        email: email.toLowerCase(),
        phone,
        party_size: partySize,
        notes,
      })
      .select('id')
      .single()

    if (insertError) {
      console.error('Error creating RSVP:', insertError)
      return NextResponse.json(
        { error: 'Failed to create RSVP' },
        { status: 500 }
      )
    }

    // Send confirmation email
    const listing = openHouse.listing
    if (listing) {
      const propertyAddress = `${listing.address}, ${listing.city}, ${listing.state}`
      const agent = listing.agent

      await sendOpenHouseRSVPEmail({
        to: email,
        guestName: name,
        propertyAddress,
        eventDate: openHouse.event_date,
        agentName: agent?.name || 'Aerial Shots Media',
        agentPhone: agent?.phone ?? undefined,
      }).catch((err) => {
        // Don't fail the RSVP if email fails
        console.error('Failed to send RSVP confirmation email:', err)
      })
    }

    return NextResponse.json({
      success: true,
      message: 'RSVP confirmed! We look forward to seeing you.',
      rsvpId: rsvp.id,
    })
  } catch (error) {
    console.error('RSVP error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

// GET endpoint to check RSVP status
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const openHouseId = searchParams.get('openHouseId')
  const email = searchParams.get('email')

  if (!openHouseId || !email) {
    return NextResponse.json(
      { error: 'Missing required parameters' },
      { status: 400 }
    )
  }

  const supabase = await createClient()

  const { data: rsvp, error } = await supabase
    .from('open_house_rsvps')
    .select('id, status, party_size, created_at')
    .eq('open_house_id', openHouseId)
    .eq('email', email.toLowerCase())
    .single()

  if (error || !rsvp) {
    return NextResponse.json({ registered: false })
  }

  return NextResponse.json({
    registered: true,
    status: rsvp.status,
    partySize: rsvp.party_size,
    registeredAt: rsvp.created_at,
  })
}
