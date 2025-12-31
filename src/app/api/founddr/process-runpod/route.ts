import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getRunPodClient } from '@/lib/integrations/founddr'
import { apiLogger, formatError } from '@/lib/logger'
import { z } from 'zod'

// Request validation schema
const ProcessRequestSchema = z.object({
  listingId: z.string().uuid('Invalid listing ID'),
  mediaAssetIds: z.array(z.string().uuid()).min(2, 'At least 2 bracket images required').max(7),
  storagePaths: z.array(z.string()).min(2).max(7),
})

/**
 * POST /api/founddr/process-runpod
 * Process HDR brackets via RunPod Serverless
 * Returns the processed image directly (synchronous)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verify staff authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user?.email) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Verify staff role
    const { data: staff } = await supabase
      .from('staff')
      .select('id, role')
      .eq('email', user.email)
      .eq('is_active', true)
      .single()

    if (!staff) {
      return NextResponse.json({ error: 'Staff access required' }, { status: 403 })
    }

    // Parse and validate request
    const rawBody = await request.json()
    const parseResult = ProcessRequestSchema.safeParse(rawBody)

    if (!parseResult.success) {
      const errors = parseResult.error.issues.map((e) => e.message).join(', ')
      return NextResponse.json({ error: errors }, { status: 400 })
    }

    const { listingId, mediaAssetIds, storagePaths } = parseResult.data

    // Check if RunPod is configured
    const runpod = getRunPodClient()
    if (!runpod.isConfigured()) {
      return NextResponse.json(
        { error: 'RunPod integration not configured. Set RUNPOD_ENDPOINT_ID and RUNPOD_API_KEY.' },
        { status: 503 }
      )
    }

    // Create processing job record
    const { data: processingJob, error: jobError } = await supabase
      .from('processing_jobs')
      .insert({
        listing_id: listingId,
        status: 'processing',
        input_keys: storagePaths,
        bracket_count: storagePaths.length,
        started_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (jobError) {
      apiLogger.error({ error: formatError(jobError), listingId }, 'Failed to create processing job')
      return NextResponse.json({ error: 'Failed to create processing job' }, { status: 500 })
    }

    // Generate signed URLs for RunPod to download the images
    const signedUrls: string[] = []
    for (const path of storagePaths) {
      const { data: signedUrl, error: signError } = await supabase.storage
        .from('staged-photos')
        .createSignedUrl(path, 300) // 5 minute expiry

      if (signError || !signedUrl?.signedUrl) {
        apiLogger.error({ path, error: signError }, 'Failed to create signed URL')
        return NextResponse.json({ error: `Failed to access image: ${path}` }, { status: 500 })
      }
      signedUrls.push(signedUrl.signedUrl)
    }

    apiLogger.info({
      listingId,
      processingJobId: processingJob.id,
      bracketCount: storagePaths.length,
      staffEmail: user.email,
    }, 'Starting RunPod HDR processing')

    try {
      // Process via RunPod using signed URLs
      const result = await runpod.processHDRFromURLs(signedUrls, {
        enableWindowPull: true,
        jpegQuality: 95,
      })

      if (result.status === 'COMPLETED' && result.output) {
        // Upload result to Supabase storage
        const outputKey = `processed/${listingId}/${processingJob.id}.jpg`
        const imageBuffer = Buffer.from(result.output.image_base64, 'base64')

        const { error: uploadError } = await supabase.storage
          .from('processed-photos')
          .upload(outputKey, imageBuffer, {
            contentType: 'image/jpeg',
            upsert: true,
          })

        if (uploadError) {
          apiLogger.error({ error: formatError(uploadError) }, 'Failed to upload processed image')
          throw new Error('Failed to upload processed image')
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('processed-photos')
          .getPublicUrl(outputKey)

        // Update job as completed
        await supabase
          .from('processing_jobs')
          .update({
            status: 'completed',
            output_key: outputKey,
            completed_at: new Date().toISOString(),
            processing_time_ms: result.output.metrics.total_time_ms,
            metrics: result.output.metrics,
          })
          .eq('id', processingJob.id)

        // Update media assets
        await supabase
          .from('media_assets')
          .update({
            processing_job_id: processingJob.id,
            qc_status: 'pending_review',
          })
          .in('id', mediaAssetIds)

        apiLogger.info({
          listingId,
          processingJobId: processingJob.id,
          processingTime: result.output.metrics.total_time_ms,
          fusionMethod: result.output.metrics.fusion_method,
        }, 'RunPod HDR processing completed')

        return NextResponse.json({
          success: true,
          processingJobId: processingJob.id,
          outputUrl: urlData.publicUrl,
          outputKey,
          metrics: result.output.metrics,
          dimensions: {
            width: result.output.width,
            height: result.output.height,
          },
        })
      } else {
        // Processing failed
        await supabase
          .from('processing_jobs')
          .update({
            status: 'failed',
            error_message: result.error || 'Unknown error',
          })
          .eq('id', processingJob.id)

        apiLogger.error({
          listingId,
          processingJobId: processingJob.id,
          error: result.error,
        }, 'RunPod HDR processing failed')

        return NextResponse.json({
          success: false,
          error: result.error || 'Processing failed',
          processingJobId: processingJob.id,
        }, { status: 500 })
      }
    } catch (runpodError) {
      // Update job to failed
      const errorInfo = formatError(runpodError)
      await supabase
        .from('processing_jobs')
        .update({
          status: 'failed',
          error_message: typeof errorInfo === 'string' ? errorInfo : JSON.stringify(errorInfo),
        })
        .eq('id', processingJob.id)

      apiLogger.error({
        error: formatError(runpodError),
        listingId,
        processingJobId: processingJob.id,
      }, 'RunPod request failed')

      return NextResponse.json(
        { error: 'HDR processing request failed', details: formatError(runpodError) },
        { status: 502 }
      )
    }
  } catch (error) {
    apiLogger.error({ error: formatError(error) }, 'RunPod process error')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * GET /api/founddr/process-runpod
 * Check RunPod configuration status
 */
export async function GET() {
  try {
    const runpod = getRunPodClient()

    return NextResponse.json({
      configured: runpod.isConfigured(),
      endpointId: process.env.RUNPOD_ENDPOINT_ID ? '***configured***' : 'not set',
      apiKey: process.env.RUNPOD_API_KEY ? '***configured***' : 'not set',
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to check status' }, { status: 500 })
  }
}
