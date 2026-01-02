// Delivery Notifier Agent
// Sends personalized delivery notifications to agents when their media is ready

import { registerAgent } from '../../registry'
import { generateWithAI } from '@/lib/ai/client'
import type { AgentExecutionContext, AgentExecutionResult } from '../../types'
import { getCategoryInfo } from '@/lib/queries/listings'
import { resend } from '@/lib/email/resend'
import { createAdminClient } from '@/lib/supabase/admin'

interface DeliveryNotificationInput {
  listingId: string
  // These can be provided directly OR fetched from database using listingId
  agentEmail?: string
  agentName?: string
  address?: string
  mediaCategories?: string[] // Array of category keys: ['mls', 'social_feed', 'video', etc.]
  deliveryUrl?: string
}

interface ResolvedNotificationData {
  listingId: string
  agentEmail: string
  agentName: string
  address: string
  mediaCategories: string[]
  deliveryUrl: string
}

/**
 * Fetch listing and agent data from database when not provided in input
 */
async function resolveNotificationData(
  input: DeliveryNotificationInput
): Promise<ResolvedNotificationData | null> {
  // If all data is provided, use it directly
  if (
    input.agentEmail &&
    input.agentName &&
    input.address &&
    input.mediaCategories?.length &&
    input.deliveryUrl
  ) {
    return {
      listingId: input.listingId,
      agentEmail: input.agentEmail,
      agentName: input.agentName,
      address: input.address,
      mediaCategories: input.mediaCategories,
      deliveryUrl: input.deliveryUrl,
    }
  }

  // Fetch missing data from database
  const supabase = createAdminClient()

  const { data: listing, error } = await supabase
    .from('listings')
    .select(`
      id,
      address,
      agent:agents (
        id,
        name,
        email
      )
    `)
    .eq('id', input.listingId)
    .single()

  if (error || !listing) {
    console.error('Failed to fetch listing data:', error)
    return null
  }

  // Get media categories from media_assets
  let mediaCategories = input.mediaCategories || []
  if (!mediaCategories.length) {
    const { data: assets } = await supabase
      .from('media_assets')
      .select('category')
      .eq('listing_id', input.listingId)
      .eq('qc_status', 'approved')

    if (assets?.length) {
      // Get unique categories
      mediaCategories = [...new Set(assets.map((a) => a.category).filter((c): c is string => Boolean(c)))]
    }

    // Fallback to default categories if none found
    if (!mediaCategories.length) {
      mediaCategories = ['mls', 'social_feed']
    }
  }

  const agent = listing.agent as { id: string; name: string; email: string } | null

  return {
    listingId: input.listingId,
    agentEmail: input.agentEmail || agent?.email || '',
    agentName: input.agentName || agent?.name || 'Valued Agent',
    address: input.address || listing.address || 'Your Property',
    mediaCategories,
    deliveryUrl:
      input.deliveryUrl ||
      `https://portal.aerialshots.media/delivery/${input.listingId}`,
  }
}

const DELIVERY_NOTIFIER_PROMPT = `You are a professional real estate media specialist who helps agents get the most value from their media.

Your task is to create personalized, contextual usage tips for each media category in a completed job.

Guidelines:
- Be conversational and helpful, not salesy
- Focus on practical, actionable advice
- Keep tips concise (1-2 sentences per category)
- Emphasize best practices and ROI
- Show enthusiasm about the quality and potential impact

For each media category provided, generate a personalized tip that:
1. Highlights the best use case for that media type
2. Provides specific platform or distribution advice
3. Mentions timing or sequencing suggestions when relevant

Return your response as a JSON object with a "tips" array containing objects with "category" and "tip" fields.`

/**
 * Generate personalized usage tips for each media category using AI
 */
