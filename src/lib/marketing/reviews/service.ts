/**
 * Review Request Service
 *
 * Manages automated review request scheduling and sending
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email/resend'
import { sendNotification } from '@/lib/notifications'

// Types
export interface ReviewRequest {
  id: string
  agent_id: string
  listing_id?: string
  order_id?: string
  platform: 'google' | 'facebook' | 'yelp' | 'trustpilot'
  review_url: string
  status: 'pending' | 'sent' | 'clicked' | 'completed' | 'cancelled' | 'bounced'
  scheduled_for: string
  sent_at?: string
  clicked_at?: string
  completed_at?: string
  email_sent: boolean
  sms_sent: boolean
  email_id?: string
  tracking_token: string
  created_at: string
}

export interface ReviewRequestTemplate {
  id: string
  name: string
  platform: string
  channel: 'email' | 'sms' | 'both'
  subject?: string
  email_body?: string
  sms_body?: string
  is_active: boolean
  is_default: boolean
}

export interface ReviewRequestSettings {
  id: string
  delay_after_delivery_ms: number
  send_time_start: string
  send_time_end: string
  max_requests_per_agent_per_month: number
  min_days_between_requests: number
  default_channel: 'email' | 'sms' | 'both'
  primary_platform: 'google' | 'facebook' | 'yelp' | 'trustpilot'
  google_review_url?: string
  facebook_review_url?: string
  yelp_review_url?: string
  trustpilot_review_url?: string
  is_enabled: boolean
}

/**
 * Get review request settings
 */
export async function getReviewSettings(): Promise<ReviewRequestSettings | null> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from('review_request_settings' as any)
    .select('*')
    .limit(1)
    .single()
    .returns<ReviewRequestSettings>()

  if (error) {
    console.error('Error fetching review settings:', error)
    return null
  }

  return data
}

/**
 * Get default template for a platform
 */
export async function getDefaultTemplate(
  platform: string,
  channel: 'email' | 'sms' | 'both'
): Promise<ReviewRequestTemplate | null> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from('review_request_templates' as any)
    .select('*')
    .or(`platform.eq.${platform},platform.eq.all`)
    .eq('channel', channel)
    .eq('is_active', true)
    .order('is_default', { ascending: false })
    .limit(1)
    .single()
    .returns<ReviewRequestTemplate>()

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching review template:', error)
  }

  return data || null
}

/**
 * Check if agent can receive a review request
 */
export async function canRequestReview(agentId: string): Promise<boolean> {
  const supabase = createAdminClient()
  const settings = await getReviewSettings()

  if (!settings?.is_enabled) return false

  // Check monthly limit
  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)

  const { count: monthlyCount } = await supabase
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from('review_requests' as any)
    .select('*', { count: 'exact', head: true })
    .eq('agent_id', agentId)
    .gte('created_at', monthStart.toISOString())

  if ((monthlyCount || 0) >= settings.max_requests_per_agent_per_month) {
    return false
  }

  // Check min days between requests
  const minDate = new Date()
  minDate.setDate(minDate.getDate() - settings.min_days_between_requests)

  const { data: recentRequest } = await supabase
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from('review_requests' as any)
    .select('id')
    .eq('agent_id', agentId)
    .gte('created_at', minDate.toISOString())
    .limit(1)
    .single()
    .returns<{ id: string }>()

  if (recentRequest) {
    return false
  }

  return true
}

/**
 * Schedule a review request for an agent
 */
export async function scheduleReviewRequest(
  agentId: string,
  listingId?: string,
  orderId?: string
): Promise<ReviewRequest | null> {
  const supabase = createAdminClient()

  // Check if can request
  if (!(await canRequestReview(agentId))) {
    console.log(`Review request skipped for agent ${agentId} - limits reached`)
    return null
  }

  const settings = await getReviewSettings()
  if (!settings) return null

  // Get review URL for primary platform
  let reviewUrl = ''
  switch (settings.primary_platform) {
    case 'google':
      reviewUrl = settings.google_review_url || ''
      break
    case 'facebook':
      reviewUrl = settings.facebook_review_url || ''
      break
    case 'yelp':
      reviewUrl = settings.yelp_review_url || ''
      break
    case 'trustpilot':
      reviewUrl = settings.trustpilot_review_url || ''
      break
  }

  if (!reviewUrl) {
    console.error(`No review URL configured for platform: ${settings.primary_platform}`)
    return null
  }

  // Calculate scheduled time
  const scheduledFor = new Date()
  scheduledFor.setTime(scheduledFor.getTime() + settings.delay_after_delivery_ms)

  // Adjust for send window (9am - 8pm)
  const startHour = parseInt(settings.send_time_start.split(':')[0])
  const endHour = parseInt(settings.send_time_end.split(':')[0])

  if (scheduledFor.getHours() < startHour) {
    scheduledFor.setHours(startHour, 0, 0, 0)
  } else if (scheduledFor.getHours() >= endHour) {
    // Schedule for next day
    scheduledFor.setDate(scheduledFor.getDate() + 1)
    scheduledFor.setHours(startHour, 0, 0, 0)
  }

  const { data, error } = await supabase
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from('review_requests' as any)
    .insert({
      agent_id: agentId,
      listing_id: listingId,
      order_id: orderId,
      platform: settings.primary_platform,
      review_url: reviewUrl,
      status: 'pending' as ReviewRequest['status'],
      scheduled_for: scheduledFor.toISOString(),
    })
    .select()
    .single()
    .returns<ReviewRequest>()

  if (error) {
    console.error('Error scheduling review request:', error)
    return null
  }

  return data
}

