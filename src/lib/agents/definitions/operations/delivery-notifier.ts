// Delivery Notifier Agent
// Sends personalized delivery notifications to agents when their media is ready

import { registerAgent } from '../../registry'
import { generateWithAI } from '@/lib/ai/client'
import type { AgentExecutionContext, AgentExecutionResult } from '../../types'
import { getCategoryInfo } from '@/lib/queries/listings'

interface DeliveryNotificationInput {
  listingId: string
  agentEmail: string
  agentName: string
  address: string
  mediaCategories: string[] // Array of category keys: ['mls', 'social_feed', 'video', etc.]
  deliveryUrl: string
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
): Promise<Record<string, string>> {
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

      return tipsMap
    }
  } catch (error) {
    console.error('Error generating AI tips:', error)
  }

  // Fallback to base tips if AI generation fails
  const fallbackTips: Record<string, string> = {}
  for (const cat of categoryDetails) {
    fallbackTips[cat.category] = cat.baseTip
  }
  return fallbackTips
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
    // Validate input
    const notificationInput = input as unknown as DeliveryNotificationInput

    if (!notificationInput.listingId || !notificationInput.agentEmail) {
      return {
        success: false,
        error: 'Missing required fields: listingId and agentEmail',
        errorCode: 'INVALID_INPUT',
      }
    }

    if (!notificationInput.mediaCategories || notificationInput.mediaCategories.length === 0) {
      return {
        success: false,
        error: 'No media categories provided',
        errorCode: 'NO_MEDIA',
      }
    }

    // Generate personalized tips using AI
    let tips: Record<string, string>
    let tokensUsed = 0

    try {
      tips = await generateMediaTips(
        notificationInput.mediaCategories,
        notificationInput.address,
        config
      )

      // Note: In a production implementation, we'd get tokensUsed from the AI call
      tokensUsed = 500 // Placeholder for now
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

    // Log the notification (in production, this would integrate with email service)
    console.log('=== DELIVERY NOTIFICATION ===')
    console.log('To:', notificationInput.agentEmail)
    console.log('Subject:', notification.subject)
    console.log('Preview:', notification.previewText)
    console.log('\nGenerated Tips:')
    Object.entries(tips).forEach(([category, tip]) => {
      const info = getCategoryInfo(category)
      console.log(`\n${info.title} (${category}):`)
      console.log(tip)
    })
    console.log('\nDelivery URL:', notificationInput.deliveryUrl)
    console.log('=============================\n')

    // TODO: Integrate with email service (SendGrid, Resend, etc.)
    // Example:
    // await sendEmail({
    //   to: notificationInput.agentEmail,
    //   subject: notification.subject,
    //   html: notification.bodyHtml,
    //   text: notification.bodyText,
    // })

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
        // Set to true once email integration is complete
        emailSent: false,
        emailSentAt: null,
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
  executionMode: 'async',
  systemPrompt: DELIVERY_NOTIFIER_PROMPT,
  config: {
    maxTokens: 1000,
    temperature: 0.7,
  },
  execute,
})
