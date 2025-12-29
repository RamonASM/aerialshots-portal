/**
 * FoundDR Processing API Route
 *
 * Triggers HDR processing for uploaded photos via the FoundDR backend.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getFoundDRClient, type FoundDRJobRequest } from '@/lib/founddr/client'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verify authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request body
    const body = await request.json()
    const { listing_id, media_asset_ids, storage_paths, is_rush } = body

    // Validate required fields
    if (!listing_id || !media_asset_ids?.length || !storage_paths?.length) {
      return NextResponse.json(
        { error: 'Missing required fields: listing_id, media_asset_ids, storage_paths' },
        { status: 400 }
      )
    }

    if (storage_paths.length < 2) {
      return NextResponse.json(
        { error: 'HDR processing requires at least 2 bracket images' },
        { status: 400 }
      )
    }

    if (storage_paths.length > 7) {
      return NextResponse.json(
        { error: 'HDR processing supports maximum 7 bracket images' },
        { status: 400 }
      )
    }

    // Verify listing exists and user has access
    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .select('id, agent_id')
      .eq('id', listing_id)
      .single()

    if (listingError || !listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
    }

    // Build callback URL for FoundDR webhook
    const callbackUrl =
      process.env.FOUNDDR_WEBHOOK_URL ||
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/webhooks/founddr`

    // Create job request for FoundDR
    const jobRequest: FoundDRJobRequest = {
      listing_id,
      media_asset_ids,
      storage_paths,
      callback_url: callbackUrl,
      is_rush: is_rush || false,
      options: {},
    }

    // Call FoundDR API
    const founddr = getFoundDRClient()
    const result = await founddr.createJob(jobRequest)

    // Create local processing_jobs record for tracking
    const { error: insertError } = await supabase.from('processing_jobs').insert({
      founddr_job_id: result.founddr_job_id,
      listing_id,
      status: 'queued',
      input_keys: storage_paths,
      bracket_count: storage_paths.length,
      queued_at: new Date().toISOString(),
    })

    if (insertError) {
      console.error('Failed to create processing_jobs record:', insertError)
      // Continue anyway - FoundDR job was already created
    }

    // Update media_assets with processing job reference
    const { error: updateError } = await supabase
      .from('media_assets')
      .update({ qc_status: 'processing' })
      .in('id', media_asset_ids)

    if (updateError) {
      console.error('Failed to update media_assets:', updateError)
    }

    // Log the event
    await supabase.from('job_events').insert({
      listing_id,
      event_type: 'hdr_processing_started',
      new_value: {
        founddr_job_id: result.founddr_job_id,
        bracket_count: storage_paths.length,
        is_rush,
        estimated_time_seconds: result.estimated_time_seconds,
      },
      actor_id: user.id,
      actor_type: 'staff',
    })

    return NextResponse.json({
      founddr_job_id: result.founddr_job_id,
      status: result.status,
      message: result.message,
      estimated_time_seconds: result.estimated_time_seconds,
    })
  } catch (error) {
    console.error('Processing API error:', error)

    if (error instanceof Error && error.name === 'FoundDRError') {
      const statusCode = 'statusCode' in error ? (error as { statusCode: number }).statusCode : 500
      return NextResponse.json(
        { error: error.message },
        { status: statusCode || 500 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to start HDR processing' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/processing?job_id=xxx
 *
 * Check the status of a processing job
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const jobId = request.nextUrl.searchParams.get('job_id')
    if (!jobId) {
      return NextResponse.json(
        { error: 'Missing job_id parameter' },
        { status: 400 }
      )
    }

    // Get job status from local database
    const { data: job, error } = await supabase
      .from('processing_jobs')
      .select('*')
      .eq('founddr_job_id', jobId)
      .single()

    if (error || !job) {
      // Try to get status from FoundDR
      try {
        const founddr = getFoundDRClient()
        const status = await founddr.getJobStatus(jobId)
        return NextResponse.json(status)
      } catch {
        return NextResponse.json({ error: 'Job not found' }, { status: 404 })
      }
    }

    return NextResponse.json({
      job_id: job.founddr_job_id,
      status: job.status,
      output_key: job.output_key,
      metrics: job.metrics,
      error_message: job.error_message,
      created_at: job.created_at,
      completed_at: job.completed_at,
      processing_time_ms: job.processing_time_ms,
    })
  } catch (error) {
    console.error('Get processing status error:', error)
    return NextResponse.json(
      { error: 'Failed to get processing status' },
      { status: 500 }
    )
  }
}
