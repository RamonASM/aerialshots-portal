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
  name: string
  url: string  // webhook URL
  events: string[]  // list of event types to trigger on
  is_active: boolean
  secret: string | null  // webhook secret for verification
  last_triggered_at: string | null
  created_at: string
  updated_at: string
  // Computed properties (not in DB)
  description?: string | null
  trigger_count?: number
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
