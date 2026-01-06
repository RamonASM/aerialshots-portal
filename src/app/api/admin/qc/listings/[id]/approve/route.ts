import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireStaffAccess } from '@/lib/auth/server-access'
import { executeWorkflow } from '@/lib/agents/orchestrator'
import { qcLogger, formatError } from '@/lib/logger'
import { processJobPayouts } from '@/lib/payments/payout-processor'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const access = await requireStaffAccess()
    const supabase = createAdminClient()
    const { id } = await params

    // Update listing status to delivered
    const { data: listing, error: updateError } = await supabase
      .from('listings')
      .update({
        ops_status: 'delivered',
        delivered_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      throw updateError
    }

    // Update all media assets to approved
    const { error: assetsError } = await supabase
      .from('media_assets')
      .update({
        qc_status: 'approved',
      })
      .eq('listing_id', id)

    if (assetsError) {
      qcLogger.error({ listingId: id, ...formatError(assetsError) }, 'Error updating media assets')
    }

    // Log the event
    await supabase.from('job_events').insert({
      listing_id: id,
      event_type: 'qc_approved',
      new_value: { ops_status: 'delivered' },
      actor_id: access.id,
      actor_type: 'staff',
    })

    // Get approved media count and types for workflow
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: mediaAssets } = await (supabase as any)
      .from('media_assets')
      .select('id, type, media_url')
      .eq('listing_id', id)
      .eq('qc_status', 'approved')

    const approvedCount = mediaAssets?.length || 0
    const mediaTypes = [...new Set(mediaAssets?.map((a: { type: string }) => a.type).filter(Boolean) || [])]
    const photoUrls = mediaAssets
      ?.filter((a: { type: string; media_url: string | null }) => a.type === 'photo' && a.media_url)
      .map((a: { media_url: string }) => a.media_url) || []

    // Trigger post-delivery workflow
    // This workflow handles: QC analysis, media tips, delivery notification,
    // care tasks, video creation, content generation, and campaign launch
    try {
      qcLogger.info({ listingId: id, approvedCount, mediaTypes }, 'Triggering post-delivery workflow')

      await executeWorkflow('post-delivery', {
        event: 'qc.approved',
        listingId: id,
        data: {
          agentId: listing.agent_id,
          address: listing.address,
          approvedCount,
          mediaTypes,
          photos: photoUrls,
          approvedAt: new Date().toISOString(),
          approvedBy: access.id,
        },
      })

      qcLogger.info({ listingId: id }, 'Post-delivery workflow triggered successfully')
    } catch (workflowError) {
      // Log but don't fail the request if workflow fails
      qcLogger.error({ listingId: id, ...formatError(workflowError) }, 'Failed to trigger post-delivery workflow')
    }

    // Process team payouts (photographers, videographers, partners)
    try {
      // Get order for this listing
      const { data: order } = await supabase
        .from('orders')
        .select('id, listing_id, total_cents, payment_status, payment_intent_id')
        .eq('listing_id', id)
        .eq('payment_status', 'succeeded')
        .single()

      if (order) {
        qcLogger.info({ listingId: id, orderId: order.id }, 'Processing team payouts')

        const payoutResult = await processJobPayouts(
          {
            id: order.id,
            listing_id: order.listing_id || id,
            total_cents: order.total_cents ?? 0,
            payment_status: order.payment_status || 'succeeded',
          },
          {
            id: listing.id,
            photographer_id: listing.photographer_id || null,
            agent_id: listing.agent_id || '',
          }
        )

        if (payoutResult.success) {
          qcLogger.info({
            listingId: id,
            orderId: order.id,
            photographerPaid: payoutResult.photographerPaid,
            videographerPaid: payoutResult.videographerPaid,
            partnerPaid: payoutResult.partnerPaid,
            poolsAllocated: payoutResult.poolsAllocated,
          }, 'Team payouts processed successfully')
        } else {
          qcLogger.warn({
            listingId: id,
            orderId: order.id,
            errors: payoutResult.errors,
          }, 'Some payouts failed')
        }
      } else {
        qcLogger.info({ listingId: id }, 'No paid order found for listing - skipping payouts')
      }
    } catch (payoutError) {
      // Log but don't fail the request - payouts can be retried manually
      qcLogger.error({ listingId: id, ...formatError(payoutError) }, 'Failed to process team payouts')
    }

    return NextResponse.json({
      success: true,
      listing,
    })
  } catch (error) {
    qcLogger.error({ ...formatError(error) }, 'Error approving listing')
    return NextResponse.json(
      { error: 'Failed to approve listing' },
      { status: 500 }
    )
  }
}
