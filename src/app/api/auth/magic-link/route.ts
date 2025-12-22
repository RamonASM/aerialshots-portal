import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendMagicLinkEmail } from '@/lib/email/resend'
import { handleApiError, badRequest, serverError } from '@/lib/utils/errors'
import { checkRateLimit, getRateLimitHeaders, createRateLimitKey } from '@/lib/utils/rate-limit'
import { z } from 'zod'

const magicLinkSchema = z.object({
  email: z.string().email('Invalid email address'),
})

// Rate limit: 5 requests per IP per minute
const IP_RATE_LIMIT = { limit: 5, windowSeconds: 60 }
// Rate limit: 3 requests per email per 10 minutes
const EMAIL_RATE_LIMIT = { limit: 3, windowSeconds: 600 }

/**
 * Send a magic link email for authentication
 * POST /api/auth/magic-link
 *
 * This bypasses Supabase's built-in email and uses Resend API directly
 * for more reliable email delivery.
 *
 * Rate limits:
 * - 5 requests per IP per minute
 * - 3 requests per email per 10 minutes
 */
export async function POST(request: NextRequest) {
  // Get client IP for rate limiting
  const forwardedFor = request.headers.get('x-forwarded-for')
  const clientIp = forwardedFor?.split(',')[0]?.trim() || 'unknown'

  // Check IP-based rate limit first (before parsing body)
  const ipRateLimit = checkRateLimit(createRateLimitKey('magic-link', 'ip', clientIp), IP_RATE_LIMIT)
  if (!ipRateLimit.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.', code: 'RATE_LIMITED' },
      { status: 429, headers: getRateLimitHeaders(ipRateLimit) }
    )
  }

  return handleApiError(async () => {
    const body = await request.json()

    // Validate email
    const result = magicLinkSchema.safeParse(body)
    if (!result.success) {
      throw badRequest(result.error.issues[0].message)
    }

    const { email } = result.data
    const normalizedEmail = email.toLowerCase().trim()

    // Check email-based rate limit
    const emailRateLimit = checkRateLimit(
      createRateLimitKey('magic-link', 'email', normalizedEmail),
      EMAIL_RATE_LIMIT
    )
    if (!emailRateLimit.allowed) {
      return NextResponse.json(
        {
          error: 'Too many sign-in attempts for this email. Please try again in a few minutes.',
          code: 'RATE_LIMITED',
        },
        { status: 429, headers: getRateLimitHeaders(emailRateLimit) }
      )
    }

    const supabase = createAdminClient()

    // Generate magic link using Supabase Admin API
    const { data, error } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: normalizedEmail,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.aerialshots.media'}/api/auth/callback`,
      },
    })

    if (error) {
      console.error('Failed to generate magic link:', error)
      throw serverError('Failed to generate sign-in link')
    }

    if (!data?.properties?.action_link) {
      console.error('No magic link returned from Supabase')
      throw serverError('Failed to generate sign-in link')
    }

    // Send email via Resend
    try {
      await sendMagicLinkEmail({
        to: normalizedEmail,
        magicLink: data.properties.action_link,
      })
    } catch (emailError) {
      console.error('Failed to send magic link email:', emailError)
      throw serverError('Failed to send sign-in email. Please try again.')
    }

    return NextResponse.json({
      success: true,
      message: 'Magic link sent to your email',
    })
  })
}
