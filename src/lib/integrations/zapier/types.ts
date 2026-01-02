// Zapier integration types
import type { Json } from '@/lib/supabase/types'

export type ZapierEventType =
  | 'order_created'
  | 'order_delivered'
  | 'order_cancelled'
  | 'status_changed'
  | 'payment_received'
  | 'payment_failed'
  | 'assignment_created'
  | 'qc_approved'
  | 'qc_rejected'
  | 'media_uploaded'
  | 'feedback_received'

// Matches database schema for zapier_webhooks table
export interface ZapierWebhook {
  id: string
  agent_id: string | null
  event_type: string
  webhook_url: string
  is_active: boolean | null
  created_at: string | null
  updated_at: string | null
  // Computed properties (not in DB)
  filter_conditions?: Record<string, unknown>
}

export interface ZapierWebhookLog {
  id: string
  webhook_id: string
  event_type: string
  payload: Json
  response_status: number | null
  response_body: string | null
  success: boolean
  error_message: string | null
  triggered_at: string
}

export interface ZapierPayload {
  event: ZapierEventType
  timestamp: string
  data: { [key: string]: Json | undefined }
  metadata?: { [key: string]: Json | undefined }
}

export interface ZapierTriggerResult {
  webhookId: string
  success: boolean
  responseStatus?: number
  error?: string
}
