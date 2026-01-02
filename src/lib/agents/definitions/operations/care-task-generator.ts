// Care Task Generator Agent
// Auto-creates care tasks when media is delivered to an agent

import { registerAgent } from '../../registry'
import { generateWithAI } from '@/lib/ai/client'
import type { AgentExecutionContext, AgentExecutionResult } from '../../types'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'
import { resend } from '@/lib/email/resend'

interface CareTaskInput {
  listing_id: string
  agent_id?: string
  property_address?: string
  agent_name?: string
  beds?: number
  baths?: number
  sqft?: number
  delivered_at?: string
}

interface CallScriptOutput {
  greeting: string
  propertyMention: string
  qualityCheck: string
  reviewRequest: string
  closingStatement: string
  fullScript: string
}

const CARE_TASK_GENERATOR_PROMPT = `You are a customer care specialist for Aerial Shots Media, a real estate photography company.

Your task is to generate a personalized call script for our VA team to use when following up with agents after their media has been delivered.

The call should accomplish:
1. Check if media was received and looks good
2. Ask if they need any adjustments or have concerns
3. Gauge satisfaction level
4. Request a Google review if they're happy (trigger conditions below)

Review Request Trigger Conditions:
- ONLY ask if this is their 2nd+ order (repeat client)
- ONLY ask if they seem satisfied with the delivery
- Make the request natural and appreciative, not pushy

Call Script Format:
- Greeting: Warm, professional opening
- Property Mention: Reference the specific property
- Quality Check: Ask about media quality and satisfaction
- Review Request: Conditional - only for repeat, satisfied clients
- Closing: Thank them and offer support

Return a JSON object with:
{
  "greeting": "Opening statement",
  "propertyMention": "Property reference",
  "qualityCheck": "Quality check questions",
  "reviewRequest": "Review request (or empty if not applicable)",
  "closingStatement": "Closing statement",
  "fullScript": "Complete script as one flowing conversation"
}`

/**
 * Generate a personalized call script using AI
 */
async function generateCallScript(
  listing: {
    address: string
    beds?: number
    baths?: number
    sqft?: number
  },
  agent: {
    name: string
    orderCount: number
  }
): Promise<{ script: CallScriptOutput; tokensUsed: number }> {
  const propertyDetails = `${listing.beds || '?'} bed, ${listing.baths || '?'} bath${
    listing.sqft ? `, ${listing.sqft.toLocaleString()} sqft` : ''
  }`

  const prompt = `${CARE_TASK_GENERATOR_PROMPT}

Agent Details:
- Name: ${agent.name}
- Property: ${listing.address}
- Details: ${propertyDetails}
- Order Count: ${agent.orderCount} (${agent.orderCount > 1 ? 'Repeat client' : 'First order'})

Generate a natural, friendly call script. Keep it conversational and genuine.
${agent.orderCount > 1 ? 'This is a repeat client, so include the review request.' : 'First-time client - skip the review request.'}

Respond with ONLY valid JSON in the exact format specified above.`

  const response = await generateWithAI({
    prompt,
    maxTokens: 800,
    temperature: 0.7,
  })

  try {
    // Try to extract JSON from the response
    const jsonMatch = response.content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('No JSON found in AI response')
    }

    const parsed = JSON.parse(jsonMatch[0]) as CallScriptOutput
    return { script: parsed, tokensUsed: response.tokensUsed }
  } catch (error) {
    // Fallback script if AI parsing fails
    console.error('Failed to parse AI response, using fallback script:', error)
    return { script: generateFallbackScript(listing, agent), tokensUsed: response.tokensUsed }
  }
}

/**
 * Generate a fallback call script if AI fails
 */
function generateFallbackScript(
  listing: { address: string; beds?: number; baths?: number; sqft?: number },
  agent: { name: string; orderCount: number }
): CallScriptOutput {
  const propertyDetails = `${listing.beds || '?'} bed, ${listing.baths || '?'} bath property${
    listing.sqft ? ` (${listing.sqft.toLocaleString()} sqft)` : ''
  }`

  const greeting = `Hi ${agent.name}, this is calling from Aerial Shots Media. How are you today?`

  const propertyMention = `I'm following up on the media we delivered for your ${propertyDetails} at ${listing.address}.`

  const qualityCheck = `Have you had a chance to review the photos and videos? Did everything come through okay? Is there anything you'd like us to adjust or re-edit?`

  const reviewRequest = agent.orderCount > 1
    ? `We really appreciate working with you again! If you're happy with our service, would you mind leaving us a quick Google review? It helps other agents find us.`
    : ''

  const closingStatement = `Perfect! If anything comes up or you need any changes, just let us know. We're here to help. Thanks for choosing Aerial Shots Media!`

  const fullScript = [greeting, propertyMention, qualityCheck, reviewRequest, closingStatement]
    .filter(Boolean)
    .join('\n\n')

  return {
    greeting,
    propertyMention,
    qualityCheck,
    reviewRequest,
    closingStatement,
    fullScript,
  }
}

/**
 * Main agent execution function
 */
