import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { requireAgent, requireStaffOrOwner } from '@/lib/middleware/auth'
import {
  handleApiError,
  badRequest,
  databaseError,
} from '@/lib/utils/errors'
import { checkRateLimit, getRateLimitHeaders, createRateLimitKey } from '@/lib/utils/rate-limit'
import { z } from 'zod'

// Rate limit: 5 leads per IP per 10 minutes
const LEAD_RATE_LIMIT = { limit: 5, windowSeconds: 600 }

/**
 * Lead creation schema
 */
const createLeadSchema = z.object({
  listing_id: z.string().uuid().optional(),
  agent_id: z.string().uuid().optional().nullable(),
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email format'),
  phone: z.string().optional(),
  message: z.string().optional(),
})

/**
 * Create a new lead
 * POST /api/leads
 *
 * Public endpoint - no authentication required
 * Used by property pages for visitor inquiries
 * Rate limited: 5 requests per IP per 10 minutes
 */
export async function POST(request: NextRequest) {
  // Rate limit by IP
  const forwardedFor = request.headers.get('x-forwarded-for')
  const clientIp = forwardedFor?.split(',')[0]?.trim() || 'unknown'

  const rateLimit = checkRateLimit(createRateLimitKey('leads', 'ip', clientIp), LEAD_RATE_LIMIT)
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429, headers: getRateLimitHeaders(rateLimit) }
    )
  }

  return handleApiError(async () => {
    const body = await request.json()

    // Validate request body
    const result = createLeadSchema.safeParse(body)
    if (!result.success) {
      const firstError = result.error.issues[0]
      throw badRequest(firstError.message)
    }

    const { listing_id, agent_id, name, email, phone, message } = result.data

    const supabase = createAdminClient()

    // Create lead
    const { data: lead, error } = await supabase
      .from('leads')
      .insert({
        listing_id: listing_id || null,
        agent_id: agent_id || null,
        name,
        email,
        phone: phone || null,
        message: message || null,
        status: 'new',
      })
      .select('id')
      .single()

    if (error) {
      throw databaseError(error, 'creating lead')
    }

    return NextResponse.json({
      success: true,
      lead_id: lead.id,
    })
  })
}

/**
 * Get leads for dashboard
 * GET /api/leads
 *
 * Requires authentication
 * - Agents can only view their own leads
 * - Staff can view any agent's leads
 */
export async function GET(request: NextRequest) {
  return handleApiError(async () => {
    const supabase = await createClient()

    const { searchParams } = new URL(request.url)
    const agentId = searchParams.get('agent_id')
    const status = searchParams.get('status')

    let targetAgentId: string

    if (agentId) {
      // Validate ownership or staff access
      const { agent } = await requireStaffOrOwner(supabase, agentId)
      targetAgentId = agent.id
    } else {
      // Default to current user's agent
      const { agent } = await requireAgent(supabase)
      targetAgentId = agent.id
    }

    const adminClient = createAdminClient()

    let query = adminClient
      .from('leads')
      .select(`
        *,
        listing:listings(address, city, state)
      `)
      .eq('agent_id', targetAgentId)
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) {
      throw databaseError(error, 'fetching leads')
    }

    return NextResponse.json({ leads: data })
  })
}
