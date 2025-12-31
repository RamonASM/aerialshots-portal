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

/**
 * Send order confirmation email to customer
 */
export async function sendOrderConfirmationEmail({
  to,
  customerName,
  orderId,
  packageName,
  propertyAddress,
  scheduledDate,
  total,
}: {
  to: string
  customerName: string
  orderId: string
  packageName: string
  propertyAddress?: string
  scheduledDate?: string
  total: number
}) {
  const firstName = customerName.split(' ')[0]

  const formattedDate = scheduledDate
    ? new Date(scheduledDate).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : null

  const { data, error } = await resend.emails.send({
    from: 'Aerial Shots Media <noreply@aerialshots.media>',
    to,
    subject: `Booking Confirmed - ${packageName} Package`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5; margin: 0; padding: 40px 20px;">
          <div style="max-width: 520px; margin: 0 auto; background: white; border-radius: 12px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
            <div style="text-align: center; margin-bottom: 24px;">
              <h1 style="color: #171717; font-size: 24px; font-weight: 700; margin: 0;">Aerial Shots Media</h1>
            </div>

            <div style="text-align: center; margin-bottom: 32px;">
              <div style="width: 64px; height: 64px; background-color: #dcfce7; border-radius: 50%; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;">
                <span style="font-size: 32px;">✓</span>
              </div>
              <h2 style="color: #171717; font-size: 22px; font-weight: 600; margin: 0 0 8px 0;">
                Booking Confirmed!
              </h2>
              <p style="color: #525252; font-size: 16px; margin: 0;">
                Thanks for your order, ${firstName}!
              </p>
            </div>

            <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
              <h3 style="color: #171717; font-size: 14px; font-weight: 600; margin: 0 0 16px 0; text-transform: uppercase; letter-spacing: 0.05em;">Order Details</h3>
              <table style="width: 100%; font-size: 14px;">
                <tr>
                  <td style="padding: 8px 0; color: #737373;">Order #</td>
                  <td style="padding: 8px 0; color: #171717; text-align: right; font-weight: 500;">${orderId.slice(0, 8).toUpperCase()}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #737373;">Package</td>
                  <td style="padding: 8px 0; color: #171717; text-align: right; font-weight: 500;">${packageName}</td>
                </tr>
                ${propertyAddress ? `
                <tr>
                  <td style="padding: 8px 0; color: #737373;">Property</td>
                  <td style="padding: 8px 0; color: #171717; text-align: right; font-weight: 500;">${propertyAddress}</td>
                </tr>
                ` : ''}
                ${formattedDate ? `
                <tr>
                  <td style="padding: 8px 0; color: #737373;">Scheduled</td>
                  <td style="padding: 8px 0; color: #171717; text-align: right; font-weight: 500;">${formattedDate}</td>
                </tr>
                ` : ''}
                <tr style="border-top: 1px solid #e5e7eb;">
                  <td style="padding: 12px 0 0; color: #171717; font-weight: 600;">Total</td>
                  <td style="padding: 12px 0 0; color: #171717; text-align: right; font-weight: 700; font-size: 18px;">$${total.toLocaleString()}</td>
                </tr>
              </table>
            </div>

            <div style="background: #f0f9ff; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
              <h3 style="color: #0369a1; font-size: 14px; font-weight: 600; margin: 0 0 12px 0;">What happens next?</h3>
              <ol style="color: #0c4a6e; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
                <li>We'll assign a photographer and confirm details</li>
                <li>You'll receive photographer contact info 24hrs before</li>
                <li>Expect delivery within 24-48 hours after the shoot</li>
              </ol>
            </div>

            <div style="text-align: center; margin-bottom: 24px;">
              <a href="https://portal.aerialshots.media/dashboard/orders" style="display: inline-block; background: #3b82f6; color: white; font-size: 14px; font-weight: 600; text-decoration: none; padding: 12px 28px; border-radius: 8px;">
                View Order Details
              </a>
            </div>

            <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 32px 0;">

            <p style="color: #737373; font-size: 14px; line-height: 1.5; margin: 0; text-align: center;">
              Questions? Reply to this email or call us at<br>
              <a href="tel:+14077745070" style="color: #3b82f6;">(407) 774-5070</a>
            </p>

            <p style="color: #a3a3a3; font-size: 12px; margin: 24px 0 0 0; text-align: center;">
              Aerial Shots Media · Orlando, Tampa, Central Florida
            </p>
          </div>
        </body>
      </html>
    `,
  })

  if (error) {
    console.error('Failed to send order confirmation email:', error)
    // Don't throw - we don't want to fail the order if email fails
  }

  return data
}

/**
 * Send order notification to support team
 */
export async function sendOrderNotificationEmail({
  orderId,
  customerName,
  customerEmail,
  customerPhone,
  packageName,
  propertyAddress,
  scheduledDate,
  total,
}: {
  orderId: string
  customerName: string
  customerEmail: string
  customerPhone?: string
  packageName: string
  propertyAddress?: string
  scheduledDate?: string
  total: number
}) {
  const formattedDate = scheduledDate
    ? new Date(scheduledDate).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : 'Not scheduled yet'

  const { data, error } = await resend.emails.send({
    from: 'Aerial Shots Media <noreply@aerialshots.media>',
    to: 'support@aerialshots.media',
    replyTo: customerEmail,
    subject: `New Booking: ${packageName} - ${customerName}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
            <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 24px; text-align: center;">
              <h1 style="color: white; font-size: 20px; margin: 0;">New Booking Received!</h1>
              <p style="color: rgba(255,255,255,0.8); font-size: 14px; margin: 8px 0 0 0;">${packageName} Package - $${total.toLocaleString()}</p>
            </div>

            <div style="padding: 24px;">
              <div style="background: #f8fafc; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
                <h2 style="color: #171717; font-size: 16px; margin: 0 0 12px 0;">Customer Information</h2>
                <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                  <tr>
                    <td style="padding: 6px 0; color: #737373; width: 100px;">Name:</td>
                    <td style="padding: 6px 0; color: #171717; font-weight: 600;">${customerName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #737373;">Email:</td>
                    <td style="padding: 6px 0;"><a href="mailto:${customerEmail}" style="color: #3b82f6; text-decoration: none;">${customerEmail}</a></td>
                  </tr>
                  ${customerPhone ? `
                  <tr>
                    <td style="padding: 6px 0; color: #737373;">Phone:</td>
                    <td style="padding: 6px 0;"><a href="tel:${customerPhone}" style="color: #3b82f6; text-decoration: none;">${customerPhone}</a></td>
                  </tr>
                  ` : ''}
                </table>
              </div>

              <div style="margin-bottom: 20px;">
                <h2 style="color: #171717; font-size: 16px; margin: 0 0 12px 0;">Order Details</h2>
                <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                  <tr>
                    <td style="padding: 8px 0; color: #737373; width: 120px;">Order ID:</td>
                    <td style="padding: 8px 0; color: #171717; font-weight: 500;">${orderId}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #737373;">Package:</td>
                    <td style="padding: 8px 0; color: #171717; font-weight: 500;">${packageName}</td>
                  </tr>
                  ${propertyAddress ? `
                  <tr>
                    <td style="padding: 8px 0; color: #737373;">Property:</td>
                    <td style="padding: 8px 0; color: #171717; font-weight: 500;">${propertyAddress}</td>
                  </tr>
                  ` : ''}
                  <tr>
                    <td style="padding: 8px 0; color: #737373;">Scheduled:</td>
                    <td style="padding: 8px 0; color: #171717; font-weight: 500;">${formattedDate}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #737373;">Total:</td>
                    <td style="padding: 8px 0; color: #171717; font-weight: 700;">$${total.toLocaleString()}</td>
                  </tr>
                </table>
              </div>
            </div>

            <div style="background: #f8fafc; padding: 16px 24px; text-align: center; border-top: 1px solid #e5e7eb;">
              <a href="mailto:${customerEmail}" style="display: inline-block; background: #3b82f6; color: white; padding: 10px 24px; border-radius: 6px; text-decoration: none; font-weight: 500; font-size: 14px; margin-right: 8px;">Reply to Customer</a>
              ${customerPhone ? `<a href="tel:${customerPhone}" style="display: inline-block; background: #171717; color: white; padding: 10px 24px; border-radius: 6px; text-decoration: none; font-weight: 500; font-size: 14px;">Call Now</a>` : ''}
            </div>
          </div>
        </body>
      </html>
    `,
  })

  if (error) {
    console.error('Failed to send order notification email:', error)
  }

  return data
}

/**
 * Send low credit balance notification to agent
 */
export async function sendLowBalanceEmail({
  to,
  agentName,
  currentBalance,
  threshold,
}: {
  to: string
  agentName: string
  currentBalance: number
  threshold: number
}) {
  const firstName = agentName.split(' ')[0]

  const { data, error } = await resend.emails.send({
    from: 'Aerial Shots Media <notifications@aerialshots.media>',
    to,
    subject: `Low Credit Balance Alert - ${currentBalance} credits remaining`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5; margin: 0; padding: 40px 20px;">
          <div style="max-width: 520px; margin: 0 auto; background: white; border-radius: 12px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
            <div style="text-align: center; margin-bottom: 24px;">
              <h1 style="color: #171717; font-size: 24px; font-weight: 700; margin: 0;">Aerial Shots Media</h1>
            </div>

            <div style="text-align: center; margin-bottom: 32px;">
              <div style="width: 64px; height: 64px; background-color: #fef3c7; border-radius: 50%; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;">
                <span style="font-size: 32px;">&#9888;&#65039;</span>
              </div>
              <h2 style="color: #171717; font-size: 22px; font-weight: 600; margin: 0 0 8px 0;">
                Low Credit Balance
              </h2>
              <p style="color: #525252; font-size: 16px; margin: 0;">
                Hi ${firstName}, your credit balance is running low.
              </p>
            </div>

            <div style="background: #fffbeb; border: 1px solid #fcd34d; border-radius: 8px; padding: 20px; margin-bottom: 24px; text-align: center;">
              <p style="color: #92400e; font-size: 14px; margin: 0 0 8px 0; font-weight: 500;">Current Balance</p>
              <p style="color: #78350f; font-size: 36px; font-weight: 700; margin: 0;">${currentBalance}</p>
              <p style="color: #92400e; font-size: 12px; margin: 8px 0 0 0;">credits remaining</p>
            </div>

            <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
              <h3 style="color: #171717; font-size: 14px; font-weight: 600; margin: 0 0 16px 0;">Credit Packages</h3>
              <table style="width: 100%; font-size: 14px;">
                <tr>
                  <td style="padding: 8px 0; color: #525252;">100 Credits</td>
                  <td style="padding: 8px 0; color: #171717; text-align: right; font-weight: 600;">$25</td>
                </tr>
                <tr style="background: #f0f9ff;">
                  <td style="padding: 8px; color: #0369a1; font-weight: 500;">250 Credits <span style="background: #0ea5e9; color: white; font-size: 10px; padding: 2px 6px; border-radius: 4px; margin-left: 4px;">POPULAR</span></td>
                  <td style="padding: 8px; color: #0c4a6e; text-align: right; font-weight: 600;">$50</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #525252;">500 Credits</td>
                  <td style="padding: 8px 0; color: #171717; text-align: right; font-weight: 600;">$85</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #525252;">1000 Credits</td>
                  <td style="padding: 8px 0; color: #171717; text-align: right; font-weight: 600;">$150</td>
                </tr>
              </table>
            </div>

            <div style="text-align: center; margin-bottom: 24px;">
              <a href="https://portal.aerialshots.media/dashboard/rewards" style="display: inline-block; background: #3b82f6; color: white; font-size: 14px; font-weight: 600; text-decoration: none; padding: 12px 28px; border-radius: 8px;">
                Purchase Credits
              </a>
            </div>

            <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 32px 0;">

            <p style="color: #a3a3a3; font-size: 12px; margin: 0; text-align: center;">
              You're receiving this because your balance dropped below ${threshold} credits.<br>
              Manage notifications in your <a href="https://portal.aerialshots.media/dashboard/settings" style="color: #3b82f6;">account settings</a>.
            </p>
          </div>
        </body>
      </html>
    `,
  })

  if (error) {
    console.error('Failed to send low balance email:', error)
  }

  return data
}

/**
 * Send seller availability notification to agent
 */
export async function sendSellerAvailabilityEmail({
  to,
  agentName,
  sellerName,
  propertyAddress,
  availableDates,
  notes,
}: {
  to: string
  agentName: string
  sellerName: string
  propertyAddress: string
  availableDates: string[]
  notes?: string
}) {
  const firstName = agentName.split(' ')[0]

  const { data, error } = await resend.emails.send({
    from: 'Aerial Shots Media <notifications@aerialshots.media>',
    to,
    subject: `New Availability from ${sellerName} - ${propertyAddress}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head><meta charset="utf-8"></head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5; margin: 0; padding: 40px 20px;">
          <div style="max-width: 520px; margin: 0 auto; background: white; border-radius: 12px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
            <h1 style="color: #171717; font-size: 24px; font-weight: 700; margin: 0 0 24px 0;">Aerial Shots Media</h1>

            <h2 style="color: #171717; font-size: 20px; margin: 0 0 16px 0;">
              New Availability Submitted
            </h2>

            <p style="color: #525252; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
              Hi ${firstName}, your seller has submitted their availability for the photo shoot.
            </p>

            <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
              <table style="width: 100%; font-size: 14px;">
                <tr>
                  <td style="padding: 8px 0; color: #737373;">Property</td>
                  <td style="padding: 8px 0; color: #171717; font-weight: 500;">${propertyAddress}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #737373;">Seller</td>
                  <td style="padding: 8px 0; color: #171717; font-weight: 500;">${sellerName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #737373;">Available Dates</td>
                  <td style="padding: 8px 0; color: #171717; font-weight: 500;">${availableDates.join(', ')}</td>
                </tr>
                ${notes ? `
                <tr>
                  <td style="padding: 8px 0; color: #737373;">Notes</td>
                  <td style="padding: 8px 0; color: #171717;">${notes}</td>
                </tr>
                ` : ''}
              </table>
            </div>

            <a href="https://app.aerialshots.media/dashboard" style="display: inline-block; background: #3b82f6; color: white; font-size: 14px; font-weight: 600; text-decoration: none; padding: 12px 28px; border-radius: 8px;">
              Schedule the Shoot
            </a>
          </div>
        </body>
      </html>
    `,
  })

  if (error) {
    console.error('Failed to send seller availability email:', error)
  }

  return data
}

/**
 * Send confirmation email to seller
 */
export async function sendSellerConfirmationEmail({
  to,
  sellerName,
  propertyAddress,
  scheduledDate,
  agentName,
}: {
  to: string
  sellerName: string
  propertyAddress: string
  scheduledDate: string
  agentName: string
}) {
  const firstName = sellerName.split(' ')[0]
  const formattedDate = new Date(scheduledDate).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })

  const { data, error } = await resend.emails.send({
    from: 'Aerial Shots Media <notifications@aerialshots.media>',
    to,
    subject: `Photo Shoot Confirmed - ${propertyAddress}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head><meta charset="utf-8"></head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5; margin: 0; padding: 40px 20px;">
          <div style="max-width: 520px; margin: 0 auto; background: white; border-radius: 12px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
            <h1 style="color: #171717; font-size: 24px; font-weight: 700; margin: 0 0 24px 0;">Aerial Shots Media</h1>

            <div style="text-align: center; margin-bottom: 24px;">
              <div style="width: 64px; height: 64px; background-color: #dcfce7; border-radius: 50%; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;">
                <span style="font-size: 32px;">✓</span>
              </div>
              <h2 style="color: #171717; font-size: 22px; margin: 0;">Shoot Confirmed!</h2>
            </div>

            <p style="color: #525252; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
              Hi ${firstName}, your photo shoot has been scheduled!
            </p>

            <div style="background: #f0f9ff; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
              <table style="width: 100%; font-size: 14px;">
                <tr>
                  <td style="padding: 8px 0; color: #0369a1;">Property</td>
                  <td style="padding: 8px 0; color: #0c4a6e; font-weight: 500;">${propertyAddress}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #0369a1;">Date & Time</td>
                  <td style="padding: 8px 0; color: #0c4a6e; font-weight: 600;">${formattedDate}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #0369a1;">Your Agent</td>
                  <td style="padding: 8px 0; color: #0c4a6e;">${agentName}</td>
                </tr>
              </table>
            </div>

            <div style="background: #fefce8; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
              <h3 style="color: #854d0e; font-size: 14px; margin: 0 0 8px 0;">Preparation Checklist</h3>
              <ul style="color: #713f12; font-size: 14px; margin: 0; padding-left: 20px; line-height: 1.8;">
                <li>Remove personal items and clutter</li>
                <li>Turn on all lights</li>
                <li>Open blinds/curtains</li>
                <li>Clear cars from driveway</li>
              </ul>
            </div>

            <p style="color: #737373; font-size: 14px; text-align: center;">
              Need to reschedule? Contact your agent or call (407) 774-5070
            </p>
          </div>
        </body>
      </html>
    `,
  })

  if (error) {
    console.error('Failed to send seller confirmation email:', error)
  }

  return data
}

