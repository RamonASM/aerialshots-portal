/**
 * Slack Integration Client
 *
 * Real-time notifications to Slack channels and order note sync
 */

import crypto from 'crypto'

// Types
export interface SlackMessage {
  channel: string
  text: string
  blocks?: SlackBlock[]
  thread_ts?: string
  unfurl_links?: boolean
  unfurl_media?: boolean
}

export interface SlackBlock {
  type: 'section' | 'divider' | 'actions' | 'context' | 'header' | 'image'
  text?: SlackText
  fields?: SlackText[]
  accessory?: SlackElement
  elements?: SlackElement[]
  block_id?: string
}

export interface SlackText {
  type: 'plain_text' | 'mrkdwn'
  text: string
  emoji?: boolean
}

export interface SlackElement {
  type: 'button' | 'image' | 'overflow' | 'datepicker' | 'static_select'
  text?: SlackText
  action_id?: string
  url?: string
  value?: string
  style?: 'primary' | 'danger'
  image_url?: string
  alt_text?: string
}

export interface SlackChannel {
  id: string
  name: string
  is_private?: boolean
  is_archived?: boolean
  topic?: { value: string }
}

export interface SlackNotification {
  type: 'new_order' | 'delivery_complete' | 'qc_alert' | 'photographer_assigned' | 'payment_received' | 'edit_request'
  channel: string
  data: Record<string, unknown>
}

export interface SlackWebhookPayload {
  type: string
  event?: Record<string, unknown>
  challenge?: string
  token?: string
}

export interface SlackCommandPayload {
  command: string
  text: string
  user_id: string
  channel_id: string
  response_url?: string
}

export interface ParsedCommand {
  command: string
  args: string[]
  user_id: string
  channel_id: string
}

export interface SlackResponse {
  ok: boolean
  error?: string
  ts?: string
  channel?: SlackChannel
  channels?: SlackChannel[]
  needed?: string
}

// API Base URL
const SLACK_API_URL = 'https://slack.com/api'

/**
 * Send a message to a Slack channel
 */
export async function sendSlackMessage(message: SlackMessage): Promise<SlackResponse> {
  const token = process.env.SLACK_BOT_TOKEN

  if (!token) {
    return { ok: false, error: 'Slack not configured' }
  }

  try {
    const response = await fetch(`${SLACK_API_URL}/chat.postMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(message),
    })

    const data = await response.json()
    return data
  } catch (error) {
    return { ok: false, error: `Network error: ${error}` }
  }
}

/**
 * Send a typed notification to Slack
 */
export async function sendSlackNotification(notification: SlackNotification): Promise<SlackResponse> {
  const { type, channel, data } = notification

  let message: SlackMessage

  switch (type) {
    case 'new_order':
      message = formatOrderMessage(data as unknown as OrderData)
      break
    case 'delivery_complete':
      message = formatDeliveryNotification(data as unknown as DeliveryData)
      break
    case 'qc_alert':
      message = formatQCAlert(data as unknown as QCAlertData)
      break
    case 'photographer_assigned':
      message = formatPhotographerAssignment(data as unknown as PhotographerAssignmentData)
      break
    default:
      message = {
        channel,
        text: `${type}: ${JSON.stringify(data)}`,
      }
  }

  message.channel = channel
  return sendSlackMessage(message)
}

// Data types for notifications
interface OrderData {
  order_id: string
  address: string
  agent_name: string
  package: string
  shoot_date: string
  total: number
}

interface DeliveryData {
  listing_id: string
  address: string
  agent_name: string
  photo_count: number
  video_count?: number
  delivery_url: string
}

interface QCAlertData {
  listing_id: string
  issue: string
  severity: 'low' | 'medium' | 'high'
  reviewer: string
}

interface PhotographerAssignmentData {
  order_id: string
  photographer_name: string
  address: string
  shoot_date: string
  shoot_time: string
}

/**
 * Format an order notification message
 */
export function formatOrderMessage(data: OrderData): SlackMessage & { blocks: SlackBlock[] } {
  return {
    channel: '',
    text: `New Order: ${data.order_id} - ${data.address}`,
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: `🏠 New Order: ${data.order_id}`, emoji: true },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Address:*\n${data.address}` },
          { type: 'mrkdwn', text: `*Agent:*\n${data.agent_name}` },
          { type: 'mrkdwn', text: `*Package:*\n${data.package}` },
          { type: 'mrkdwn', text: `*Shoot Date:*\n${data.shoot_date}` },
        ],
      },
      {
        type: 'section',
        text: { type: 'mrkdwn', text: `*Total:* $${data.total}` },
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: 'View Order', emoji: true },
            url: `https://app.aerialshots.media/admin/ops/jobs/${data.order_id}`,
            action_id: 'view_order',
          },
        ],
      },
    ],
  }
}

/**
 * Format a delivery complete notification
 */
