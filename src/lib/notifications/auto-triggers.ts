/**
 * Auto-Trigger Notifications
 *
 * Automatically sends notifications based on system events.
 * These functions should be called from status update handlers.
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { notifyReviewRequest, notifyDeliveryReady } from './index'
import { apiLogger, formatError } from '@/lib/logger'

// Default review URL - should be configured per environment
const DEFAULT_REVIEW_URL = process.env.GOOGLE_REVIEW_URL ||
  'https://g.page/r/YOUR_GOOGLE_REVIEW_LINK/review'

const PORTAL_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://portal.aerialshots.media'

// Delay before sending review request (in milliseconds)
// Default: 2 hours after delivery
const REVIEW_REQUEST_DELAY_MS = parseInt(process.env.REVIEW_REQUEST_DELAY_MS || '7200000')

interface ListingDeliveryData {
  listingId: string
  address: string
  agentId: string
  agentName: string
  agentEmail: string
  agentPhone?: string
  deliveredAt: string
  photoCount: number
  videoCount?: number
  photographerName?: string
}

/**
 * Trigger review request notification after delivery
 * Can be called immediately or scheduled for later
 */
export async function triggerReviewRequest(data: ListingDeliveryData): Promise<void> {
  try {
    const reviewUrl = process.env.GOOGLE_REVIEW_URL || DEFAULT_REVIEW_URL
    const portalUrl = `${PORTAL_URL}/delivery/${data.listingId}`

    await notifyReviewRequest(
      {
        email: data.agentEmail,
        phone: data.agentPhone,
        name: data.agentName,
      },
      {
        agentName: data.agentName,
        listingAddress: data.address,
        deliveredAt: new Date(data.deliveredAt).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
        photoCount: data.photoCount,
        videoCount: data.videoCount,
        reviewUrl,
        portalUrl,
        photographerName: data.photographerName,
      }
    )

    apiLogger.info({
      listingId: data.listingId,
      agentEmail: data.agentEmail,
    }, 'Review request notification sent')

    // Log the notification in database
    const supabase = createAdminClient()
    await supabase.from('delivery_notifications').insert({
      listing_id: data.listingId,
      agent_id: data.agentId,
      notification_type: 'email',
      template_key: 'review_request',
      subject: `How did we do? Quick review for ${data.address}`,
      status: 'sent',
      sent_at: new Date().toISOString(),
    })
  } catch (error) {
    apiLogger.error({
      error: formatError(error),
      listingId: data.listingId,
    }, 'Failed to send review request notification')
  }
}

/**
 * Schedule a review request notification for later
 * Uses the delivery_notifications table with scheduled_for
 */
export async function scheduleReviewRequest(
  data: ListingDeliveryData,
  delayMs: number = REVIEW_REQUEST_DELAY_MS
): Promise<void> {
  try {
    const supabase = createAdminClient()
    const scheduledFor = new Date(Date.now() + delayMs).toISOString()

    await supabase.from('delivery_notifications').insert({
      listing_id: data.listingId,
      agent_id: data.agentId,
      notification_type: 'email',
      template_key: 'review_request',
      subject: `How did we do? Quick review for ${data.address}`,
      body: JSON.stringify({
        agentName: data.agentName,
        agentEmail: data.agentEmail,
        agentPhone: data.agentPhone,
        address: data.address,
        deliveredAt: data.deliveredAt,
        photoCount: data.photoCount,
        videoCount: data.videoCount,
        photographerName: data.photographerName,
      }),
      status: 'pending',
      scheduled_for: scheduledFor,
    })

    apiLogger.info({
      listingId: data.listingId,
      scheduledFor,
      delayMs,
    }, 'Review request scheduled')
  } catch (error) {
    apiLogger.error({
      error: formatError(error),
      listingId: data.listingId,
    }, 'Failed to schedule review request')
  }
}

/**
 * Handle listing delivery - sends delivery notification and schedules review request
 */
