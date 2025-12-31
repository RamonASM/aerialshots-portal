/**
 * Review Request Settings API
 *
 * CRUD operations for review request configuration
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireStaff } from '@/lib/middleware/auth'
import { z } from 'zod'

const settingsSchema = z.object({
  delay_after_delivery_ms: z.number().int().positive().optional(),
  send_time_start: z.string().regex(/^\d{2}:\d{2}:\d{2}$/).optional(),
  send_time_end: z.string().regex(/^\d{2}:\d{2}:\d{2}$/).optional(),
  max_requests_per_agent_per_month: z.number().int().positive().optional(),
  min_days_between_requests: z.number().int().positive().optional(),
  default_channel: z.enum(['email', 'sms', 'both']).optional(),
  primary_platform: z.enum(['google', 'facebook', 'yelp', 'trustpilot']).optional(),
  google_review_url: z.string().url().optional().nullable(),
  facebook_review_url: z.string().url().optional().nullable(),
  yelp_review_url: z.string().url().optional().nullable(),
  trustpilot_review_url: z.string().url().optional().nullable(),
  is_enabled: z.boolean().optional(),
})

// GET - Get current settings
export async function GET() {
  try {
    const supabase = await createClient()
    await requireStaff(supabase)

    const { data, error } = await supabase
      .from('review_request_settings')
      .select('*')
      .limit(1)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching review settings:', error)
      return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
    }

    return NextResponse.json({ settings: data || null })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    throw error
  }
}

// PATCH - Update settings
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    await requireStaff(supabase)

    const body = await request.json()
    const parsed = settingsSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    // Check if settings exist
    const { data: existing } = await supabase
      .from('review_request_settings')
      .select('id')
      .limit(1)
      .single()

    let result

    if (existing) {
      // Update existing
      result = await supabase
        .from('review_request_settings')
        .update({
          ...parsed.data,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single()
    } else {
      // Create new
      result = await supabase
        .from('review_request_settings')
        .insert(parsed.data)
        .select()
        .single()
    }

    if (result.error) {
      console.error('Error updating review settings:', result.error)
      return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
    }

    return NextResponse.json({ settings: result.data })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    throw error
  }
}
