import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { apiLogger, formatError } from '@/lib/logger'
import { sendSellerAvailabilityEmail, sendSellerConfirmationEmail } from '@/lib/email/resend'
import type { Json } from '@/lib/supabase/types'
import type { ShareLinkRow, SellerScheduleRow } from '@/lib/supabase/types-custom'

// Local types for seller schedules
interface AvailableSlot {
  date: string
  start_time: string
  end_time: string
}

type SellerScheduleStatus = 'submitted' | 'viewed' | 'confirmed' | 'rescheduled' | 'cancelled'

interface SellerScheduleInsert {
  listing_id: string
  share_link_id?: string | null
  seller_name: string
  seller_email: string
  seller_phone?: string | null
  available_slots: AvailableSlot[]
  status: SellerScheduleStatus
  notes?: string | null
  submitted_at: string
}

// Zod schemas for seller schedule validation
const AvailableSlotSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  start_time: z.string().min(1, 'Start time is required'),
  end_time: z.string().min(1, 'End time is required'),
})

const SellerScheduleSchema = z.object({
  share_link_id: z.string().uuid().optional().nullable(),
  listing_id: z.string().uuid('Invalid listing ID'),
  seller_name: z.string().min(1, 'Seller name is required').max(200, 'Name is too long'),
  seller_email: z.string().email('Invalid email address').max(254, 'Email is too long'),
  seller_phone: z.string().max(20).optional().nullable(),
  available_slots: z.array(AvailableSlotSchema).min(1, 'At least one time slot is required'),
  notes: z.string().max(2000, 'Notes are too long').optional().nullable(),
})

const ScheduleUpdateSchema = z.object({
  schedule_id: z.string().uuid('Invalid schedule ID'),
  selected_slot: AvailableSlotSchema.optional(),
  status: z.enum(['submitted', 'viewed', 'confirmed', 'rescheduled', 'cancelled']).optional(),
})

