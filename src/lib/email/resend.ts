import { Resend } from 'resend'

/**
 * Resend email client singleton
 * Used for sending transactional emails (magic links, notifications, etc.)
 */

function createResendClient(): Resend {
  const apiKey = process.env.RESEND_API_KEY

  if (!apiKey) {
    console.error('RESEND_API_KEY environment variable is not set')
    // Return a client that will fail gracefully on send
    // This allows the app to start but email operations will fail with clear errors
  }

  return new Resend(apiKey)
}

export const resend = createResendClient()

/**
 * Send a magic link email for authentication
 */
export async function sendMagicLinkEmail({
  to,
  magicLink,
}: {
  to: string
  magicLink: string
}) {
  const { data, error } = await resend.emails.send({
    from: 'Aerial Shots Media <noreply@aerialshots.media>',
    to,
    subject: 'Sign in to Aerial Shots Media',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Sign in to Aerial Shots Media</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5; margin: 0; padding: 40px 20px;">
          <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 12px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
            <div style="text-align: center; margin-bottom: 32px;">
              <h1 style="color: #171717; font-size: 24px; font-weight: 700; margin: 0;">Aerial Shots Media</h1>
            </div>

            <h2 style="color: #171717; font-size: 20px; font-weight: 600; margin: 0 0 16px 0;">Sign in to your account</h2>

            <p style="color: #525252; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
              Click the button below to sign in to your Aerial Shots Media portal. This link will expire in 1 hour.
            </p>

            <a href="${magicLink}" style="display: inline-block; background-color: #ff4533; color: white; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 8px; margin-bottom: 24px;">
              Sign in to Portal
            </a>

            <p style="color: #737373; font-size: 14px; line-height: 1.5; margin: 24px 0 0 0;">
              If you didn't request this email, you can safely ignore it.
            </p>

            <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 32px 0;">

            <p style="color: #a3a3a3; font-size: 12px; line-height: 1.5; margin: 0;">
              If the button doesn't work, copy and paste this link into your browser:<br>
              <a href="${magicLink}" style="color: #ff4533; word-break: break-all;">${magicLink}</a>
            </p>
          </div>
        </body>
      </html>
    `,
  })

  if (error) {
    console.error('Failed to send magic link email:', error)
    throw error
  }

  return data
}
