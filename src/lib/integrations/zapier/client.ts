import { createAdminClient } from '@/lib/supabase/admin'
import type { Json } from '@/lib/supabase/types'
import type {
  ZapierEventType,
  ZapierWebhook,
  ZapierPayload,
  ZapierTriggerResult,
} from './types'
import { integrationLogger, formatError } from '@/lib/logger'

const logger = integrationLogger.child({ integration: 'zapier' })

const WEBHOOK_TIMEOUT = 10000 // 10 seconds

/**
 * Trigger all active webhooks for a specific event
 */
export async function triggerWebhooks(
  eventType: ZapierEventType,
  data: { [key: string]: Json | undefined },
  metadata?: { [key: string]: Json | undefined }
): Promise<ZapierTriggerResult[]> {
  const adminSupabase = createAdminClient()
  const results: ZapierTriggerResult[] = []

  try {
    // Get all active webhooks for this event type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: webhooks, error } = await (adminSupabase as any)
      .from('zapier_webhooks')
      .select('*')
      .eq('event_type', eventType)
      .eq('is_active', true) as { data: ZapierWebhook[] | null; error: Error | null }

    if (error || !webhooks || webhooks.length === 0) {
      return results
    }

    // Trigger each webhook
    const triggerPromises = webhooks.map((webhook: ZapierWebhook) =>
      triggerSingleWebhook(webhook, eventType, data, metadata)
    )

    const webhookResults = await Promise.allSettled(triggerPromises)

    // Collect results
    webhookResults.forEach((result, index) => {
      const webhook = webhooks[index]
      if (result.status === 'fulfilled') {
        results.push(result.value)
      } else {
        results.push({
          webhookId: webhook.id,
          success: false,
          error: result.reason?.message || 'Unknown error',
        })
      }
    })

    return results
  } catch (error) {
    logger.error({ ...formatError(error) }, 'Error triggering webhooks')
    return results
  }
}

/**
 * Trigger a single webhook
 */
async function triggerSingleWebhook(
  webhook: ZapierWebhook,
  eventType: ZapierEventType,
  data: { [key: string]: Json | undefined },
  metadata?: { [key: string]: Json | undefined }
): Promise<ZapierTriggerResult> {
  const adminSupabase = createAdminClient()

  const payload: ZapierPayload = {
    event: eventType,
    timestamp: new Date().toISOString(),
    data,
    metadata,
  }

  try {
    // Check filter conditions (optional computed property)
    if (webhook.filter_conditions && !matchesFilter(data, webhook.filter_conditions)) {
      return {
        webhookId: webhook.id,
        success: true,
        responseStatus: 0, // Skipped due to filter
      }
    }

    // Make the webhook request
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT)

    const response = await fetch(webhook.webhook_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Event': eventType,
        'X-Webhook-Timestamp': payload.timestamp,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    const responseBody = await response.text().catch(() => '')

    // Log the webhook call
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (adminSupabase as any).from('zapier_webhook_logs').insert({
      webhook_id: webhook.id,
      event_type: eventType,
      payload: JSON.parse(JSON.stringify(payload)),
      response_status: response.status,
      response_body: responseBody.slice(0, 1000), // Limit response body
      success: response.ok,
      error_message: response.ok ? null : `HTTP ${response.status}`,
    })

    // Update webhook updated_at timestamp
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (adminSupabase as any)
      .from('zapier_webhooks')
      .update({
        updated_at: new Date().toISOString(),
      })
      .eq('id', webhook.id)

    return {
      webhookId: webhook.id,
      success: response.ok,
      responseStatus: response.status,
      error: response.ok ? undefined : `HTTP ${response.status}`,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    // Log the failed webhook call
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (adminSupabase as any).from('zapier_webhook_logs').insert({
      webhook_id: webhook.id,
      event_type: eventType,
      payload: JSON.parse(JSON.stringify(payload)),
      success: false,
      error_message: errorMessage,
    })

    return {
      webhookId: webhook.id,
      success: false,
      error: errorMessage,
    }
  }
}

/**
 * Check if data matches filter conditions
 */
function matchesFilter(
  data: Record<string, unknown>,
  conditions: Record<string, unknown>
): boolean {
  if (!conditions || Object.keys(conditions).length === 0) {
    return true
  }

  for (const [key, value] of Object.entries(conditions)) {
    const dataValue = getNestedValue(data, key)

    if (Array.isArray(value)) {
      // Check if value is in array
      if (!value.includes(dataValue)) {
        return false
      }
    } else if (typeof value === 'object' && value !== null) {
      // Handle comparison operators
      const operators = value as Record<string, unknown>
      if ('$eq' in operators && dataValue !== operators.$eq) return false
      if ('$ne' in operators && dataValue === operators.$ne) return false
      if ('$gt' in operators && !(Number(dataValue) > Number(operators.$gt))) return false
      if ('$gte' in operators && !(Number(dataValue) >= Number(operators.$gte))) return false
      if ('$lt' in operators && !(Number(dataValue) < Number(operators.$lt))) return false
      if ('$lte' in operators && !(Number(dataValue) <= Number(operators.$lte))) return false
      if ('$in' in operators && !Array.isArray(operators.$in)) return false
      if ('$in' in operators && !(operators.$in as unknown[]).includes(dataValue)) return false
    } else {
      // Direct equality check
      if (dataValue !== value) {
        return false
      }
    }
  }

  return true
}

/**
 * Get nested value from object using dot notation
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce((current, key) => {
    if (current && typeof current === 'object') {
      return (current as Record<string, unknown>)[key]
    }
    return undefined
  }, obj as unknown)
}

/**
 * Create a new webhook
 */
export async function createWebhook(
  webhook: Omit<ZapierWebhook, 'id' | 'created_at' | 'updated_at' | 'filter_conditions'>
): Promise<ZapierWebhook> {
  const adminSupabase = createAdminClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (adminSupabase as any)
    .from('zapier_webhooks')
    .insert(webhook)
    .select()
    .single() as { data: ZapierWebhook | null; error: Error | null }

  if (error) {
    throw new Error(`Failed to create webhook: ${error.message}`)
  }

  return data as ZapierWebhook
}

/**
 * Update a webhook
 */
export async function updateWebhook(
  id: string,
  updates: Partial<Pick<ZapierWebhook, 'event_type' | 'webhook_url' | 'is_active'>>
): Promise<ZapierWebhook> {
  const adminSupabase = createAdminClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (adminSupabase as any)
    .from('zapier_webhooks')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single() as { data: ZapierWebhook | null; error: Error | null }

  if (error) {
    throw new Error(`Failed to update webhook: ${error.message}`)
  }

  return data as ZapierWebhook
}

/**
 * Delete a webhook
 */
export async function deleteWebhook(id: string): Promise<void> {
  const adminSupabase = createAdminClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (adminSupabase as any)
    .from('zapier_webhooks')
    .delete()
    .eq('id', id)

  if (error) {
    throw new Error(`Failed to delete webhook: ${error.message}`)
  }
}

/**
 * Get webhook logs
 */
export async function getWebhookLogs(
  webhookId: string,
  limit: number = 50
): Promise<Array<Record<string, unknown>>> {
  const adminSupabase = createAdminClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (adminSupabase as any)
    .from('zapier_webhook_logs')
    .select('*')
    .eq('webhook_id', webhookId)
    .order('triggered_at', { ascending: false })
    .limit(limit) as { data: Array<Record<string, unknown>> | null; error: Error | null }

  if (error) {
    throw new Error(`Failed to get webhook logs: ${error.message}`)
  }

  return data || []
}
