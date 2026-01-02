import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'
import { checkRateLimit, getIdentifier, createRateLimitResponse, getRateLimitHeaders } from '@/lib/rate-limit'

// Session data schema
const sessionDataSchema = z.object({
  sessionId: z.string().min(1),
  currentStep: z.number().min(0).max(4),
  formData: z.object({
    packageKey: z.string().optional(),
    sqftTier: z.string().optional(),
    addons: z.array(z.object({
      id: z.string(),
      quantity: z.number().optional(),
    })).optional(),
    propertyAddress: z.string().optional(),
    propertyCity: z.string().optional(),
    propertyState: z.string().optional(),
    propertyZip: z.string().optional(),
    propertyLat: z.number().optional(),
    propertyLng: z.number().optional(),
    scheduledDate: z.string().optional(),
    scheduledTime: z.string().optional(),
    contactName: z.string().optional(),
    contactEmail: z.string().email().optional().or(z.literal('')),
    contactPhone: z.string().optional(),
    couponCode: z.string().optional(),
    utmSource: z.string().optional(),
    utmMedium: z.string().optional(),
    utmCampaign: z.string().optional(),
  }),
  pricing: z.object({
    packagePrice: z.number(),
    addonsTotal: z.number(),
    travelFee: z.number(),
    subtotal: z.number(),
    total: z.number(),
  }).optional(),
})

type SessionData = z.infer<typeof sessionDataSchema>

/**
 * POST /api/booking/session
 * Save or update a booking session for cart recovery
 */
export async function POST(request: NextRequest) {
  // Apply rate limiting
  const identifier = getIdentifier(request)
  const rateLimitResult = await checkRateLimit(identifier, 'booking')

  if (!rateLimitResult.success) {
    return createRateLimitResponse(rateLimitResult)
  }

  try {
    const body = await request.json()
    const parseResult = sessionDataSchema.safeParse(body)

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid session data', details: parseResult.error.flatten() },
        { status: 400 }
      )
    }

    const sessionData = parseResult.data
    const supabase = createAdminClient()

    // Check if user is authenticated (optional)
    const userSupabase = await createClient()
    const { data: { user } } = await userSupabase.auth.getUser()

    // Upsert the session - using explicit row object to avoid deep type instantiation
    const upsertRow = {
      session_id: sessionData.sessionId,
      user_id: user?.id || null,
      email: sessionData.formData.contactEmail || null,
      current_step: sessionData.currentStep,
      form_data: sessionData.formData as Record<string, unknown>,
      pricing_snapshot: (sessionData.pricing || null) as Record<string, unknown> | null,
      package_key: sessionData.formData.packageKey || null,
      property_address: sessionData.formData.propertyAddress || null,
      property_city: sessionData.formData.propertyCity || null,
      scheduled_date: sessionData.formData.scheduledDate || null,
      utm_source: sessionData.formData.utmSource || null,
      utm_medium: sessionData.formData.utmMedium || null,
      utm_campaign: sessionData.formData.utmCampaign || null,
      last_activity_at: new Date().toISOString(),
      is_converted: false,
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('booking_sessions')
      .upsert(upsertRow, { onConflict: 'session_id' })

    if (error) {
      console.error('Session save error:', error)
      return NextResponse.json(
        { error: 'Failed to save session' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      sessionId: upsertRow.session_id,
    })
  } catch (error) {
    console.error('Booking session error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/booking/session
 * Retrieve a booking session by session ID or user
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId is required' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('booking_sessions')
      .select('*')
      .eq('session_id', sessionId)
      .eq('is_converted', false)
      .single()

    if (error || !data) {
      return NextResponse.json(
        { error: 'Session not found', found: false },
        { status: 404 }
      )
    }

    // Check if session is too old (7 days)
    const sessionAge = Date.now() - new Date(data.last_activity_at).getTime()
    const sevenDays = 7 * 24 * 60 * 60 * 1000

    if (sessionAge > sevenDays) {
      return NextResponse.json(
        { error: 'Session expired', found: false },
        { status: 410 }
      )
    }

    return NextResponse.json({
      success: true,
      found: true,
      session: {
        sessionId: data.session_id,
        currentStep: data.current_step,
        formData: data.form_data,
        pricing: data.pricing_snapshot,
        createdAt: data.created_at,
        lastActivityAt: data.last_activity_at,
      },
    })
  } catch (error) {
    console.error('Get session error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/booking/session
 * Mark a session as converted or abandoned
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionId, action } = body as { sessionId: string; action: 'convert' | 'abandon' }

    if (!sessionId || !action) {
      return NextResponse.json(
        { error: 'sessionId and action are required' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    const updates: Record<string, unknown> = {}

    if (action === 'convert') {
      updates.is_converted = true
      updates.converted_at = new Date().toISOString()
    } else if (action === 'abandon') {
      updates.is_abandoned = true
      updates.abandoned_at = new Date().toISOString()
    }

    const { error } = await supabase
      .from('booking_sessions')
      .update(updates)
      .eq('session_id', sessionId)

    if (error) {
      console.error('Session update error:', error)
      return NextResponse.json(
        { error: 'Failed to update session' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Patch session error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