export function formatDeliveryNotification(data: DeliveryData): SlackMessage & { blocks: SlackBlock[] } {
  const mediaStats = data.video_count
    ? `${data.photo_count} photos, ${data.video_count} videos`
    : `${data.photo_count} photos`

  return {
    channel: '',
    text: `Delivery Complete: ${data.listing_id} - ${data.address}`,
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: `✅ Delivery Complete: ${data.listing_id}`, emoji: true },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Address:*\n${data.address}` },
          { type: 'mrkdwn', text: `*Agent:*\n${data.agent_name}` },
          { type: 'mrkdwn', text: `*Media:*\n${mediaStats}` },
        ],
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: 'View Delivery', emoji: true },
            url: data.delivery_url,
            action_id: 'view_delivery',
            style: 'primary',
          },
        ],
      },
    ],
  }
}

/**
 * Format a QC alert notification
 */
function formatQCAlert(data: QCAlertData): SlackMessage & { blocks: SlackBlock[] } {
  const severityEmoji = {
    low: '🟡',
    medium: '🟠',
    high: '🔴',
  }

  return {
    channel: '',
    text: `QC Alert: ${data.listing_id} - ${data.issue}`,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${severityEmoji[data.severity]} QC Alert: ${data.listing_id}`,
          emoji: true,
        },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Issue:*\n${data.issue}` },
          { type: 'mrkdwn', text: `*Severity:*\n${data.severity.toUpperCase()}` },
          { type: 'mrkdwn', text: `*Flagged by:*\n${data.reviewer}` },
        ],
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: 'Review', emoji: true },
            url: `https://app.aerialshots.media/admin/qc/${data.listing_id}`,
            action_id: 'review_qc',
            style: 'danger',
          },
        ],
      },
    ],
  }
}

/**
 * Format a photographer assignment notification
 */
function formatPhotographerAssignment(data: PhotographerAssignmentData): SlackMessage & { blocks: SlackBlock[] } {
  return {
    channel: '',
    text: `Photographer Assigned: ${data.order_id}`,
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: `📸 Photographer Assigned: ${data.order_id}`, emoji: true },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Photographer:*\n${data.photographer_name}` },
          { type: 'mrkdwn', text: `*Address:*\n${data.address}` },
          { type: 'mrkdwn', text: `*Date:*\n${data.shoot_date}` },
          { type: 'mrkdwn', text: `*Time:*\n${data.shoot_time}` },
        ],
      },
    ],
  }
}

/**
 * Parse a Slack slash command
 */
export function parseSlackCommand(payload: SlackCommandPayload): ParsedCommand {
  const text = payload.text.trim()
  const parts = text.split(/\s+/)

  const command = parts[0]?.toLowerCase() || 'help'
  const args = parts.slice(1)

  return {
    command,
    args,
    user_id: payload.user_id,
    channel_id: payload.channel_id,
  }
}

/**
 * Validate Slack webhook signature
 */
export function validateWebhookSignature(
  body: string,
  timestamp: string,
  signature: string
): boolean {
  const signingSecret = process.env.SLACK_SIGNING_SECRET

  if (!signingSecret) {
    return false
  }

  // Check timestamp is not too old (5 minutes)
  const now = Math.floor(Date.now() / 1000)
  const requestTime = parseInt(timestamp, 10)
  if (Math.abs(now - requestTime) > 300) {
    return false
  }

  // Validate signature format
  if (!signature.startsWith('v0=')) {
    return false
  }

  // Compute expected signature
  const sigBasestring = `v0:${timestamp}:${body}`
  const mySignature = 'v0=' + crypto
    .createHmac('sha256', signingSecret)
    .update(sigBasestring)
    .digest('hex')

  // Use timing-safe comparison
  try {
    return crypto.timingSafeEqual(
      Buffer.from(mySignature),
      Buffer.from(signature)
    )
  } catch {
    return false
  }
}

/**
 * Slack Client Class
 *
 * Convenient wrapper for Slack operations
 */
export class SlackClient {
  private token: string

  constructor(token: string) {
    this.token = token
  }

  /**
   * Check if client is properly configured
   */
  isConfigured(): boolean {
    return !!this.token && this.token.length > 0
  }

  /**
   * Send a message to a channel
   */
  async sendMessage(channel: string, text: string, blocks?: SlackBlock[]): Promise<SlackResponse> {
    if (!this.isConfigured()) {
      return { ok: false, error: 'Slack not configured' }
    }

    return this.apiCall('chat.postMessage', { channel, text, blocks })
  }

  /**
   * List channels the bot has access to
   */
  async listChannels(): Promise<SlackChannel[]> {
    const response = await this.apiCall<SlackResponse & { channels?: SlackChannel[] }>('conversations.list', {
      types: 'public_channel,private_channel',
    })

    return response.channels || []
  }

  /**
   * Join a channel
   */
  async joinChannel(channelId: string): Promise<SlackResponse> {
    return this.apiCall('conversations.join', { channel: channelId })
  }

  /**
   * Create a new channel
   */
  async createChannel(name: string): Promise<SlackResponse> {
    return this.apiCall('conversations.create', { name })
  }

  /**
   * Invite users to a channel
   */
  async inviteToChannel(channelId: string, userIds: string[]): Promise<SlackResponse> {
    return this.apiCall('conversations.invite', {
      channel: channelId,
      users: userIds.join(','),
    })
  }

  /**
   * Set channel topic
   */
  async setChannelTopic(channelId: string, topic: string): Promise<SlackResponse> {
    return this.apiCall('conversations.setTopic', {
      channel: channelId,
      topic,
    })
  }

  /**
   * Make an API call to Slack
   */
  private async apiCall<T extends SlackResponse>(
    method: string,
    params: Record<string, unknown>
  ): Promise<T> {
    try {
      const response = await fetch(`${SLACK_API_URL}/${method}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify(params),
      })

      return await response.json()
    } catch (error) {
      return { ok: false, error: `Network error: ${error}` } as T
    }
  }
}
