import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { resend } from '@/lib/email/resend'
import { apiLogger, formatError } from '@/lib/logger'
import { checkRateLimit, getRateLimitHeaders, createRateLimitKey } from '@/lib/utils/rate-limit'
import type { QuoteFormData } from '@/lib/pricing/quote-config'
import {
  PROPERTY_TYPES,
  SQFT_RANGES,
  TIMELINE_OPTIONS,
  PACKAGE_OPTIONS,
  ADDITIONAL_SERVICES,
  SOCIAL_PRESENCE_OPTIONS,
  CONTENT_GOALS,
  BUDGET_RANGES,
  TEAM_SIZE_OPTIONS,
  CHALLENGE_OPTIONS,
  REFERRAL_SOURCES,
} from '@/lib/pricing/quote-config'

// Zod schema for quote form validation
const QuoteFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200, 'Name is too long'),
  email: z.string().email('Invalid email address').max(254, 'Email is too long'),
  phone: z.string().min(10, 'Phone number must have at least 10 digits').max(20, 'Phone number is too long'),
  serviceType: z.enum(['listing', 'retainer'], { message: 'Service type is required' }),
  // Listing-specific fields
  propertyType: z.string().optional(),
  approximateSqft: z.string().optional(),
  propertyAddress: z.string().max(500).optional(),
  timeline: z.string().optional(),
  interestedPackage: z.string().optional(),
  additionalServices: z.array(z.string()).optional(),
  // Retainer-specific fields
  businessName: z.string().max(200).optional(),
  teamSize: z.string().optional(),
  currentSocialPresence: z.string().optional(),
  contentGoals: z.array(z.string()).optional(),
  biggestChallenge: z.string().optional(),
  monthlyBudget: z.string().optional(),
  howDidYouHear: z.string().optional(),
  // Common optional fields
  additionalNotes: z.string().max(2000, 'Additional notes are too long').optional(),
})

// Helper to get label from value
function getLabel(options: readonly { value: string; label: string }[], value?: string): string {
  if (!value) return 'Not specified'
  const opt = options.find((o) => o.value === value)
  return opt?.label || value
}

function getLabels(options: readonly { value: string; label: string }[], values?: string[]): string {
  if (!values || values.length === 0) return 'None selected'
  return values.map((v) => getLabel(options, v)).join(', ')
}

// Validate email format
function isValidEmail(email: string): boolean {
  // RFC 5322 compliant email regex (simplified but robust)
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
  if (!email || email.length > 254) return false
  return emailRegex.test(email)
}

// Sanitize string for HTML output (prevent XSS/injection)
function sanitizeHtml(str: string): string {
  if (!str) return ''
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

// Format phone number for display
function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
  }
  return sanitizeHtml(phone)
}