async function generateMediaTips(
  categories: string[],
  address: string,
  config: { maxTokens?: number; temperature?: number }
): Promise<{ tips: Record<string, string>; tokensUsed: number }> {
  // Get base category info
  const categoryDetails = categories.map((cat) => {
    const info = getCategoryInfo(cat)
    return {
      category: cat,
      title: info.title,
      description: info.description,
      baseTip: info.tip,
    }
  })

  const prompt = `${DELIVERY_NOTIFIER_PROMPT}

Property Address: ${address}

Media Categories Delivered:
${categoryDetails.map((c) => `- ${c.title} (${c.category}): ${c.description}`).join('\n')}

Base tips for reference:
${categoryDetails.map((c) => `- ${c.category}: ${c.baseTip}`).join('\n')}

Generate personalized, contextual tips for each category. Make them feel tailored to this specific delivery.

Format your response as:
{
  "tips": [
    { "category": "mls", "tip": "Your personalized tip here" },
    { "category": "social_feed", "tip": "Your personalized tip here" }
  ]
}`

  try {
    const aiResponse = await generateWithAI({
      prompt,
      maxTokens: config.maxTokens || 1000,
      temperature: config.temperature || 0.7,
    })

    // Parse AI response
    const jsonMatch = aiResponse.content.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      const tipsMap: Record<string, string> = {}

      if (parsed.tips && Array.isArray(parsed.tips)) {
        for (const item of parsed.tips) {
          tipsMap[item.category] = item.tip
        }
      }

      return { tips: tipsMap, tokensUsed: aiResponse.tokensUsed }
    }

    // JSON parsing failed, return empty with tokens
    return { tips: {}, tokensUsed: aiResponse.tokensUsed }
  } catch (error) {
    console.error('Error generating AI tips:', error)
  }

  // Fallback to base tips if AI generation fails
  const fallbackTips: Record<string, string> = {}
  for (const cat of categoryDetails) {
    fallbackTips[cat.category] = cat.baseTip
  }
  return { tips: fallbackTips, tokensUsed: 0 }
}

/**
 * Format the notification email content
 */
