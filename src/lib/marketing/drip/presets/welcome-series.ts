/**
 * Welcome Email Series
 *
 * Automated drip campaign for new agents:
 * - Day 0: Welcome + Quick Start
 * - Day 1: Prep Guide
 * - Day 3: Marketing Tools Intro
 * - Day 7: Referral Program
 */

export interface DripEmail {
  day: number
  subject: string
  previewText: string
  html: string
}

export const WELCOME_SERIES_ID = 'welcome-series'
export const WELCOME_SERIES_NAME = 'New Agent Welcome Series'

/**
 * Get all emails in the welcome series
 */
export function getWelcomeSeriesEmails(data: {
  agentName: string
  agentFirstName?: string
  portalUrl?: string
  bookingUrl?: string
  referralCode?: string
}): DripEmail[] {
  const firstName = data.agentFirstName || data.agentName.split(' ')[0]
  const portalUrl = data.portalUrl || 'https://app.aerialshots.media'
  const bookingUrl = data.bookingUrl || 'https://app.aerialshots.media/book'
  const referralUrl = data.referralCode
    ? `${portalUrl}/ref/${data.referralCode}`
    : `${portalUrl}/dashboard/referrals`

  return [
    // Day 0: Welcome
    {
      day: 0,
      subject: `Welcome to Aerial Shots Media, ${firstName}!`,
      previewText: 'Your account is ready. Here\'s how to get started.',
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
  <div style="background: #000; border-radius: 12px; padding: 40px; color: white;">
    <h1 style="margin: 0 0 20px; font-size: 28px;">Welcome to Aerial Shots Media</h1>
    <p style="color: #a1a1a6; line-height: 1.6;">
      Hi ${firstName},
    </p>
    <p style="color: #a1a1a6; line-height: 1.6;">
      We're thrilled to have you on board! Your account is all set up and ready to go.
    </p>

    <div style="background: #1c1c1e; border-radius: 8px; padding: 20px; margin: 30px 0;">
      <h2 style="margin: 0 0 15px; font-size: 18px;">Quick Start Guide</h2>
      <ul style="color: #a1a1a6; padding-left: 20px; margin: 0;">
        <li style="margin-bottom: 10px;">Book your first shoot in under 2 minutes</li>
        <li style="margin-bottom: 10px;">Get same-day delivery on most orders</li>
        <li style="margin-bottom: 10px;">Access marketing tools and templates</li>
        <li style="margin-bottom: 10px;">Earn rewards with every booking</li>
      </ul>
    </div>

    <a href="${bookingUrl}" style="display: inline-block; background: #0077ff; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 500;">
      Book Your First Shoot
    </a>

    <p style="color: #8e8e93; margin-top: 30px; font-size: 14px;">
      Questions? Reply to this email or call us at (407) 555-0123.
    </p>
  </div>
</body>
</html>`,
    },

    // Day 1: Prep Guide
    {
      day: 1,
      subject: 'Prepare Your Property for Amazing Photos',
      previewText: 'Tips to get the best results from your photo shoot',
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
  <div style="background: #000; border-radius: 12px; padding: 40px; color: white;">
    <h1 style="margin: 0 0 20px; font-size: 24px;">Property Prep Guide</h1>
    <p style="color: #a1a1a6; line-height: 1.6;">
      Hi ${firstName},
    </p>
    <p style="color: #a1a1a6; line-height: 1.6;">
      Want to ensure your listing photos look their absolute best? Here's our quick prep checklist:
    </p>

    <div style="margin: 30px 0;">
      <div style="background: #1c1c1e; border-radius: 8px; padding: 20px; margin-bottom: 15px;">
        <h3 style="margin: 0 0 10px; font-size: 16px; color: #0077ff;">Before the Shoot</h3>
        <ul style="color: #a1a1a6; padding-left: 20px; margin: 0; font-size: 14px;">
          <li style="margin-bottom: 8px;">Clear countertops and declutter surfaces</li>
          <li style="margin-bottom: 8px;">Turn on all lights (including lamps)</li>
          <li style="margin-bottom: 8px;">Open blinds and curtains for natural light</li>
          <li style="margin-bottom: 8px;">Hide personal items and valuables</li>
          <li>Make beds and fluff pillows</li>
        </ul>
      </div>

      <div style="background: #1c1c1e; border-radius: 8px; padding: 20px; margin-bottom: 15px;">
        <h3 style="margin: 0 0 10px; font-size: 16px; color: #0077ff;">Exterior</h3>
        <ul style="color: #a1a1a6; padding-left: 20px; margin: 0; font-size: 14px;">
          <li style="margin-bottom: 8px;">Move cars from driveway (if possible)</li>
          <li style="margin-bottom: 8px;">Put away trash cans and hoses</li>
          <li>Mow lawn and trim bushes</li>
        </ul>
      </div>

      <div style="background: #1c1c1e; border-radius: 8px; padding: 20px;">
        <h3 style="margin: 0 0 10px; font-size: 16px; color: #0077ff;">For Drone Shots</h3>
        <ul style="color: #a1a1a6; padding-left: 20px; margin: 0; font-size: 14px;">
          <li style="margin-bottom: 8px;">Ensure pool is clean and covered is removed</li>
          <li>Weather permitting (no rain, low wind)</li>
        </ul>
      </div>
    </div>

    <p style="color: #8e8e93; font-size: 14px;">
      We'll send this guide to your sellers automatically before each shoot!
    </p>
  </div>
</body>
</html>`,
    },

    // Day 3: Marketing Tools
    {
      day: 3,
      subject: 'Level Up Your Listings with Marketing Tools',
      previewText: 'Free marketing templates and tools included with every order',
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
  <div style="background: #000; border-radius: 12px; padding: 40px; color: white;">
    <h1 style="margin: 0 0 20px; font-size: 24px;">Your Marketing Toolkit</h1>
    <p style="color: #a1a1a6; line-height: 1.6;">
      Hi ${firstName},
    </p>
    <p style="color: #a1a1a6; line-height: 1.6;">
      Did you know every order comes with free marketing materials? Here's what's included:
    </p>

    <div style="margin: 30px 0;">
      <div style="display: flex; gap: 15px; margin-bottom: 20px;">
        <div style="flex: 1; background: #1c1c1e; border-radius: 8px; padding: 20px; text-align: center;">
          <div style="font-size: 32px; margin-bottom: 10px;">📱</div>
          <h3 style="margin: 0 0 5px; font-size: 14px;">Social Posts</h3>
          <p style="color: #8e8e93; font-size: 12px; margin: 0;">Instagram & Facebook ready</p>
        </div>
        <div style="flex: 1; background: #1c1c1e; border-radius: 8px; padding: 20px; text-align: center;">
          <div style="font-size: 32px; margin-bottom: 10px;">🎬</div>
          <h3 style="margin: 0 0 5px; font-size: 14px;">Slideshow Videos</h3>
          <p style="color: #8e8e93; font-size: 12px; margin: 0;">Auto-generated from your photos</p>
        </div>
      </div>

      <div style="display: flex; gap: 15px;">
        <div style="flex: 1; background: #1c1c1e; border-radius: 8px; padding: 20px; text-align: center;">
          <div style="font-size: 32px; margin-bottom: 10px;">🌐</div>
          <h3 style="margin: 0 0 5px; font-size: 14px;">Property Website</h3>
          <p style="color: #8e8e93; font-size: 12px; margin: 0;">Branded landing page</p>
        </div>
        <div style="flex: 1; background: #1c1c1e; border-radius: 8px; padding: 20px; text-align: center;">
          <div style="font-size: 32px; margin-bottom: 10px;">📊</div>
          <h3 style="margin: 0 0 5px; font-size: 14px;">QR Flyers</h3>
          <p style="color: #8e8e93; font-size: 12px; margin: 0;">Print-ready marketing</p>
        </div>
      </div>
    </div>

    <a href="${portalUrl}/dashboard/storywork" style="display: inline-block; background: #0077ff; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 500;">
      Explore Marketing Tools
    </a>

    <p style="color: #8e8e93; margin-top: 30px; font-size: 14px;">
      All marketing materials are automatically generated after your shoot!
    </p>
  </div>
</body>
</html>`,
    },

    // Day 7: Referral Program
    {
      day: 7,
      subject: 'Earn $50 for Every Friend You Refer',
      previewText: 'Share the love and earn rewards with our referral program',
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
  <div style="background: #000; border-radius: 12px; padding: 40px; color: white;">
    <h1 style="margin: 0 0 20px; font-size: 24px;">Share the Love, Earn Rewards</h1>
    <p style="color: #a1a1a6; line-height: 1.6;">
      Hi ${firstName},
    </p>
    <p style="color: #a1a1a6; line-height: 1.6;">
      Know other agents who could use professional real estate media? Our referral program rewards you for spreading the word!
    </p>

    <div style="background: linear-gradient(135deg, #0077ff 0%, #0055cc 100%); border-radius: 12px; padding: 30px; margin: 30px 0; text-align: center;">
      <div style="font-size: 48px; font-weight: bold; margin-bottom: 10px;">$50</div>
      <p style="margin: 0; opacity: 0.9;">Credit for every new agent who books</p>
    </div>

    <div style="background: #1c1c1e; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
      <h3 style="margin: 0 0 15px; font-size: 16px;">How It Works</h3>
      <ol style="color: #a1a1a6; padding-left: 20px; margin: 0; font-size: 14px;">
        <li style="margin-bottom: 10px;">Share your unique referral link</li>
        <li style="margin-bottom: 10px;">Your friend signs up and books their first shoot</li>
        <li style="margin-bottom: 10px;">You both get $50 credit!</li>
      </ol>
    </div>

    <a href="${referralUrl}" style="display: inline-block; background: #0077ff; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 500;">
      Get Your Referral Link
    </a>

    <p style="color: #8e8e93; margin-top: 30px; font-size: 14px;">
      No limit on referrals - the more you share, the more you earn!
    </p>
  </div>
</body>
</html>`,
    },
  ]
}

/**
 * Get a specific email from the series by day
 */
export function getWelcomeEmail(
  day: number,
  data: {
    agentName: string
    agentFirstName?: string
    portalUrl?: string
    bookingUrl?: string
    referralCode?: string
  }
): DripEmail | null {
  const emails = getWelcomeSeriesEmails(data)
  return emails.find((e) => e.day === day) || null
}

/**
 * Get total number of emails in series
 */
export function getWelcomeSeriesLength(): number {
  return 4 // Day 0, 1, 3, 7
}

/**
 * Get the schedule (days) for all emails
 */
export function getWelcomeSeriesSchedule(): number[] {
  return [0, 1, 3, 7]
}

/**
 * Auto-enroll a new agent in the welcome series
 * Called when a new agent is created
 */
export async function autoEnrollNewAgent(agentId: string): Promise<boolean> {
  const { enrollContact } = await import('../service')

  // Use a fixed UUID for the welcome series campaign (from migration)
  const WELCOME_CAMPAIGN_ID = '00000000-0000-0000-0000-000000000001'

  const result = await enrollContact({
    campaign_id: WELCOME_CAMPAIGN_ID,
    contact_id: agentId,
    check_existing: true,
  })

  return result.success
}
