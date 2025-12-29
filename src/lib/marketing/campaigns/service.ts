/**
 * Marketing Campaign Service
 *
 * Handles bulk email campaign creation, sending, and tracking.
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/notifications/email'
import { apiLogger, formatError } from '@/lib/logger'
import type {
  Campaign,
  CampaignRecipient,
  CampaignStats,
  CreateCampaignRequest,
  RecipientFilter,
  SegmentCriteria,
  SendCampaignOptions,
} from './types'

const DEFAULT_BATCH_SIZE = 100
const DEFAULT_BATCH_DELAY_MS = 1000

/**
 * Create a new campaign
 */
export async function createCampaign(
  request: CreateCampaignRequest,
  createdBy: string
): Promise<Campaign> {
  const supabase = createAdminClient()

  // Estimate recipient count
  const recipientCount = await estimateRecipientCount(
    request.recipient_filter,
    request.recipient_segment_id,
    request.recipient_list
  )

  // Note: Some columns may not be in generated types yet - casting to bypass strict type checking
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: campaign, error } = await (supabase as any)
    .from('marketing_campaigns')
    .insert({
      name: request.name,
      subject: request.subject,
      body: request.html_content || '', // Required field
      preview_text: request.preview_text,
      status: request.scheduled_for ? 'scheduled' : 'draft',
      html_content: request.html_content,
      text_content: request.text_content,
      recipient_filter: request.recipient_filter,
      recipient_segment_id: request.recipient_segment_id,
      recipient_list: request.recipient_list,
      total_recipients: recipientCount,
      scheduled_for: request.scheduled_for,
      created_by: createdBy,
    })
    .select()
    .single()

  if (error) {
    apiLogger.error({ error: formatError(error) }, 'Failed to create campaign')
    throw new Error('Failed to create campaign')
  }

  apiLogger.info({
    campaignId: campaign.id,
    name: request.name,
    recipientCount,
  }, 'Campaign created')

  return campaign as Campaign
}

/**
 * Estimate recipient count for a filter
 */
export async function estimateRecipientCount(
  filter: RecipientFilter,
  segmentId?: string,
  customList?: string[]
): Promise<number> {
  if (customList?.length) {
    return customList.length
  }

  const supabase = createAdminClient()

  switch (filter) {
    case 'all_agents': {
      const { count } = await supabase
        .from('agents')
        .select('id', { count: 'exact', head: true })
        .not('email', 'is', null)
      return count || 0
    }

    case 'active_agents': {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      const { count } = await supabase
        .from('agents')
        .select('id', { count: 'exact', head: true })
        .not('email', 'is', null)
        .gte('last_order_at', thirtyDaysAgo)
      return count || 0
    }

    case 'inactive_agents': {
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
      const { count } = await supabase
        .from('agents')
        .select('id', { count: 'exact', head: true })
        .not('email', 'is', null)
        .or(`last_order_at.lt.${ninetyDaysAgo},last_order_at.is.null`)
      return count || 0
    }

    case 'new_agents': {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      const { count } = await supabase
        .from('agents')
        .select('id', { count: 'exact', head: true })
        .not('email', 'is', null)
        .gte('created_at', thirtyDaysAgo)
      return count || 0
    }

    case 'top_clients': {
      // Top 10% by order count
      const { count: total } = await supabase
        .from('agents')
        .select('id', { count: 'exact', head: true })
        .not('email', 'is', null)
      return Math.ceil((total || 0) * 0.1)
    }

    case 'segment': {
      if (!segmentId) return 0
      // Would query based on segment criteria
      return 0 // Placeholder
    }

    default:
      return 0
  }
}

/**
 * Get recipients for a campaign filter
 */
