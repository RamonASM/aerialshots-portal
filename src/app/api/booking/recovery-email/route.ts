import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { z } from 'zod'

const recoveryEmailSchema = z.object({
  email: z.string().email(),
  sessionId: z.string().min(1),
  packageKey: z.string().optional(),
  total: z.number().optional(),
})

const resend = new Resend(process.env.RESEND_API_KEY)

/**
 * POST /api/booking/recovery-email
 * Send a cart recovery email with booking link
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parseResult = recoveryEmailSchema.safeParse(body)

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid request data' },
        { status: 400 }
      )
    }

    const { email, sessionId, packageKey, total } = parseResult.data

    const recoveryUrl = `${process.env.NEXT_PUBLIC_APP_URL}/book/listing?recover=${sessionId}`

    // Send recovery email via Resend
    await resend.emails.send({
      from: 'Aerial Shots Media <booking@aerialshots.media>',
      to: email,
      subject: "Your booking is waiting - Complete it with 10% off!",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">

            <!-- Header -->
            <div style="background: linear-gradient(135deg, #0077ff 0%, #0055cc 100%); padding: 32px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700;">
                Your Booking is Waiting
              </h1>
            </div>

            <!-- Content -->
            <div style="padding: 32px;">
              <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
                We noticed you didn't finish booking your real estate photography session. No worries - we saved your progress!
              </p>

              ${packageKey ? `
              <div style="background-color: #f8f9fa; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                <p style="color: #666; font-size: 14px; margin: 0 0 8px 0;">Your selection:</p>
                <p style="color: #333; font-size: 18px; font-weight: 600; margin: 0;">
                  ${packageKey.charAt(0).toUpperCase() + packageKey.slice(1)} Package
                  ${total ? ` - $${total.toLocaleString()}` : ''}
                </p>
              </div>
              ` : ''}

              <!-- Special Offer -->
              <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 8px; padding: 20px; margin-bottom: 24px; text-align: center;">
                <p style="color: #ffffff; font-size: 14px; margin: 0 0 8px 0;">
                  EXCLUSIVE OFFER - 24 HOURS ONLY
                </p>
                <p style="color: #ffffff; font-size: 24px; font-weight: 700; margin: 0 0 8px 0;">
                  10% OFF YOUR ORDER
                </p>
                <p style="color: #ffffff; font-size: 16px; margin: 0;">
                  Use code: <span style="background-color: rgba(255,255,255,0.2); padding: 4px 12px; border-radius: 4px; font-family: monospace; font-weight: 600;">COMEBACK10</span>
                </p>
              </div>

              <!-- CTA Button -->
              <div style="text-align: center; margin-bottom: 24px;">
                <a href="${recoveryUrl}" style="display: inline-block; background-color: #0077ff; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 600;">
                  Complete Your Booking
                </a>
              </div>

              <p style="color: #666; font-size: 14px; line-height: 1.6; margin-bottom: 0;">
                Questions? Reply to this email or call us at <a href="tel:4074953549" style="color: #0077ff;">(407) 495-3549</a>
              </p>
            </div>

            <!-- Footer -->
            <div style="background-color: #f8f9fa; padding: 20px 32px; text-align: center;">
              <p style="color: #999; font-size: 12px; margin: 0;">
                Aerial Shots Media<br>
                Central Florida's Premier Real Estate Photography
              </p>
            </div>

          </div>
        </body>
        </html>
      `,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Recovery email error:', error)
    return NextResponse.json(
      { error: 'Failed to send recovery email' },
      { status: 500 }
    )
  }
}
