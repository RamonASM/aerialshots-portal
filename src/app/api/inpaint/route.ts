/**
 * Inpainting API Route
 *
 * Creates inpainting jobs for AI object removal.
 * Accepts mask image, stores in Supabase, creates job record,
 * and triggers FoundDR backend processing.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { v4 as uuidv4 } from 'uuid'

const FOUNDDR_API_URL = process.env.FOUNDDR_API_URL || 'http://localhost:8000'
const FOUNDDR_API_SECRET = process.env.FOUNDDR_API_SECRET || ''

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

    // Parse form data
    const formData = await request.formData()
    const maskFile = formData.get('mask') as File | null
    const assetId = formData.get('asset_id') as string
    const listingId = formData.get('listing_id') as string
    const imageUrl = formData.get('image_url') as string
    const width = formData.get('width') as string
    const height = formData.get('height') as string

    // Validate required fields
    if (!maskFile || !assetId || !listingId || !imageUrl) {
      return NextResponse.json(
        { error: 'Missing required fields: mask, asset_id, listing_id, image_url' },
        { status: 400 }
      )
    }

    // Generate job ID
    const jobId = uuidv4()

    // Upload mask to Supabase storage
    const maskPath = `${listingId}/${jobId}/mask.png`
    const maskBuffer = Buffer.from(await maskFile.arrayBuffer())

    const adminClient = createAdminClient()

    const { error: uploadError } = await adminClient.storage
      .from('inpainting-masks')
      .upload(maskPath, maskBuffer, {
        contentType: 'image/png',
        upsert: false,
      })

    if (uploadError) {
      console.error('Mask upload error:', uploadError)
      return NextResponse.json(
        { error: 'Failed to upload mask' },
        { status: 500 }
      )
    }

    // Create inpainting job record
    const { error: insertError } = await adminClient
      .from('inpainting_jobs')
      .insert({
        id: jobId,
        media_asset_id: assetId,
        mask_data: {
          storage_path: maskPath,
          width: parseInt(width) || 0,
          height: parseInt(height) || 0,
        },
        status: 'pending',
        model_used: 'stable-diffusion-inpaint',
        input_path: imageUrl,
      })

    if (insertError) {
      console.error('Job insert error:', insertError)
      return NextResponse.json(
        { error: 'Failed to create job record' },
        { status: 500 }
      )
    }

    // Build callback URL
    const callbackUrl =
      process.env.FOUNDDR_WEBHOOK_URL ||
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/inpaint/webhook`

    // Trigger FoundDR inpainting
    try {
      const founddrResponse = await fetch(`${FOUNDDR_API_URL}/inpaint`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Portal-Secret': FOUNDDR_API_SECRET,
        },
        body: JSON.stringify({
          job_id: jobId,
          image_url: imageUrl,
          mask_storage_path: maskPath,
          media_asset_id: assetId,
          listing_id: listingId,
          callback_url: callbackUrl,
          prompt: 'clean empty room, professional real estate photo, high quality, 4k',
        }),
      })

      if (!founddrResponse.ok) {
        const errorData = await founddrResponse.json().catch(() => ({}))
        console.error('FoundDR inpaint error:', errorData)

        // Update job status to failed
        await adminClient
          .from('inpainting_jobs')
          .update({
            status: 'failed',
            error_message: errorData.detail || 'FoundDR API error',
          })
          .eq('id', jobId)

        return NextResponse.json(
          { error: 'Failed to start inpainting' },
          { status: 500 }
        )
      }

      // Update job status to processing
      await adminClient
        .from('inpainting_jobs')
        .update({ status: 'processing' })
        .eq('id', jobId)

      // Log event
      await adminClient.from('job_events').insert({
        listing_id: listingId,
        event_type: 'inpainting_started',
        new_value: {
          job_id: jobId,
          media_asset_id: assetId,
        },
        actor_id: user.id,
        actor_type: 'staff',
      })

      return NextResponse.json({
        job_id: jobId,
        status: 'processing',
        message: 'Inpainting job started',
      })
    } catch (fetchError) {
      console.error('FoundDR fetch error:', fetchError)

      // Update job status to failed
      await adminClient
        .from('inpainting_jobs')
        .update({
          status: 'failed',
          error_message: 'Failed to connect to processing server',
        })
        .eq('id', jobId)

      return NextResponse.json(
        { error: 'Failed to connect to processing server' },
        { status: 503 }
      )
    }
  } catch (error) {
    console.error('Inpainting API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