// Type for review request with joined agent data
export type ReviewRequestWithAgent = ReviewRequest & {
  agent: { id: string; name: string; email: string; phone?: string | null }
}

/**
 * Get pending review requests ready to send
 */
export async function getPendingRequests(): Promise<ReviewRequestWithAgent[]> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from('review_requests' as any)
    .select(`
      *,
      agent:agents(id, name, email, phone)
    `)
    .eq('status', 'pending')
    .lte('scheduled_for', new Date().toISOString())
    .order('scheduled_for', { ascending: true })
    .limit(50)
    .returns<ReviewRequestWithAgent[]>()

  if (error) {
    console.error('Error fetching pending review requests:', error)
    return []
  }

  return data || []
}

/**
 * Send a review request
 */
export async function sendReviewRequest(
  request: ReviewRequestWithAgent,
  listingAddress?: string
): Promise<boolean> {
  const supabase = createAdminClient()
  const settings = await getReviewSettings()
  if (!settings) return false

  const template = await getDefaultTemplate(request.platform, settings.default_channel)
  if (!template) {
    console.error(`No template found for ${request.platform}/${settings.default_channel}`)
    return false
  }

  // Track URL with token for click tracking
  const trackingUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/reviews/track/${request.tracking_token}`

  // Variable replacement
  const replaceVars = (text: string) =>
    text
      .replace(/{{agent_name}}/g, request.agent.name)
      .replace(/{{listing_address}}/g, listingAddress || 'your property')
      .replace(/{{review_url}}/g, trackingUrl)
      .replace(/{{company_name}}/g, 'Aerial Shots Media')

  let emailSent = false
  let smsSent = false
  let emailId = ''

  // Send email
  if (template.channel === 'email' || template.channel === 'both') {
    if (template.email_body && template.subject) {
      try {
        const result = await sendEmail({
          to: request.agent.email,
          subject: replaceVars(template.subject),
          html: `<div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto;">
            ${replaceVars(template.email_body).replace(/\n/g, '<br>')}
          </div>`,
        })
        emailSent = true
        emailId = result?.id || ''
      } catch (error) {
        console.error('Error sending review email:', error)
      }
    }
  }

  // Send SMS
  if (template.channel === 'sms' || template.channel === 'both') {
    if (template.sms_body && request.agent.phone) {
      try {
        await sendNotification({
          type: 'review_request',
          recipient: { name: request.agent.name, phone: request.agent.phone },
          channel: 'sms',
          data: {
            agentName: request.agent.name,
            listingAddress: listingAddress || 'your property',
            reviewUrl: trackingUrl,
          },
        })
        smsSent = true
      } catch (error) {
        console.error('Error sending review SMS:', error)
      }
    }
  }

  // Update request status
  await supabase
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from('review_requests' as any)
    .update({
      status: (emailSent || smsSent ? 'sent' : 'bounced') as ReviewRequest['status'],
      sent_at: new Date().toISOString(),
      email_sent: emailSent,
      sms_sent: smsSent,
      email_id: emailId || null,
    })
    .eq('id', request.id)

  return emailSent || smsSent
}

/**
 * Track a review link click
 */
export async function trackReviewClick(trackingToken: string): Promise<string | null> {
  const supabase = createAdminClient()

  const { data: request, error } = await supabase
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from('review_requests' as any)
    .select('id, review_url, status')
    .eq('tracking_token', trackingToken)
    .single()
    .returns<{ id: string; review_url: string; status: ReviewRequest['status'] }>()

  if (error || !request) {
    return null
  }

  // Update click status if not already clicked
  if (request.status === 'sent') {
    await supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from('review_requests' as any)
      .update({
        status: 'clicked' as ReviewRequest['status'],
        clicked_at: new Date().toISOString(),
      })
      .eq('id', request.id)
  }

  return request.review_url
}

/**
 * Get review request stats
 */
export async function getReviewStats(): Promise<{
  total: number
  sent: number
  clicked: number
  completed: number
  clickRate: number
  completionRate: number
}> {
  const supabase = createAdminClient()

  // Get last 30 days
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const { data } = await supabase
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from('review_requests' as any)
    .select('status')
    .gte('created_at', thirtyDaysAgo.toISOString())
    .returns<Array<{ status: ReviewRequest['status'] }>>()

  const requests = data || []
  const total = requests.length
  const sent = requests.filter((r) => ['sent', 'clicked', 'completed'].includes(r.status)).length
  const clicked = requests.filter((r) => ['clicked', 'completed'].includes(r.status)).length
  const completed = requests.filter((r) => r.status === 'completed').length

  return {
    total,
    sent,
    clicked,
    completed,
    clickRate: sent > 0 ? Math.round((clicked / sent) * 100) : 0,
    completionRate: sent > 0 ? Math.round((completed / sent) * 100) : 0,
  }
}