/**
 * POST /api/seller-schedules
 * Submit seller availability (public - uses share_link_id for auth)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const rawBody = await request.json()

    // Validate with Zod schema
    const parseResult = SellerScheduleSchema.safeParse(rawBody)
    if (!parseResult.success) {
      const errors = parseResult.error.issues.map((e) => e.message).join(', ')
      apiLogger.warn({ errors }, 'Seller schedule validation failed')
      return NextResponse.json({ error: errors }, { status: 400 })
    }

    const {
      share_link_id,
      listing_id,
      seller_name,
      seller_email,
      seller_phone,
      available_slots,
      notes,
    } = parseResult.data

    // Validate share link if provided
    if (share_link_id) {
      const { data: shareLink, error: linkError } = await supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from('share_links' as any)
        .select('id, is_active, expires_at, link_type')
        .eq('id', share_link_id)
        .maybeSingle()
        .returns<Pick<ShareLinkRow, 'id' | 'is_active' | 'expires_at' | 'link_type'>>()

      if (linkError) {
        apiLogger.error({ error: formatError(linkError) }, 'Share link lookup error')
        return NextResponse.json({ error: 'Database error' }, { status: 500 })
      }

      if (!shareLink) {
        return NextResponse.json({ error: 'Invalid share link' }, { status: 400 })
      }

      if (!shareLink.is_active) {
        return NextResponse.json({ error: 'This link is no longer active' }, { status: 410 })
      }

      if (shareLink.expires_at && new Date(shareLink.expires_at) < new Date()) {
        return NextResponse.json({ error: 'This link has expired' }, { status: 410 })
      }

      if (shareLink.link_type !== 'schedule') {
        return NextResponse.json({ error: 'Invalid link type' }, { status: 400 })
      }
    }

    // Check for existing schedule
    let existingQuery = supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('seller_schedules' as any)
      .select('id')
      .eq('listing_id', listing_id)

    if (share_link_id) {
      existingQuery = existingQuery.eq('share_link_id', share_link_id)
    } else {
      existingQuery = existingQuery.is('share_link_id', null)
    }

    // Use maybeSingle() since no existing schedule is a valid case
    const { data: existing, error: existingError } = await existingQuery
      .maybeSingle()
      .returns<Pick<SellerScheduleRow, 'id'>>()

    if (existingError) {
      apiLogger.error({ error: formatError(existingError), listingId: listing_id }, 'Error checking existing schedule')
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    const scheduleData = {
      listing_id,
      share_link_id: share_link_id || null,
      seller_name,
      seller_email,
      seller_phone: seller_phone || null,
      available_slots: available_slots as unknown as Json,
      status: 'submitted' as const,
      notes: notes || null,
      submitted_at: new Date().toISOString(),
    }

    let result: SellerScheduleRow | null = null
    if (existing) {
      // Update existing schedule
      const { data, error } = await supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from('seller_schedules' as any)
        .update({
          ...scheduleData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single()
        .returns<SellerScheduleRow>()

      if (error) {
        apiLogger.error({ error: formatError(error), listingId: listing_id }, 'Error updating seller schedule')
        return NextResponse.json({ error: 'Failed to update schedule' }, { status: 500 })
      }
      result = data
    } else {
      // Create new schedule
      const { data, error } = await supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from('seller_schedules' as any)
        .insert(scheduleData)
        .select()
        .single()
        .returns<SellerScheduleRow>()

      if (error) {
        apiLogger.error({ error: formatError(error), listingId: listing_id }, 'Error creating seller schedule')
        return NextResponse.json({ error: 'Failed to create schedule' }, { status: 500 })
      }
      result = data
    }

    // Send notification email to agent about new availability
    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .select('address, city, state, agent:agents(name, email)')
      .eq('id', listing_id)
      .maybeSingle()

    if (listingError) {
      // Log but don't fail the request - schedule was already saved
      apiLogger.warn({ error: formatError(listingError), listingId: listing_id }, 'Failed to fetch listing for notification')
    }

    if (listing?.agent?.email) {
      const availableDates = available_slots.map((slot) =>
        `${slot.date} (${slot.start_time} - ${slot.end_time})`
      )

      await sendSellerAvailabilityEmail({
        to: listing.agent.email,
        agentName: listing.agent.name || 'Agent',
        sellerName: seller_name,
        propertyAddress: `${listing.address}, ${listing.city}, ${listing.state}`,
        availableDates,
        notes: notes || undefined,
      }).catch((err) => {
        apiLogger.error({ error: formatError(err) }, 'Failed to send seller availability email')
      })
    }

    return NextResponse.json({
      success: true,
      schedule: result,
      message: existing ? 'Availability updated' : 'Availability submitted',
    })

  } catch (error) {
    apiLogger.error({ error: formatError(error) }, 'Seller schedule submission error')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * GET /api/seller-schedules
 * Get seller schedules (requires auth - for agent/staff)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verify authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const listing_id = searchParams.get('listing_id')
    const share_link_id = searchParams.get('share_link_id')
    const status = searchParams.get('status')

    // Build query
    let query = supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('seller_schedules' as any)
      .select(`
        *,
        listing:listings(id, address, city, state),
        share_link:share_links(id, share_token, client_name)
      `)
      .order('created_at', { ascending: false })

    if (listing_id) {
      query = query.eq('listing_id', listing_id)
    }

    if (share_link_id) {
      query = query.eq('share_link_id', share_link_id)
    }

    if (status) {
      query = query.eq('status', status as SellerScheduleStatus)
    }

    const { data: schedules, error: listError } = await query

    if (listError) {
      apiLogger.error({ error: formatError(listError) }, 'Error fetching seller schedules')
      return NextResponse.json({ error: 'Failed to fetch schedules' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      schedules: schedules || [],
    })

  } catch (error) {
    apiLogger.error({ error: formatError(error) }, 'Seller schedules list error')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH /api/seller-schedules
 * Confirm a seller schedule (requires auth - for agent/staff)
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verify authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const rawBody = await request.json()

    // Validate with Zod schema
    const parseResult = ScheduleUpdateSchema.safeParse(rawBody)
    if (!parseResult.success) {
      const errors = parseResult.error.issues.map((e) => e.message).join(', ')
      apiLogger.warn({ errors, userId: user.id }, 'Seller schedule update validation failed')
      return NextResponse.json({ error: errors }, { status: 400 })
    }

    const { schedule_id, selected_slot, status } = parseResult.data

    // Build update object
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (selected_slot) {
      updates.selected_slot = {
        ...selected_slot,
        confirmed_by: user.email,
        confirmed_at: new Date().toISOString(),
      }
      updates.status = 'confirmed'
      updates.confirmed_at = new Date().toISOString()
    }

    if (status) {
      updates.status = status
    }

    const { data: schedule, error: updateError } = await supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('seller_schedules' as any)
      .update(updates)
      .eq('id', schedule_id)
      .select()
      .single()
      .returns<SellerScheduleRow>()

    if (updateError) {
      apiLogger.error({ error: formatError(updateError), scheduleId: schedule_id }, 'Error updating seller schedule')
      return NextResponse.json({ error: 'Failed to update schedule' }, { status: 500 })
    }

    // Send confirmation email to seller when schedule is confirmed
    if (selected_slot && schedule?.seller_email && schedule?.seller_name) {
      const { data: listing, error: listingFetchError } = await supabase
        .from('listings')
        .select('address, city, state, agent:agents(name)')
        .eq('id', schedule.listing_id)
        .maybeSingle()

      if (listingFetchError) {
        apiLogger.warn({ error: formatError(listingFetchError), listingId: schedule.listing_id }, 'Failed to fetch listing for confirmation email')
      }

      if (listing) {
        const scheduledDate = `${selected_slot.date}T${selected_slot.start_time}`

        await sendSellerConfirmationEmail({
          to: schedule.seller_email,
          sellerName: schedule.seller_name,
          propertyAddress: `${listing.address}, ${listing.city}, ${listing.state}`,
          scheduledDate,
          agentName: listing.agent?.name || 'Your Agent',
        }).catch((err) => {
          apiLogger.error({ error: formatError(err) }, 'Failed to send seller confirmation email')
        })
      }
    }

    return NextResponse.json({
      success: true,
      schedule,
    })

  } catch (error) {
    apiLogger.error({ error: formatError(error) }, 'Seller schedule update error')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
