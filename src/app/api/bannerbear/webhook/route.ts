import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import crypto from 'crypto'
import { executeWorkflow } from '@/lib/agents/orchestrator'
import { apiLogger, formatError } from '@/lib/logger'
// Import to ensure workflows are registered
import '@/lib/agents/workflows/post-delivery'

const logger = apiLogger.child({ route: 'bannerbear/webhook' })

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
      logger.error('CRITICAL: BANNERBEAR_WEBHOOK_SECRET not configured in production')
      return false
    }
    // Only allow bypass in explicit development mode
    logger.warn('[DEV ONLY] BANNERBEAR_WEBHOOK_SECRET not configured - skipping verification')
    return true
  }

  if (!signature) {
    logger.error('Missing webhook signature header')
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
      logger.error('Invalid webhook signature')
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      )
    }

    // Parse the verified payload
    const payload: BannerbearWebhookPayload = JSON.parse(rawBody)

    logger.info({ uid: payload.uid, status: payload.status }, 'Bannerbear webhook received')

    // Parse metadata to get carouselId and slidePosition
    let carouselId: string | null = null
    let slidePosition: number | null = null

    if (payload.metadata) {
      try {
        const meta = JSON.parse(payload.metadata)
        carouselId = meta.carouselId
        slidePosition = meta.slidePosition
      } catch (e) {
        logger.error({ ...formatError(e) }, 'Failed to parse webhook metadata')
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
      logger.error({ carouselId }, 'Carousel not found')
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
      logger.error({ carouselId, ...formatError(updateError) }, 'Failed to update carousel')
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
          logger.info({ listingId }, 'Triggering post-delivery workflow')

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
            logger.error({ listingId, ...formatError(error) }, 'Post-delivery workflow failed')
          })
        }
      } catch (workflowError) {
        // Log but don't fail the webhook response
        logger.error({ carouselId, ...formatError(workflowError) }, 'Error triggering post-delivery workflow')
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
    logger.error({ ...formatError(error) }, 'Bannerbear webhook error')
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}