export async function getCampaignRecipients(
  filter: RecipientFilter,
  segmentId?: string,
  customList?: string[]
): Promise<Array<{ email: string; name?: string; agent_id?: string }>> {
  const supabase = createAdminClient()

  if (customList?.length) {
    return customList.map(email => ({ email }))
  }

  let query = supabase
    .from('agents')
    .select('id, email, name')
    .not('email', 'is', null)
    .eq('email_opt_out', false)

  switch (filter) {
    case 'active_agents': {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      query = query.gte('last_order_at', thirtyDaysAgo)
      break
    }

    case 'inactive_agents': {
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
      query = query.or(`last_order_at.lt.${ninetyDaysAgo},last_order_at.is.null`)
      break
    }

    case 'new_agents': {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      query = query.gte('created_at', thirtyDaysAgo)
      break
    }

    case 'top_clients': {
      query = query.order('total_orders', { ascending: false }).limit(100)
      break
    }
  }

  const { data, error } = await query

  if (error) {
    apiLogger.error({ error: formatError(error), filter }, 'Failed to get campaign recipients')
    return []
  }

  return (data || []).map(agent => ({
    email: agent.email!,
    name: agent.name,
    agent_id: agent.id,
  }))
}

/**
 * Send a campaign
 */
export async function sendCampaign(options: SendCampaignOptions): Promise<{
  success: boolean
  sentCount: number
  failedCount: number
  errors: string[]
}> {
  const supabase = createAdminClient()
  const batchSize = options.batchSize || DEFAULT_BATCH_SIZE
  const batchDelay = options.delayBetweenBatchesMs || DEFAULT_BATCH_DELAY_MS

  // Get campaign
  const { data: campaign, error: campaignError } = await supabase
    .from('marketing_campaigns')
    .select('*')
    .eq('id', options.campaignId)
    .single()

  if (campaignError || !campaign) {
    return { success: false, sentCount: 0, failedCount: 0, errors: ['Campaign not found'] }
  }

  // Test mode - only send to test emails
  if (options.testMode && options.testEmails?.length) {
    const testResults = await sendToRecipients(
      campaign as unknown as Campaign,
      options.testEmails.map(email => ({ email })),
      true
    )
    return { success: testResults.failedCount === 0, ...testResults }
  }

  // Update campaign status to sending
  await supabase
    .from('marketing_campaigns')
    .update({ status: 'sending', sent_at: new Date().toISOString() })
    .eq('id', options.campaignId)

  // Get all recipients
  // Note: recipient_segment_id and recipient_list may not exist in generated types
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const campaignData = campaign as any
  const recipients = await getCampaignRecipients(
    campaign.recipient_filter as RecipientFilter,
    campaignData.recipient_segment_id,
    campaignData.recipient_list
  )

  let sentCount = 0
  let failedCount = 0
  const errors: string[] = []

  // Process in batches
  for (let i = 0; i < recipients.length; i += batchSize) {
    const batch = recipients.slice(i, i + batchSize)

    const batchResults = await sendToRecipients(campaign as unknown as Campaign, batch, false)
    sentCount += batchResults.sentCount
    failedCount += batchResults.failedCount
    errors.push(...batchResults.errors)

    // Update progress
    await supabase
      .from('marketing_campaigns')
      .update({
        sent_count: sentCount,
        updated_at: new Date().toISOString(),
      })
      .eq('id', options.campaignId)

    // Delay between batches to avoid rate limits
    if (i + batchSize < recipients.length) {
      await new Promise(resolve => setTimeout(resolve, batchDelay))
    }
  }

  // Update final status
  // Note: 'failed' is not in the schema status enum, use 'cancelled' as fallback
  await supabase
    .from('marketing_campaigns')
    .update({
      status: failedCount === recipients.length ? 'cancelled' : 'sent',
      sent_count: sentCount,
      completed_at: new Date().toISOString(),
    })
    .eq('id', options.campaignId)

  apiLogger.info({
    campaignId: options.campaignId,
    sentCount,
    failedCount,
    totalRecipients: recipients.length,
  }, 'Campaign send completed')

  return {
    success: failedCount < recipients.length,
    sentCount,
    failedCount,
    errors: errors.slice(0, 10), // Limit errors returned
  }
}

/**
 * Send emails to a batch of recipients
 */