/**
 * Send reschedule notification to staff
 */
export async function sendRescheduleNotificationEmail({
  to,
  staffName,
  sellerName,
  propertyAddress,
  originalDate,
  newDate,
  reason,
}: {
  to: string
  staffName: string
  sellerName: string
  propertyAddress: string
  originalDate: string
  newDate: string
  reason?: string
}) {
  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })

  const { data, error } = await resend.emails.send({
    from: 'Aerial Shots Media <notifications@aerialshots.media>',
    to,
    subject: `Reschedule Request - ${propertyAddress}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head><meta charset="utf-8"></head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5; margin: 0; padding: 40px 20px;">
          <div style="max-width: 520px; margin: 0 auto; background: white; border-radius: 12px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
            <h1 style="color: #171717; font-size: 24px; font-weight: 700; margin: 0 0 24px 0;">Aerial Shots Media</h1>

            <div style="background: #fef3c7; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
              <h2 style="color: #92400e; font-size: 16px; margin: 0;">Shoot Rescheduled</h2>
            </div>

            <p style="color: #525252; font-size: 16px; margin: 0 0 24px 0;">
              Hi ${staffName}, a shoot has been rescheduled.
            </p>

            <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
              <table style="width: 100%; font-size: 14px;">
                <tr>
                  <td style="padding: 8px 0; color: #737373;">Property</td>
                  <td style="padding: 8px 0; color: #171717; font-weight: 500;">${propertyAddress}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #737373;">Seller</td>
                  <td style="padding: 8px 0; color: #171717;">${sellerName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #ef4444; text-decoration: line-through;">Original</td>
                  <td style="padding: 8px 0; color: #ef4444; text-decoration: line-through;">${formatDate(originalDate)}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #22c55e; font-weight: 600;">New Time</td>
                  <td style="padding: 8px 0; color: #22c55e; font-weight: 600;">${formatDate(newDate)}</td>
                </tr>
                ${reason ? `
                <tr>
                  <td style="padding: 8px 0; color: #737373;">Reason</td>
                  <td style="padding: 8px 0; color: #171717;">${reason}</td>
                </tr>
                ` : ''}
              </table>
            </div>

            <a href="https://app.aerialshots.media/admin/ops/schedule" style="display: inline-block; background: #3b82f6; color: white; font-size: 14px; font-weight: 600; text-decoration: none; padding: 12px 28px; border-radius: 8px;">
              View Schedule
            </a>
          </div>
        </body>
      </html>
    `,
  })

  if (error) {
    console.error('Failed to send reschedule notification email:', error)
  }

  return data
}

