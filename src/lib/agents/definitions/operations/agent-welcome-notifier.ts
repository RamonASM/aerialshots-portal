// Agent Welcome Notifier
// Sends personalized welcome emails to new agents when they sign up

import { registerAgent } from '../../registry'
import { generateWithAI } from '@/lib/ai/client'
import type { AgentExecutionContext, AgentExecutionResult } from '../../types'
import { resend } from '@/lib/email/resend'
import { createAdminClient } from '@/lib/supabase/admin'

interface WelcomeInput {
  agentId: string
  agentEmail?: string
  agentName?: string
  referredBy?: string
}

const WELCOME_PROMPT = `You are a friendly customer success specialist at Aerial Shots Media, a real estate photography company.

Your task is to write a warm, personalized welcome message for a new real estate agent who just signed up.

Guidelines:
- Be warm and welcoming, not salesy
- Keep it concise (2-3 short paragraphs)
- Mention 1-2 key benefits of our service
- Include a clear next step
- Sound human, not robotic

Return a JSON object with:
{
  "subject": "Email subject line",
  "greeting": "Personal greeting",
  "body": "Main message body",
  "nextStep": "Clear call-to-action",
  "signature": "Friendly sign-off"
}`

/**
 * Generate personalized welcome content using AI
 */
async function generateWelcomeContent(
  agentName: string,
  referredBy?: string
): Promise<{ content: { subject: string; greeting: string; body: string; nextStep: string; signature: string }; tokensUsed: number }> {
  const prompt = `${WELCOME_PROMPT}

Agent Details:
- Name: ${agentName}
${referredBy ? `- Referred by: ${referredBy}` : '- Found us directly'}

Generate a personalized welcome message. If they were referred, acknowledge that connection warmly.`

  try {
    const response = await generateWithAI({
      prompt,
      maxTokens: 500,
      temperature: 0.7,
    })

    const jsonMatch = response.content.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return { content: parsed, tokensUsed: response.tokensUsed }
    }
  } catch (error) {
    console.error('Failed to generate welcome content:', error)
  }

  // Fallback content
  return {
    content: {
      subject: `Welcome to Aerial Shots Media, ${agentName.split(' ')[0]}!`,
      greeting: `Hi ${agentName.split(' ')[0]},`,
      body: `Welcome to Aerial Shots Media! We're thrilled to have you join our community of top-performing real estate agents.

Our team specializes in stunning aerial photography, professional video tours, and virtual staging that helps listings stand out and sell faster. We've helped hundreds of agents across Central Florida elevate their marketing.`,
      nextStep: `Ready to book your first shoot? Simply reply to this email or visit your dashboard to get started. We typically have availability within 24-48 hours.`,
      signature: `Looking forward to working with you!\n\nThe Aerial Shots Media Team`,
    },
    tokensUsed: 0,
  }
}

/**
 * Format the welcome email HTML
 */
