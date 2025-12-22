import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendMagicLinkEmail } from '@/lib/email/resend'
import { handleApiError, badRequest, serverError } from '@/lib/utils/errors'
import { z } from 'zod'

const magicLinkSchema = z.object({
  email: z.string().email('Invalid email address'),
})

/**
 * Send a magic link email for authentication
 * POST /api/auth/magic-link
 *
 * This bypasses Supabase's built-in email and uses Resend API directly
 * for more reliable email delivery.
 */
export async function POST(request: NextRequest) {
  return handleApiError(async () => {
    const body = await request.json()

    // Validate email
    const result = magicLinkSchema.safeParse(body)
    if (!result.success) {
      throw badRequest(result.error.issues[0].message)
    }

    const { email } = result.data
    const normalizedEmail = email.toLowerCase().trim()

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
