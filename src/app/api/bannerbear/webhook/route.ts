import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import crypto from 'crypto'
import { executeWorkflow } from '@/lib/agents/orchestrator'
// Import to ensure workflows are registered
import '@/lib/agents/workflows/post-delivery'

interface BannerbearWebhookPayload {
  uid: string
  status: 'completed' | 'failed'
  image_url: string | null
  image_url_png: string | null
  image_url_jpg: string | null
  metadata?: string
  render_time_ms?: number
}

// Verify webhook signature from Bannerbear
function verifyWebhookSignature(payload: string, signature: string | null): boolean {
  const webhookSecret = process.env.BANNERBEAR_WEBHOOK_SECRET
  const isProduction = process.env.NODE_ENV === 'production'

  // SECURITY: Require webhook secret in production
  if (!webhookSecret) {
    if (isProduction) {
      console.error('CRITICAL: BANNERBEAR_WEBHOOK_SECRET not configured in production')
      return false
    }
    // Only allow bypass in explicit development mode
    console.warn('[DEV ONLY] BANNERBEAR_WEBHOOK_SECRET not configured - skipping verification')
    return true
  }

  if (!signature) {
    console.error('Missing webhook signature header')
    return false
  }

  // Calculate expected signature using HMAC-SHA256
  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(payload)
    .digest('hex')

  // Use timing-safe comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    )
  } catch {
    return false
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification
    const rawBody = await request.text()
    const signature = request.headers.get('X-Bannerbear-Signature')

    // Verify signature
    if (!verifyWebhookSignature(rawBody, signature)) {
      console.error('Invalid webhook signature')
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      )
    }

    // Parse the verified payload
    const payload: BannerbearWebhookPayload = JSON.parse(rawBody)

    console.log('Bannerbear webhook received:', payload.uid, payload.status)

    // Parse metadata to get carouselId and slidePosition
    let carouselId: string | null = null
    let slidePosition: number | null = null

    if (payload.metadata) {
      try {
        const meta = JSON.parse(payload.metadata)
        carouselId = meta.carouselId
        slidePosition = meta.slidePosition
      } catch (e) {
        console.error('Failed to parse webhook metadata:', e)
      }
    }

    if (!carouselId) {
      return NextResponse.json(
        { error: 'Missing carouselId in metadata' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // Get current carousel
    const { data: carousel, error: fetchError } = await supabase
      .from('listing_carousels')
      .select('id, slides, rendered_image_urls, render_status')
      .eq('id', carouselId)
      .single()

    if (fetchError || !carousel) {
      console.error('Carousel not found:', carouselId)
      return NextResponse.json(
        { error: 'Carousel not found' },
        { status: 404 }
      )
    }

    // Update rendered URLs array
    const renderedUrls = (carousel.rendered_image_urls as string[]) || []
    const slides = carousel.slides as Array<{ position: number }>

    if (payload.status === 'completed' && payload.image_url_jpg) {
      // Add the rendered URL at the correct position
      if (slidePosition !== null) {
        // Ensure array is large enough
        while (renderedUrls.length < slides.length) {
          renderedUrls.push('')
        }
        renderedUrls[slidePosition - 1] = payload.image_url_jpg
      } else {
        renderedUrls.push(payload.image_url_jpg)
      }
    }

    // Check if all slides are rendered
    const allRendered = renderedUrls.length >= slides.length &&
      renderedUrls.every(url => url && url.length > 0)

    // Update carousel
    const { error: updateError } = await supabase
      .from('listing_carousels')
      .update({
        rendered_image_urls: renderedUrls,
        render_status: allRendered ? 'completed' : 'rendering',
        rendered_at: allRendered ? new Date().toISOString() : null,
      })
      .eq('id', carouselId)

    if (updateError) {
      console.error('Failed to update carousel:', updateError)
      return NextResponse.json(
        { error: 'Failed to update carousel' },
        { status: 500 }
      )
    }

    // Trigger post-delivery workflow when all slides are rendered
    if (allRendered) {
      try {
        // Get campaign info for the workflow (carousels are linked via campaign)
        const { data: carouselData } = await supabase
          .from('listing_carousels')
          .select('campaign_id, listing_campaigns(listing_id, agent_id)')
          .eq('id', carouselId)
          .single()

        const campaign = carouselData?.listing_campaigns as { listing_id: string | null; agent_id: string } | null
        const listingId = campaign?.listing_id
        const campaignId = carouselData?.campaign_id

        if (listingId) {
          console.log('Triggering post-delivery workflow for listing:', listingId)

          // Execute workflow asynchronously (don't await - webhook should return quickly)
          executeWorkflow('post-delivery', {
            event: 'carousel.rendered',
            listingId,
            campaignId: campaignId || undefined,
            data: {
              carouselId,
              carouselUrls: renderedUrls,
              agentId: campaign?.agent_id,
              mediaTypes: ['carousel'],
            },
          }).catch(error => {
            console.error('Post-delivery workflow failed:', error)
          })
        }
      } catch (workflowError) {
        // Log but don't fail the webhook response
        console.error('Error triggering post-delivery workflow:', workflowError)
      }
    }

    return NextResponse.json({
      success: true,
      carouselId,
      slidePosition,
      status: allRendered ? 'completed' : 'rendering',
      renderedCount: renderedUrls.filter(u => u).length,
      totalSlides: slides.length,
      workflowTriggered: allRendered,
    })
  } catch (error) {
    console.error('Bannerbear webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}