/**
 * Send RSVP confirmation email for open house
 */
export async function sendOpenHouseRSVPEmail({
  to,
  guestName,
  propertyAddress,
  eventDate,
  agentName,
  agentPhone,
}: {
  to: string
  guestName: string
  propertyAddress: string
  eventDate: string
  agentName: string
  agentPhone?: string
}) {
  const firstName = guestName.split(' ')[0]
  const formattedDate = new Date(eventDate).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })

  const { data, error } = await resend.emails.send({
    from: 'Aerial Shots Media <notifications@aerialshots.media>',
    to,
    subject: `You're Registered! Open House at ${propertyAddress}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head><meta charset="utf-8"></head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5; margin: 0; padding: 40px 20px;">
          <div style="max-width: 520px; margin: 0 auto; background: white; border-radius: 12px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
            <h1 style="color: #171717; font-size: 24px; font-weight: 700; margin: 0 0 24px 0;">Aerial Shots Media</h1>

            <div style="text-align: center; margin-bottom: 24px;">
              <div style="width: 64px; height: 64px; background-color: #dbeafe; border-radius: 50%; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;">
                <span style="font-size: 32px;">🏠</span>
              </div>
              <h2 style="color: #171717; font-size: 22px; margin: 0;">You're Registered!</h2>
            </div>

            <p style="color: #525252; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
              Hi ${firstName}, we look forward to seeing you at the open house!
            </p>

            <div style="background: #f0f9ff; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
              <table style="width: 100%; font-size: 14px;">
                <tr>
                  <td style="padding: 8px 0; color: #0369a1;">Property</td>
                  <td style="padding: 8px 0; color: #0c4a6e; font-weight: 500;">${propertyAddress}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #0369a1;">Date & Time</td>
                  <td style="padding: 8px 0; color: #0c4a6e; font-weight: 600;">${formattedDate}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #0369a1;">Your Host</td>
                  <td style="padding: 8px 0; color: #0c4a6e;">${agentName}</td>
                </tr>
                ${agentPhone ? `
                <tr>
                  <td style="padding: 8px 0; color: #0369a1;">Contact</td>
                  <td style="padding: 8px 0;"><a href="tel:${agentPhone}" style="color: #3b82f6;">${agentPhone}</a></td>
                </tr>
                ` : ''}
              </table>
            </div>

            <p style="color: #737373; font-size: 14px; text-align: center;">
              Add this event to your calendar so you don't forget!
            </p>
          </div>
        </body>
      </html>
    `,
  })

  if (error) {
    console.error('Failed to send open house RSVP email:', error)
  }

  return data
}

