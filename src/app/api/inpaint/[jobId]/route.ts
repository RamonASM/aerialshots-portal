/**
 * Inpainting Job Status Route
 *
 * Returns the current status of an inpainting job.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RouteParams {
  params: Promise<{ jobId: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { jobId } = await params
    const supabase = await createClient()

    // Verify authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get job status
    const { data: job, error } = await supabase
      .from('inpainting_jobs')
      .select('*')
      .eq('id', jobId)
      .single()

    if (error || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    // Build output URL if completed
    let outputUrl = null
    if (job.status === 'completed' && job.output_path) {
      const { data: urlData } = await supabase.storage
        .from('edited-photos')
        .createSignedUrl(job.output_path, 3600) // 1 hour expiry

      outputUrl = urlData?.signedUrl
    }

    return NextResponse.json({
      job_id: job.id,
      status: job.status,
      output_url: outputUrl,
      output_path: job.output_path,
      error_message: job.error_message,
      created_at: job.created_at,
    })
  } catch (error) {
    console.error('Get inpainting status error:', error)
    return NextResponse.json(
      { error: 'Failed to get job status' },
      { status: 500 }
    )
  }
}