// Generate support email HTML
function generateSupportEmailHtml(data: QuoteFormData): string {
  const isListing = data.serviceType === 'listing'
  const serviceTypeLabel = isListing ? 'Listing Media' : 'Content Retainer'

  let detailsHtml = ''

  if (isListing) {
    detailsHtml = `
      <tr>
        <td style="padding: 8px 0; color: #737373; width: 140px;">Property Type:</td>
        <td style="padding: 8px 0; color: #171717; font-weight: 500;">${getLabel(PROPERTY_TYPES, data.propertyType)}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #737373;">Property Size:</td>
        <td style="padding: 8px 0; color: #171717; font-weight: 500;">${getLabel(SQFT_RANGES, data.approximateSqft)}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #737373;">Address:</td>
        <td style="padding: 8px 0; color: #171717; font-weight: 500;">${data.propertyAddress || 'Not provided'}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #737373;">Timeline:</td>
        <td style="padding: 8px 0; color: #171717; font-weight: 500;">${getLabel(TIMELINE_OPTIONS, data.timeline)}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #737373;">Package Interest:</td>
        <td style="padding: 8px 0; color: #171717; font-weight: 500;">${getLabel(PACKAGE_OPTIONS, data.interestedPackage)}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #737373;">Add-ons:</td>
        <td style="padding: 8px 0; color: #171717; font-weight: 500;">${getLabels(ADDITIONAL_SERVICES, data.additionalServices)}</td>
      </tr>
    `
  } else {
    detailsHtml = `
      <tr>
        <td style="padding: 8px 0; color: #737373; width: 160px;">Business Name:</td>
        <td style="padding: 8px 0; color: #171717; font-weight: 500;">${data.businessName || 'Not provided'}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #737373;">Team Size:</td>
        <td style="padding: 8px 0; color: #171717; font-weight: 500;">${getLabel(TEAM_SIZE_OPTIONS, data.teamSize)}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #737373;">Current Presence:</td>
        <td style="padding: 8px 0; color: #171717; font-weight: 500;">${getLabel(SOCIAL_PRESENCE_OPTIONS, data.currentSocialPresence)}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #737373;">Content Goals:</td>
        <td style="padding: 8px 0; color: #171717; font-weight: 500;">${getLabels(CONTENT_GOALS, data.contentGoals)}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #737373;">Biggest Challenge:</td>
        <td style="padding: 8px 0; color: #171717; font-weight: 500;">${getLabel(CHALLENGE_OPTIONS, data.biggestChallenge)}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #737373;">Monthly Budget:</td>
        <td style="padding: 8px 0; color: #171717; font-weight: 500;">${getLabel(BUDGET_RANGES, data.monthlyBudget)}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #737373;">Referral Source:</td>
        <td style="padding: 8px 0; color: #171717; font-weight: 500;">${getLabel(REFERRAL_SOURCES, data.howDidYouHear)}</td>
      </tr>
    `
  }

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
          <div style="background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%); padding: 24px; text-align: center;">
            <h1 style="color: white; font-size: 20px; margin: 0;">New Quote Request</h1>
            <p style="color: rgba(255,255,255,0.8); font-size: 14px; margin: 8px 0 0 0;">${serviceTypeLabel}</p>
          </div>

          <div style="padding: 24px;">
            <div style="background: #f8fafc; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
              <h2 style="color: #171717; font-size: 16px; margin: 0 0 12px 0;">Contact Information</h2>
              <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                <tr>
                  <td style="padding: 6px 0; color: #737373; width: 80px;">Name:</td>
                  <td style="padding: 6px 0; color: #171717; font-weight: 600;">${data.name}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #737373;">Email:</td>
                  <td style="padding: 6px 0;"><a href="mailto:${data.email}" style="color: #3b82f6; text-decoration: none;">${data.email}</a></td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #737373;">Phone:</td>
                  <td style="padding: 6px 0;"><a href="tel:${data.phone}" style="color: #3b82f6; text-decoration: none;">${formatPhone(data.phone)}</a></td>
                </tr>
              </table>
            </div>

            <div style="margin-bottom: 20px;">
              <h2 style="color: #171717; font-size: 16px; margin: 0 0 12px 0;">Request Details</h2>
              <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                ${detailsHtml}
              </table>
            </div>

            ${data.additionalNotes ? `
              <div style="background: #fffbeb; border: 1px solid #fcd34d; border-radius: 8px; padding: 16px;">
                <h3 style="color: #92400e; font-size: 14px; margin: 0 0 8px 0;">Additional Notes</h3>
                <p style="color: #78350f; font-size: 14px; margin: 0; white-space: pre-wrap;">${data.additionalNotes}</p>
              </div>
            ` : ''}
          </div>

          <div style="background: #f8fafc; padding: 16px 24px; text-align: center; border-top: 1px solid #e5e7eb;">
            <a href="mailto:${data.email}" style="display: inline-block; background: #3b82f6; color: white; padding: 10px 24px; border-radius: 6px; text-decoration: none; font-weight: 500; font-size: 14px; margin-right: 8px;">Reply to ${data.name.split(' ')[0]}</a>
            <a href="tel:${data.phone}" style="display: inline-block; background: #171717; color: white; padding: 10px 24px; border-radius: 6px; text-decoration: none; font-weight: 500; font-size: 14px;">Call Now</a>
          </div>
        </div>
      </body>
    </html>
  `
}

// Generate client confirmation email HTML
function generateClientEmailHtml(data: QuoteFormData): string {
  const isListing = data.serviceType === 'listing'
  const firstName = data.name.split(' ')[0]

  let summaryHtml = ''

  if (isListing) {
    summaryHtml = `
      <p style="color: #525252; font-size: 15px; line-height: 1.6; margin: 0 0 16px 0;">
        Here's a summary of your listing media request:
      </p>
      <ul style="color: #525252; font-size: 14px; line-height: 1.8; margin: 0 0 24px 0; padding-left: 20px;">
        <li><strong>Property:</strong> ${data.propertyAddress || 'Address to be confirmed'}</li>
        <li><strong>Size:</strong> ${getLabel(SQFT_RANGES, data.approximateSqft)}</li>
        <li><strong>Package:</strong> ${getLabel(PACKAGE_OPTIONS, data.interestedPackage)}</li>
        <li><strong>Timeline:</strong> ${getLabel(TIMELINE_OPTIONS, data.timeline)}</li>
        ${data.additionalServices?.length ? `<li><strong>Add-ons:</strong> ${getLabels(ADDITIONAL_SERVICES, data.additionalServices)}</li>` : ''}
      </ul>
    `
  } else {
    summaryHtml = `
      <p style="color: #525252; font-size: 15px; line-height: 1.6; margin: 0 0 16px 0;">
        Here's a summary of your content retainer inquiry:
      </p>
      <ul style="color: #525252; font-size: 14px; line-height: 1.8; margin: 0 0 24px 0; padding-left: 20px;">
        <li><strong>Business:</strong> ${data.businessName || 'To be confirmed'}</li>
        <li><strong>Team Size:</strong> ${getLabel(TEAM_SIZE_OPTIONS, data.teamSize)}</li>
        <li><strong>Goals:</strong> ${getLabels(CONTENT_GOALS, data.contentGoals)}</li>
        <li><strong>Budget Range:</strong> ${getLabel(BUDGET_RANGES, data.monthlyBudget)}</li>
      </ul>
    `
  }

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5; margin: 0; padding: 40px 20px;">
        <div style="max-width: 520px; margin: 0 auto; background: white; border-radius: 12px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
          <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="color: #171717; font-size: 24px; font-weight: 700; margin: 0;">Aerial Shots Media</h1>
          </div>

          <h2 style="color: #171717; font-size: 22px; font-weight: 600; margin: 0 0 16px 0;">
            Thanks for reaching out, ${firstName}!
          </h2>

          <p style="color: #525252; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">
            We've received your request and our team is already reviewing the details. You can expect to hear from us within 24 hours (usually much sooner!).
          </p>

          ${summaryHtml}

          <div style="background: #f0f9ff; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
            <h3 style="color: #0369a1; font-size: 14px; font-weight: 600; margin: 0 0 12px 0;">What happens next?</h3>
            <ol style="color: #0c4a6e; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
              <li>We'll review your specific needs</li>
              <li>A team member will reach out to discuss details</li>
              <li>We'll provide a custom quote tailored to your project</li>
            </ol>
          </div>

          <p style="color: #525252; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">
            In the meantime, feel free to check out our work and see why agents love working with us.
          </p>

          <div style="text-align: center; margin-bottom: 24px;">
            <a href="https://aerialshots.media" style="display: inline-block; background: #3b82f6; color: white; font-size: 14px; font-weight: 600; text-decoration: none; padding: 12px 28px; border-radius: 8px;">
              View Our Portfolio
            </a>
          </div>

          <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 32px 0;">

          <p style="color: #737373; font-size: 14px; line-height: 1.5; margin: 0; text-align: center;">
            Questions? Just reply to this email or call us at<br>
            <a href="tel:+14077745070" style="color: #3b82f6;">(407) 774-5070</a>
          </p>

          <p style="color: #a3a3a3; font-size: 12px; margin: 24px 0 0 0; text-align: center;">
            Aerial Shots Media · Orlando, Tampa, Central Florida
          </p>
        </div>
      </body>
    </html>
  `
}