export async function handleListingDelivered(listingId: string): Promise<void> {
  try {
    const supabase = createAdminClient()

    // Get listing with agent and media info
    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .select(`
        id,
        address,
        delivered_at,
        agent_id,
        agents (
          id,
          name,
          email,
          phone
        )
      `)
      .eq('id', listingId)
      .single()

    if (listingError || !listing) {
      apiLogger.warn({ listingId }, 'Listing not found for delivery notification')
      return
    }

    // Get media counts
    const { data: mediaAssets } = await supabase
      .from('media_assets')
      .select('type')
      .eq('listing_id', listingId)
      .eq('qc_status', 'approved')

    const photoCount = mediaAssets?.filter(m => m.type === 'photo').length || 0
    const videoCount = mediaAssets?.filter(m => m.type === 'video').length || 0

    // Get photographer if assigned
    // Note: FK relationship may not exist in generated types, cast through any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: assignment } = await (supabase as any)
      .from('photographer_assignments')
      .select('staff:staff_id (name)')
      .eq('listing_id', listingId)
      .eq('status', 'completed')
      .single() as { data: { staff: { name: string } | null } | null }

    const agent = listing.agents as { id: string; name: string; email: string; phone?: string } | null

    if (!agent?.email) {
      apiLogger.warn({ listingId }, 'No agent email for delivery notification')
      return
    }

    const deliveryData: ListingDeliveryData = {
      listingId: listing.id,
      address: listing.address,
      agentId: agent.id,
      agentName: agent.name,
      agentEmail: agent.email,
      agentPhone: agent.phone,
      deliveredAt: listing.delivered_at || new Date().toISOString(),
      photoCount,
      videoCount: videoCount > 0 ? videoCount : undefined,
      photographerName: assignment?.staff?.name,
    }

    // Send delivery notification immediately
    await notifyDeliveryReady(
      { email: agent.email, name: agent.name },
      {
        agentName: agent.name,
        listingAddress: listing.address,
        deliveryUrl: `${PORTAL_URL}/delivery/${listingId}`,
      }
    )

    // Schedule review request for later (default: 2 hours)
    await scheduleReviewRequest(deliveryData)

    apiLogger.info({
      listingId,
      agentEmail: agent.email,
    }, 'Delivery notifications triggered')
  } catch (error) {
    apiLogger.error({
      error: formatError(error),
      listingId,
    }, 'Failed to handle listing delivery notifications')
  }
}

/**
 * Process scheduled notifications (should be called by a cron job)
 */
export async function processScheduledNotifications(): Promise<number> {
  const supabase = createAdminClient()
  let processedCount = 0

  try {
    // Get pending notifications that are due
    const { data: pendingNotifications, error } = await supabase
      .from('delivery_notifications')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_for', new Date().toISOString())
      .limit(50)

    if (error || !pendingNotifications?.length) {
      return 0
    }

    for (const notification of pendingNotifications) {
      try {
        if (notification.template_key === 'review_request') {
          const body = JSON.parse(notification.body || '{}')

          await notifyReviewRequest(
            {
              email: body.agentEmail,
              phone: body.agentPhone,
              name: body.agentName,
            },
            {
              agentName: body.agentName,
              listingAddress: body.address,
              deliveredAt: new Date(body.deliveredAt).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              }),
              photoCount: body.photoCount,
              videoCount: body.videoCount,
              reviewUrl: process.env.GOOGLE_REVIEW_URL || DEFAULT_REVIEW_URL,
              portalUrl: `${PORTAL_URL}/delivery/${notification.listing_id}`,
              photographerName: body.photographerName,
            }
          )

          // Mark as sent
          await supabase
            .from('delivery_notifications')
            .update({
              status: 'sent',
              sent_at: new Date().toISOString(),
            })
            .eq('id', notification.id)

          processedCount++
        }
      } catch (notifError) {
        // Mark as failed
        await supabase
          .from('delivery_notifications')
          .update({
            status: 'failed',
            error_message: JSON.stringify(formatError(notifError)),
            retry_count: (notification.retry_count || 0) + 1,
          })
          .eq('id', notification.id)

        apiLogger.error({
          error: formatError(notifError),
          notificationId: notification.id,
        }, 'Failed to process scheduled notification')
      }
    }

    apiLogger.info({ processedCount }, 'Processed scheduled notifications')
    return processedCount
  } catch (error) {
    apiLogger.error({ error: formatError(error) }, 'Failed to process scheduled notifications')
    return 0
  }
}
