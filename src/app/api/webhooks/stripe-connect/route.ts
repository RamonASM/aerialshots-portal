import { NextRequest, NextResponse } from 'next/server'
import { verifyConnectWebhook, syncAccountStatus } from '@/lib/payments/stripe-connect'
import { createAdminClient } from '@/lib/supabase/admin'
import { webhookLogger } from '@/lib/logger'

/**
 * POST /api/webhooks/stripe-connect
 * Handle Stripe Connect webhook events
 *
 * Events handled:
 * - account.updated: Sync account status when charges/payouts enabled changes
 * - account.application.deauthorized: Mark account as disconnected
 */
export async function POST(request: NextRequest) {
  try {
    // Get raw body and signature
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')

    if (!signature) {
      webhookLogger.warn('Missing Stripe signature header')
      return NextResponse.json(
        { error: 'Missing signature header' },
        { status: 400 }
      )
    }

    // Verify webhook signature
    const event = verifyConnectWebhook(body, signature)
    if (!event) {
      webhookLogger.warn('Webhook signature verification failed')
      return NextResponse.json(
        { error: 'Webhook verification failed' },
        { status: 400 }
      )
    }

    webhookLogger.info({ eventType: event.type }, 'Received Connect webhook')

    const supabase = createAdminClient()

    // Check for idempotency
    const { data: existingEvent } = await supabase
      .from('processed_events')
      .select('event_id')
      .eq('event_id', event.id)
      .single()

    if (existingEvent) {
      webhookLogger.info({ eventId: event.id }, 'Event already processed, skipping')
      return NextResponse.json({ received: true, duplicate: true })
    }

    // Record event
    await supabase
      .from('processed_events')
      .insert({
        event_id: event.id,
        provider: 'stripe_connect',
        metadata: { type: event.type }
      })

    switch (event.type) {
      case 'account.updated': {
        const account = event.data.object as {
          id: string
          charges_enabled: boolean
          payouts_enabled: boolean
          details_submitted?: boolean
          metadata?: {
            entity_type?: string
            entity_id?: string
          }
        }

        // Get entity info from metadata or lookup from database
        let entityType = account.metadata?.entity_type as 'staff' | 'partner' | undefined
        let entityId = account.metadata?.entity_id

        if (!entityType || !entityId) {
          // Lookup from database if not in metadata
          const supabase = createAdminClient()

          // Try staff first
          const { data: staff } = await supabase
            .from('staff')
            .select('id')
            .eq('stripe_connect_id', account.id)
            .single()

          if (staff) {
            entityType = 'staff'
            entityId = staff.id
          } else {
            // Try partners
            const { data: partner } = await supabase
              .from('partners')
              .select('id')
              .eq('stripe_connect_id', account.id)
              .single()

            if (partner) {
              entityType = 'partner'
              entityId = partner.id
            }
          }
        }

        if (entityType && entityId) {
          webhookLogger.info(
            { accountId: account.id, entityType, entityId },
            'Syncing account status'
          )

          await syncAccountStatus({
            type: entityType,
            entityId,
            accountId: account.id,
          })
        } else {
          webhookLogger.warn(
            { accountId: account.id },
            'Could not find entity for Connect account'
          )
        }

        break
      }

      case 'account.application.deauthorized': {
        // Account was disconnected from the platform
        const accountId = event.account || (event.data.object as { id: string }).id

        webhookLogger.info({ accountId }, 'Account deauthorized')

        const supabase = createAdminClient()

        // Update staff if exists
        await supabase
          .from('staff')
          .update({
            stripe_connect_status: 'not_started',
            stripe_payouts_enabled: false,
          })
          .eq('stripe_connect_id', accountId)

        // Update partners if exists
        await supabase
          .from('partners')
          .update({
            stripe_connect_status: 'not_started',
            stripe_payouts_enabled: false,
          })
          .eq('stripe_connect_id', accountId)

        break
      }

      default:
        // Acknowledge unhandled events
        webhookLogger.info({ eventType: event.type }, 'Unhandled event type')
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    webhookLogger.error({ error }, 'Error processing Connect webhook')
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}
