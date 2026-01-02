/**
 * Inpainting Webhook Handler
 *
 * Receives notifications from FoundDR when inpainting completes or fails.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { webhookLogger, formatError } from '@/lib/logger'
import type { Json } from '@/lib/supabase/types'

interface InpaintWebhookPayload {
  job_id: string
  status: 'completed' | 'failed'
  output_path?: string
  error_message?: string
  media_asset_id?: string
  listing_id?: string
  processing_time_ms?: number
}

export async function POST(request: NextRequest) {
  try {
    // Verify webhook secret
    const webhookSecret = request.headers.get('x-founddr-secret')
    const expectedSecret = process.env.FOUNDDR_WEBHOOK_SECRET

    if (expectedSecret && webhookSecret !== expectedSecret) {
      webhookLogger.warn({ source: 'inpaint' }, 'Invalid webhook secret')
      return NextResponse.json({ error: 'Invalid webhook secret' }, { status: 401 })
    }

    // Parse payload
    const payload: InpaintWebhookPayload = await request.json()

    webhookLogger.info({
      source: 'inpaint',
      jobId: payload.job_id,
      status: payload.status,
    }, 'Inpaint webhook received')

    const supabase = createAdminClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anySupabase = supabase as any
    const now = new Date().toISOString()

    if (payload.status === 'completed') {
      // Update inpainting job
      await anySupabase
        .from('inpainting_jobs')
        .update({
          status: 'completed',
          output_path: payload.output_path,
        })
        .eq('id', payload.job_id)

      // Update media asset with edited path
      if (payload.media_asset_id && payload.output_path) {
        // Fetch current edit_history and append new entry
        const { data: currentAsset } = await anySupabase
          .from('media_assets')
          .select('edit_history')
          .eq('id', payload.media_asset_id)
          .single()

        const currentHistory = (currentAsset?.edit_history as Json[]) || []
        const newHistory: Json[] = [
          ...currentHistory,
          {
            type: 'inpaint',
            job_id: payload.job_id,
            output_path: payload.output_path,
            timestamp: now,
          } as Json,
        ]

        await anySupabase
          .from('media_assets')
          .update({
            edit_history: newHistory,
            processed_storage_path: payload.output_path,
            needs_editing: false,
          })
          .eq('id', payload.media_asset_id)
      }

      // Log event
      if (payload.listing_id) {
        await supabase.from('job_events').insert({
          listing_id: payload.listing_id,
          event_type: 'inpainting_completed',
          new_value: {
            job_id: payload.job_id,
            output_path: payload.output_path,
            processing_time_ms: payload.processing_time_ms,
          },
          actor_type: 'system',
        })
      }

      webhookLogger.info({
        source: 'inpaint',
        jobId: payload.job_id,
        outputPath: payload.output_path,
      }, 'Inpainting completed')
    } else if (payload.status === 'failed') {
      // Update inpainting job
      await anySupabase
        .from('inpainting_jobs')
        .update({
          status: 'failed',
          error_message: payload.error_message,
        })
        .eq('id', payload.job_id)

      // Log event
      if (payload.listing_id) {
        await supabase.from('job_events').insert({
          listing_id: payload.listing_id,
          event_type: 'inpainting_failed',
          new_value: {
            job_id: payload.job_id,
            error_message: payload.error_message,
          },
          actor_type: 'system',
        })
      }

      webhookLogger.error({
        source: 'inpaint',
        jobId: payload.job_id,
        errorMessage: payload.error_message,
      }, 'Inpainting failed')
    }

    return NextResponse.json({
      status: 'ok',
      message: `Webhook processed for job ${payload.job_id}`,
    })
  } catch (error) {
    webhookLogger.error({ source: 'inpaint', error: formatError(error) }, 'Inpaint webhook error')
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/inpaint/webhook
 *
 * Health check endpoint
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'aerialshots-portal',
    endpoint: 'inpaint-webhook',
    timestamp: new Date().toISOString(),
  })
}