/**
 * Send proofing share email
 */
export async function sendProofingShareEmail({
  to,
  clientName,
  agentName,
  propertyAddress,
  proofingUrl,
  expiresAt,
}: {
  to: string
  clientName: string
  agentName: string
  propertyAddress: string
  proofingUrl: string
  expiresAt?: string
}) {
  const firstName = clientName.split(' ')[0]
  const expiryText = expiresAt
    ? `This link expires on ${new Date(expiresAt).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })}.`
    : ''

  const { data, error } = await resend.emails.send({
    from: 'Aerial Shots Media <notifications@aerialshots.media>',
    to,
    subject: `Review Your Photos - ${propertyAddress}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head><meta charset="utf-8"></head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5; margin: 0; padding: 40px 20px;">
          <div style="max-width: 520px; margin: 0 auto; background: white; border-radius: 12px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
            <h1 style="color: #171717; font-size: 24px; font-weight: 700; margin: 0 0 24px 0;">Aerial Shots Media</h1>

            <div style="text-align: center; margin-bottom: 24px;">
              <div style="width: 64px; height: 64px; background-color: #fae8ff; border-radius: 50%; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;">
                <span style="font-size: 32px;">📸</span>
              </div>
              <h2 style="color: #171717; font-size: 22px; margin: 0;">Your Photos Are Ready!</h2>
            </div>

            <p style="color: #525252; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
              Hi ${firstName}, ${agentName} has shared photos from ${propertyAddress} for your review.
            </p>

            <div style="text-align: center; margin-bottom: 24px;">
              <a href="${proofingUrl}" style="display: inline-block; background: #8b5cf6; color: white; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 8px;">
                Review Photos
              </a>
            </div>

            <div style="background: #f8fafc; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
              <p style="color: #525252; font-size: 14px; margin: 0; line-height: 1.6;">
                <strong>How it works:</strong><br>
                Click on any photo to approve or request changes. Your feedback helps ensure you get the perfect shots for your listing.
              </p>
            </div>

            ${expiryText ? `
            <p style="color: #a3a3a3; font-size: 12px; text-align: center;">
              ${expiryText}
            </p>
            ` : ''}
          </div>
        </body>
      </html>
    `,
  })

  if (error) {
    console.error('Failed to send proofing share email:', error)
  }

  return data
}

/**
 * Generic email sender for custom emails
 */
export async function sendEmail({
  to,
  subject,
  html,
  text,
  from,
}: {
  to: string
  subject: string
  html?: string
  text?: string
  from?: string
}): Promise<{
  success: boolean
  id?: string
  error?: string
}> {
  try {
    const { data, error } = await resend.emails.send({
      from: from || 'Aerial Shots Media <hello@aerialshots.media>',
      to,
      subject,
      html: html || text || '',
      text,
    })

    if (error) {
      console.error('Failed to send email:', error)
      return {
        success: false,
        error: error.message,
      }
    }

    return {
      success: true,
      id: data?.id,
    }
  } catch (error) {
    console.error('Error sending email:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email',
    }
  }
}
