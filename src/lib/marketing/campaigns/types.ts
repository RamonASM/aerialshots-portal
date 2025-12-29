/**
 * Marketing Campaign Types
 *
 * Type definitions for bulk email marketing campaigns.
 */

export type CampaignStatus =
  | 'draft'
  | 'scheduled'
  | 'sending'
  | 'sent'
  | 'paused'
  | 'cancelled'
  | 'failed'

export type CampaignType =
  | 'newsletter'
  | 'promotional'
  | 'announcement'
  | 'seasonal'
  | 'reactivation'
  | 'referral'

export type RecipientFilter =
  | 'all_agents'
  | 'active_agents'
  | 'inactive_agents'
  | 'new_agents'
  | 'top_clients'
  | 'segment'
  | 'custom_list'

export interface Campaign {
  id: string
  name: string
  subject: string
  preview_text?: string
  type: CampaignType
  status: CampaignStatus
  html_content: string
  text_content?: string
  recipient_filter: RecipientFilter
  recipient_segment_id?: string // For segment-based targeting
  recipient_list?: string[] // For custom email lists
  total_recipients: number
  sent_count: number
  delivered_count: number
  opened_count: number
  clicked_count: number
  bounced_count: number
  unsubscribed_count: number
  scheduled_for?: string
  sent_at?: string
  completed_at?: string
  created_by: string
  created_at: string
  updated_at: string
}

export interface CampaignRecipient {
  id: string
  campaign_id: string
  email: string
  name?: string
  agent_id?: string
  status: 'pending' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'unsubscribed'
  sent_at?: string
  opened_at?: string
  clicked_at?: string
  resend_message_id?: string
  error_message?: string
}

export interface CampaignTemplate {
  id: string
  name: string
  description?: string
  type: CampaignType
  subject_template: string
  html_template: string
  text_template?: string
  variables: string[] // e.g., ['agentName', 'listingCount']
  thumbnail_url?: string
  is_active: boolean
  created_at: string
}

export interface CampaignSegment {
  id: string
  name: string
  description?: string
  filter_criteria: SegmentCriteria
  estimated_count: number
  created_at: string
}

export interface SegmentCriteria {
  // Agent-based filters
  minListings?: number
  maxListings?: number
  minOrdersLast90Days?: number
  lastOrderWithinDays?: number
  noOrdersSinceDays?: number
  // Tier/status filters
  tiers?: string[] // bronze, silver, gold, platinum
  isActive?: boolean
  hasCredits?: boolean
  // Location-based
  cities?: string[]
  states?: string[]
  // Custom tags
  tags?: string[]
}

export interface CreateCampaignRequest {
  name: string
  subject: string
  preview_text?: string
  type: CampaignType
  html_content: string
  text_content?: string
  recipient_filter: RecipientFilter
  recipient_segment_id?: string
  recipient_list?: string[]
  scheduled_for?: string // ISO date string
}

export interface CampaignStats {
  total_recipients: number
  sent: number
  delivered: number
  opened: number
  clicked: number
  bounced: number
  unsubscribed: number
  open_rate: number
  click_rate: number
  bounce_rate: number
}

export interface SendCampaignOptions {
  campaignId: string
  batchSize?: number // Default 100
  delayBetweenBatchesMs?: number // Default 1000
  testMode?: boolean
  testEmails?: string[]
}