// Rate limit: 3 quotes per IP per 30 minutes (prevents email spam)
const QUOTE_RATE_LIMIT = { limit: 3, windowSeconds: 1800 }

export async function POST(request: NextRequest) {
  try {
    // Rate limit by IP
    const forwardedFor = request.headers.get('x-forwarded-for')
    const clientIp = forwardedFor?.split(',')[0]?.trim() || 'unknown'

    const rateLimit = checkRateLimit(createRateLimitKey('quote', 'ip', clientIp), QUOTE_RATE_LIMIT)
    if (!rateLimit.allowed) {
      apiLogger.warn({ clientIp }, 'Quote submission rate limited')
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: getRateLimitHeaders(rateLimit) }
      )
    }

    const rawData = await request.json()

    // Validate with Zod schema
    const parseResult = QuoteFormSchema.safeParse(rawData)
    if (!parseResult.success) {
      const errors = parseResult.error.issues.map((e) => e.message).join(', ')
      apiLogger.warn({ errors, clientIp }, 'Quote validation failed')
      return NextResponse.json({ error: errors }, { status: 400 })
    }

    const data = parseResult.data

    // Additional phone validation (ensure enough digits)
    const phoneDigits = data.phone.replace(/\D/g, '')
    if (phoneDigits.length < 10) {
      return NextResponse.json(
        { error: 'Invalid phone number' },
        { status: 400 }
      )
    }

    // Sanitize all user inputs for HTML safety
    const sanitizedData = {
      ...data,
      name: sanitizeHtml(data.name),
      email: data.email.toLowerCase().trim(), // Email doesn't need HTML sanitization
      phone: data.phone, // Processed by formatPhone which sanitizes
      propertyAddress: data.propertyAddress ? sanitizeHtml(data.propertyAddress) : undefined,
      businessName: data.businessName ? sanitizeHtml(data.businessName) : undefined,
      additionalNotes: data.additionalNotes ? sanitizeHtml(data.additionalNotes) : undefined,
    }

    const serviceTypeLabel = sanitizedData.serviceType === 'listing' ? 'Listing Media' : 'Content Retainer'

    // Send email to support team (use sanitized data for HTML, validated email for addressing)
    const supportEmail = await resend.emails.send({
      from: 'Aerial Shots Media <noreply@aerialshots.media>',
      to: 'support@aerialshots.media',
      replyTo: sanitizedData.email,
      subject: `New Quote Request: ${serviceTypeLabel} - ${sanitizedData.name}`,
      html: generateSupportEmailHtml(sanitizedData as QuoteFormData),
    })

    if (supportEmail.error) {
      apiLogger.error({ error: formatError(supportEmail.error), email: sanitizedData.email }, 'Failed to send support email')
    }

    // Send confirmation email to client (use validated email)
    const clientEmail = await resend.emails.send({
      from: 'Aerial Shots Media <noreply@aerialshots.media>',
      to: sanitizedData.email,
      subject: `We received your request, ${sanitizedData.name.split(' ')[0]}!`,
      html: generateClientEmailHtml(sanitizedData as QuoteFormData),
    })

    if (clientEmail.error) {
      apiLogger.error({ error: formatError(clientEmail.error), email: sanitizedData.email }, 'Failed to send client confirmation email')
    }

    return NextResponse.json({
      success: true,
      message: 'Quote request submitted successfully',
    })
  } catch (error) {
    apiLogger.error({ error: formatError(error) }, 'Quote submission error')
    return NextResponse.json(
      { error: 'Failed to submit quote request' },
      { status: 500 }
    )
  }
}