async function sendToRecipients(
  campaign: Campaign,
  recipients: Array<{ email: string; name?: string; agent_id?: string }>,
  isTest: boolean
): Promise<{ sentCount: number; failedCount: number; errors: string[] }> {
  const supabase = createAdminClient()
  let sentCount = 0
  let failedCount = 0
  const errors: string[] = []

  for (const recipient of recipients) {
    try {
      // Personalize content
      const personalizedHtml = personalizeContent(campaign.html_content, recipient)
      const personalizedText = campaign.text_content
        ? personalizeContent(campaign.text_content, recipient)
        : undefined

      // Send email
      const result = await sendEmail({
        to: recipient.email,
        subject: isTest ? `[TEST] ${campaign.subject}` : campaign.subject,
        html: personalizedHtml,
        text: personalizedText,
      })

      if (result.success) {
        sentCount++

        // Track recipient
        if (!isTest) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase as any).from('campaign_recipients').insert({
            campaign_id: campaign.id,
            email: recipient.email,
            name: recipient.name,
            agent_id: recipient.agent_id,
            status: 'sent',
            sent_at: new Date().toISOString(),
            resend_message_id: result.messageId,
          })
        }
      } else {
        failedCount++
        errors.push(`${recipient.email}: ${result.error}`)

        if (!isTest) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase as any).from('campaign_recipients').insert({
            campaign_id: campaign.id,
            email: recipient.email,
            name: recipient.name,
            agent_id: recipient.agent_id,
            status: 'bounced',
            error_message: result.error,
          })
        }
      }
    } catch (error) {
      failedCount++
      errors.push(`${recipient.email}: ${formatError(error)}`)
    }
  }

  return { sentCount, failedCount, errors }
}

/**
 * Personalize email content with recipient data
 */
function personalizeContent(
  content: string,
  recipient: { email: string; name?: string }
): string {
  let personalized = content

  // Replace common placeholders
  personalized = personalized.replace(/\{\{name\}\}/gi, recipient.name || 'there')
  personalized = personalized.replace(/\{\{firstName\}\}/gi,
    recipient.name?.split(' ')[0] || 'there'
  )
  personalized = personalized.replace(/\{\{email\}\}/gi, recipient.email)

  // Add unsubscribe link
  const unsubscribeUrl = `${process.env.NEXT_PUBLIC_APP_URL}/unsubscribe?email=${encodeURIComponent(recipient.email)}`
  personalized = personalized.replace(/\{\{unsubscribeUrl\}\}/gi, unsubscribeUrl)

  return personalized
}

/**
 * Get campaign statistics
 */
export async function getCampaignStats(campaignId: string): Promise<CampaignStats | null> {
  const supabase = createAdminClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: recipients, error } = await (supabase as any)
    .from('campaign_recipients')
    .select('status')
    .eq('campaign_id', campaignId)

  if (error || !recipients) {
    return null
  }

  const total = recipients.length
  const sent = recipients.filter((r: { status: string }) => r.status !== 'pending').length
  const delivered = recipients.filter((r: { status: string }) => ['delivered', 'opened', 'clicked'].includes(r.status)).length
  const opened = recipients.filter((r: { status: string }) => ['opened', 'clicked'].includes(r.status)).length
  const clicked = recipients.filter((r: { status: string }) => r.status === 'clicked').length
  const bounced = recipients.filter((r: { status: string }) => r.status === 'bounced').length
  const unsubscribed = recipients.filter((r: { status: string }) => r.status === 'unsubscribed').length

  return {
    total_recipients: total,
    sent,
    delivered,
    opened,
    clicked,
    bounced,
    unsubscribed,
    open_rate: delivered > 0 ? (opened / delivered) * 100 : 0,
    click_rate: opened > 0 ? (clicked / opened) * 100 : 0,
    bounce_rate: sent > 0 ? (bounced / sent) * 100 : 0,
  }
}

/**
 * Schedule a campaign to be sent later
 */
export async function scheduleCampaign(
  campaignId: string,
  scheduledFor: string
): Promise<void> {
  const supabase = createAdminClient()

  await supabase
    .from('marketing_campaigns')
    .update({
      status: 'scheduled',
      scheduled_for: scheduledFor,
      updated_at: new Date().toISOString(),
    })
    .eq('id', campaignId)

  apiLogger.info({ campaignId, scheduledFor }, 'Campaign scheduled')
}

/**
 * Cancel a campaign
 */
export async function cancelCampaign(campaignId: string): Promise<void> {
  const supabase = createAdminClient()

  await supabase
    .from('marketing_campaigns')
    .update({
      status: 'cancelled',
      updated_at: new Date().toISOString(),
    })
    .eq('id', campaignId)
    .in('status', ['draft', 'scheduled'])

  apiLogger.info({ campaignId }, 'Campaign cancelled')
}