function formatNotificationContent(
  input: DeliveryNotificationInput,
  tips: Record<string, string>
): {
  subject: string
  previewText: string
  bodyHtml: string
  bodyText: string
} {
  const subject = `Your media for ${input.address} is ready!`
  const previewText = `Download your professional real estate media package now`

  // Build tips section
  const tipsHtml = Object.entries(tips)
    .map(([category, tip]) => {
      const info = getCategoryInfo(category)
      return `
        <div style="margin-bottom: 20px; padding: 15px; background: #f8f9fa; border-left: 3px solid #0066cc;">
          <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #1a1a1a;">
            ${info.title}
          </h3>
          <p style="margin: 0; font-size: 14px; color: #4a5568; line-height: 1.5;">
            ${tip}
          </p>
        </div>
      `
    })
    .join('')

  const tipsText = Object.entries(tips)
    .map(([category, tip]) => {
      const info = getCategoryInfo(category)
      return `${info.title}\n${tip}\n`
    })
    .join('\n')

  const bodyHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #ffffff;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">

    <!-- Header -->
    <div style="text-align: center; margin-bottom: 40px;">
      <h1 style="margin: 0 0 16px 0; font-size: 28px; font-weight: 700; color: #1a1a1a;">
        Great News, ${input.agentName}!
      </h1>
      <p style="margin: 0; font-size: 18px; color: #4a5568;">
        Your professional media package for<br/>
        <strong style="color: #1a1a1a;">${input.address}</strong> is ready to download.
      </p>
    </div>

    <!-- Main Content -->
    <div style="margin-bottom: 40px;">
      <h2 style="margin: 0 0 20px 0; font-size: 20px; font-weight: 600; color: #1a1a1a;">
        How to Get the Most from Your Media
      </h2>

      ${tipsHtml}
    </div>

    <!-- CTA Button -->
    <div style="text-align: center; margin: 40px 0;">
      <a href="${input.deliveryUrl}" style="display: inline-block; padding: 16px 40px; background-color: #0066cc; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600;">
        View & Download Your Media
      </a>
    </div>

    <!-- Footer -->
    <div style="margin-top: 40px; padding-top: 30px; border-top: 1px solid #e2e8f0; text-align: center;">
      <p style="margin: 0 0 8px 0; font-size: 14px; color: #718096;">
        Questions? We're here to help.
      </p>
      <p style="margin: 0; font-size: 14px; color: #718096;">
        <a href="mailto:support@aerialshotsmedia.com" style="color: #0066cc; text-decoration: none;">
          support@aerialshotsmedia.com
        </a>
      </p>
    </div>

  </div>
</body>
</html>
`

  const bodyText = `
Great News, ${input.agentName}!

Your professional media package for ${input.address} is ready to download.

HOW TO GET THE MOST FROM YOUR MEDIA
-------------------------------------

${tipsText}

View & Download Your Media:
${input.deliveryUrl}

Questions? We're here to help.
Email: support@aerialshotsmedia.com
`

  return {
    subject,
    previewText,
    bodyHtml,
    bodyText,
  }
}

/**
 * Main agent execution function
 */
async function execute(
  context: AgentExecutionContext
): Promise<AgentExecutionResult> {
  const { input, config } = context

  try {
    // Validate and resolve input
    const rawInput = input as unknown as DeliveryNotificationInput

    if (!rawInput.listingId) {
      return {
        success: false,
        error: 'Missing required field: listingId',
        errorCode: 'INVALID_INPUT',
      }
    }

    // Resolve missing data from database
    const notificationInput = await resolveNotificationData(rawInput)

    if (!notificationInput) {
      return {
        success: false,
        error: 'Failed to resolve listing and agent data',
        errorCode: 'DATA_RESOLUTION_FAILED',
      }
    }

    if (!notificationInput.agentEmail) {
      return {
        success: false,
        error: 'Could not determine agent email address',
        errorCode: 'NO_AGENT_EMAIL',
      }
    }

    // Generate personalized tips using AI
    let tips: Record<string, string>
    let tokensUsed = 0

    try {
      const tipsResult = await generateMediaTips(
        notificationInput.mediaCategories,
        notificationInput.address,
        config
      )
      tips = tipsResult.tips
      tokensUsed = tipsResult.tokensUsed
    } catch (error) {
      console.error('Error generating tips, using fallback:', error)
      // Use fallback tips
      tips = {}
      for (const category of notificationInput.mediaCategories) {
        const info = getCategoryInfo(category)
        tips[category] = info.tip
      }
    }

    // Format notification content
    const notification = formatNotificationContent(notificationInput, tips)

    // Send the email via Resend
    let emailSent = false
    let emailSentAt: string | null = null
    let emailError: string | null = null

    try {
      const emailResult = await resend.emails.send({
        from: 'Aerial Shots Media <notifications@aerialshots.media>',
        to: notificationInput.agentEmail,
        subject: notification.subject,
        html: notification.bodyHtml,
        text: notification.bodyText,
        replyTo: 'support@aerialshots.media',
      })

      if (emailResult.error) {
        emailError = emailResult.error.message
        console.error('Email send error:', emailResult.error)
      } else {
        emailSent = true
        emailSentAt = new Date().toISOString()
      }
    } catch (error) {
      emailError = error instanceof Error ? error.message : 'Unknown email error'
      console.error('Failed to send delivery notification email:', error)
    }

    // Log to notification_logs table for tracking
    try {
      const supabase = createAdminClient()
      await supabase.from('notification_logs').insert({
        listing_id: notificationInput.listingId,
        notification_type: 'delivery_ready',
        channel: 'email',
        recipient_type: 'agent',
        recipient_email: notificationInput.agentEmail,
        subject: notification.subject,
        status: emailSent ? 'sent' : 'failed',
        error_message: emailError,
        sent_at: emailSentAt,
        metadata: {
          recipient_name: notificationInput.agentName,
          categories: notificationInput.mediaCategories,
          tips,
          deliveryUrl: notificationInput.deliveryUrl,
        },
      })
    } catch (logError) {
      // Don't fail the agent if logging fails
      console.error('Failed to log notification:', logError)
    }

    return {
      success: true,
      output: {
        listingId: notificationInput.listingId,
        agentEmail: notificationInput.agentEmail,
        categoriesNotified: notificationInput.mediaCategories,
        notification: {
          subject: notification.subject,
          previewText: notification.previewText,
          tips,
        },
        emailSent,
        emailSentAt,
        emailError,
      },
      tokensUsed,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Notification failed',
      errorCode: 'NOTIFICATION_ERROR',
    }
  }
}

// Register the agent
registerAgent({
  slug: 'delivery-notifier',
  name: 'Delivery Notifier',
  description: 'Sends personalized delivery notifications to agents when their media is ready',
  category: 'operations',
  executionMode: 'triggered',
  systemPrompt: DELIVERY_NOTIFIER_PROMPT,
  config: {
    maxTokens: 1000,
    temperature: 0.7,
  },
  execute,
})