async function execute(
  context: AgentExecutionContext
): Promise<AgentExecutionResult> {
  const { input, supabase } = context
  const careInput = input as unknown as CareTaskInput

  if (!careInput.listing_id) {
    return {
      success: false,
      error: 'listing_id is required',
      errorCode: 'MISSING_LISTING_ID',
    }
  }

  try {
    const db = supabase as SupabaseClient<Database>

    // 1. Fetch listing details
    const { data: listing, error: listingError } = await db
      .from('listings')
      .select('id, agent_id, address, city, state, beds, baths, sqft, delivered_at')
      .eq('id', careInput.listing_id)
      .single()

    if (listingError || !listing) {
      return {
        success: false,
        error: `Listing not found: ${careInput.listing_id}`,
        errorCode: 'LISTING_NOT_FOUND',
      }
    }

    // 2. Fetch agent details
    const agentId = careInput.agent_id || listing.agent_id
    if (!agentId) {
      return {
        success: false,
        error: 'No agent associated with this listing',
        errorCode: 'NO_AGENT',
      }
    }

    const { data: agent, error: agentError } = await db
      .from('agents')
      .select('id, name, email, phone')
      .eq('id', agentId)
      .single()

    if (agentError || !agent) {
      return {
        success: false,
        error: `Agent not found: ${agentId}`,
        errorCode: 'AGENT_NOT_FOUND',
      }
    }

    // 3. Get order count for the agent (to determine if we should ask for review)
    const { count: orderCount, error: countError } = await db
      .from('listings')
      .select('id', { count: 'exact', head: true })
      .eq('agent_id', agentId)
      .eq('ops_status', 'delivered')

    if (countError) {
      console.error('Failed to get order count:', countError)
    }

    // 4. Generate personalized call script
    const { script: callScript, tokensUsed } = await generateCallScript(
      {
        address: `${listing.address}, ${listing.city || ''} ${listing.state || ''}`.trim(),
        beds: listing.beds || undefined,
        baths: listing.baths || undefined,
        sqft: listing.sqft || undefined,
      },
      {
        name: agent.name,
        orderCount: orderCount || 1,
      }
    )

    // 5. Create the care task
    const { data: careTask, error: taskError } = await db
      .from('care_tasks')
      .insert({
        agent_id: agentId,
        listing_id: listing.id,
        task_type: 'delivery_followup',
        status: 'pending',
        priority: 2, // Medium priority
        due_at: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(), // Due in 4 hours (Day 1 afternoon)
        notes: JSON.stringify({
          callScript,
          propertyAddress: listing.address,
          agentName: agent.name,
          agentPhone: agent.phone,
          agentEmail: agent.email,
          deliveredAt: listing.delivered_at,
          orderCount: orderCount || 1,
          isRepeatClient: (orderCount || 1) > 1,
        }),
      })
      .select()
      .single()

    if (taskError || !careTask) {
      return {
        success: false,
        error: `Failed to create care task: ${taskError?.message}`,
        errorCode: 'TASK_CREATION_FAILED',
      }
    }

    // 6. Send email notification to VA team
    let emailSent = false
    try {
      const dueTime = careTask.due_at
        ? new Date(careTask.due_at).toLocaleString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          })
        : 'ASAP'

      await resend.emails.send({
        from: 'Aerial Shots Media <notifications@aerialshots.media>',
        to: 'care@aerialshots.media', // VA team email
        subject: `New Care Task: Follow-up call for ${agent.name}`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1a1a1a; margin-bottom: 20px;">New Delivery Follow-up Task</h2>

            <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <p style="margin: 0 0 8px 0;"><strong>Agent:</strong> ${agent.name}</p>
              <p style="margin: 0 0 8px 0;"><strong>Phone:</strong> <a href="tel:${agent.phone}">${agent.phone || 'Not available'}</a></p>
              <p style="margin: 0 0 8px 0;"><strong>Property:</strong> ${listing.address}</p>
              <p style="margin: 0 0 8px 0;"><strong>Due:</strong> ${dueTime}</p>
              <p style="margin: 0;"><strong>Client Type:</strong> ${(orderCount || 1) > 1 ? '⭐ Repeat Client' : 'First Order'}</p>
            </div>

            <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; border-left: 4px solid #3b82f6;">
              <h3 style="color: #1e40af; margin: 0 0 12px 0;">Call Script</h3>
              <pre style="white-space: pre-wrap; font-family: inherit; margin: 0; color: #1e3a5f; line-height: 1.6;">${callScript.fullScript}</pre>
            </div>

            <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
              <a href="https://portal.aerialshots.media/admin/care/tasks/${careTask.id}" style="color: #3b82f6;">View in Admin Portal</a>
            </p>
          </div>
        `,
      })
      emailSent = true
    } catch (emailError) {
      console.error('Failed to send care task notification email:', emailError)
      // Don't fail the task creation if email fails
    }

    // 7. Return success with task details
    return {
      success: true,
      output: {
        taskId: careTask.id,
        agentName: agent.name,
        agentPhone: agent.phone,
        propertyAddress: listing.address,
        callScript,
        dueAt: careTask.due_at,
        isRepeatClient: (orderCount || 1) > 1,
        orderCount: orderCount || 1,
        emailSent,
      },
      tokensUsed,
    }
  } catch (error) {
    console.error('Care task generator error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      errorCode: 'EXECUTION_ERROR',
    }
  }
}

// Register the agent
registerAgent({
  slug: 'care-task-generator',
  name: 'Care Task Generator',
  description:
    'Auto-creates care tasks when media is delivered. Generates personalized call scripts for VA team to follow up with agents.',
  category: 'operations',
  executionMode: 'triggered',
  systemPrompt: CARE_TASK_GENERATOR_PROMPT,
  config: {
    maxTokens: 800,
    temperature: 0.7,
    timeout: 30000,
  },
  execute,
})