function formatWelcomeEmail(content: {
  greeting: string
  body: string
  nextStep: string
  signature: string
}): string {
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
      <p style="color: #636366; font-size: 14px; margin: 8px 0 0;">Professional Real Estate Photography</p>
    </div>

    <div style="margin-bottom: 24px;">
      <p style="color: #171717; font-size: 16px; font-weight: 600; margin: 0 0 16px;">${content.greeting}</p>
      <p style="color: #525252; font-size: 15px; line-height: 1.6; margin: 0; white-space: pre-line;">${content.body}</p>
    </div>

    <div style="background: #f0f9ff; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
      <p style="color: #0369a1; font-size: 15px; line-height: 1.6; margin: 0;">${content.nextStep}</p>
    </div>

    <div style="text-align: center; margin-bottom: 24px;">
      <a href="https://portal.aerialshots.media/dashboard" style="display: inline-block; background: #3b82f6; color: white; font-size: 14px; font-weight: 600; text-decoration: none; padding: 12px 28px; border-radius: 8px;">
        Go to Dashboard
      </a>
    </div>

    <div style="border-top: 1px solid #e5e5e5; padding-top: 24px;">
      <p style="color: #525252; font-size: 14px; line-height: 1.6; margin: 0; white-space: pre-line;">${content.signature}</p>
    </div>

    <div style="margin-top: 32px; text-align: center;">
      <p style="color: #a3a3a3; font-size: 12px; margin: 0;">
        Questions? Reply to this email or call <a href="tel:+14077745070" style="color: #3b82f6;">(407) 774-5070</a>
      </p>
    </div>
  </div>
</body>
</html>
`
}

/**
 * Main agent execution function
 */
async function execute(context: AgentExecutionContext): Promise<AgentExecutionResult> {
  const { input } = context
  const welcomeInput = input as unknown as WelcomeInput

  if (!welcomeInput.agentId) {
    return {
      success: false,
      error: 'agentId is required',
      errorCode: 'MISSING_AGENT_ID',
    }
  }

  const supabase = createAdminClient()

  try {
    // Fetch agent data if not provided
    let agentEmail = welcomeInput.agentEmail
    let agentName = welcomeInput.agentName
    let referredBy = welcomeInput.referredBy

    if (!agentEmail || !agentName) {
      const { data: agent, error } = await supabase
        .from('agents')
        .select('name, email')
        .eq('id', welcomeInput.agentId)
        .single()

      if (error || !agent) {
        return {
          success: false,
          error: 'Agent not found',
          errorCode: 'AGENT_NOT_FOUND',
        }
      }

      agentEmail = agentEmail || agent.email
      agentName = agentName || agent.name
    }

    if (!agentEmail) {
      return {
        success: false,
        error: 'Agent email is required',
        errorCode: 'NO_EMAIL',
      }
    }

    // Generate personalized welcome content
    // Note: referredBy can be passed in input if available from referral system
    const { content, tokensUsed } = await generateWelcomeContent(
      agentName || 'there',
      referredBy // Will be undefined if not passed in input
    )

    // Format email
    const emailHtml = formatWelcomeEmail(content)

    // Send the email
    let emailSent = false
    let emailError: string | null = null

    try {
      const result = await resend.emails.send({
        from: 'Aerial Shots Media <welcome@aerialshots.media>',
        to: agentEmail,
        subject: content.subject,
        html: emailHtml,
        replyTo: 'support@aerialshots.media',
      })

      if (result.error) {
        emailError = result.error.message
      } else {
        emailSent = true
      }
    } catch (error) {
      emailError = error instanceof Error ? error.message : 'Email send failed'
    }

    // Log notification
    try {
      await supabase.from('notification_logs').insert({
        notification_type: 'welcome',
        channel: 'email',
        recipient_type: 'agent',
        recipient_email: agentEmail,
        subject: content.subject,
        status: emailSent ? 'sent' : 'failed',
        error_message: emailError,
        sent_at: emailSent ? new Date().toISOString() : null,
        metadata: {
          recipient_name: agentName,
          agentId: welcomeInput.agentId,
          referredBy: referredBy || null,
        },
      })
    } catch (logError) {
      console.error('Failed to log notification:', logError)
    }

    return {
      success: true,
      output: {
        agentId: welcomeInput.agentId,
        agentEmail,
        subject: content.subject,
        emailSent,
        emailError,
        referredBy: referredBy || null,
      },
      tokensUsed,
    }
  } catch (error) {
    console.error('Welcome notifier error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Welcome notification failed',
      errorCode: 'WELCOME_ERROR',
    }
  }
}

// Register the agent
registerAgent({
  slug: 'agent-welcome-notifier',
  name: 'Agent Welcome Notifier',
  description: 'Sends personalized welcome emails to new agents when they sign up',
  category: 'operations',
  executionMode: 'triggered',
  systemPrompt: WELCOME_PROMPT,
  config: {
    maxTokens: 500,
    temperature: 0.7,
  },
  execute,
})
