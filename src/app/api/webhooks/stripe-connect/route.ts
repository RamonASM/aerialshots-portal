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
 * - payout.failed: Log payout failures to connected accounts
 * - transfer.reversed: Log when transfers are reversed (e.g., due to charge failure)
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existingEvent } = await (supabase as any)
      .from('processed_events')
      .select('event_id')
      .eq('event_id', event.id)
      .maybeSingle() as { data: { event_id: string } | null }

    if (existingEvent) {
      webhookLogger.info({ eventId: event.id }, 'Event already processed, skipping')
      return NextResponse.json({ received: true, duplicate: true })
    }

    // Record event
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
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
          const adminClient = createAdminClient()

          // Try staff first
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: staff } = await (adminClient as any)
            .from('staff')
            .select('id')
            .eq('stripe_connect_id', account.id)
            .maybeSingle() as { data: { id: string } | null }

          if (staff) {
            entityType = 'staff'
            entityId = staff.id
          } else {
            // Try partners
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: partner } = await (adminClient as any)
              .from('partners')
              .select('id')
              .eq('stripe_connect_id', account.id)
              .maybeSingle() as { data: { id: string } | null }

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

        const adminClient = createAdminClient()

        // Update staff if exists
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (adminClient as any)
          .from('staff')
          .update({
            stripe_connect_status: 'not_started',
            stripe_payouts_enabled: false,
          })
          .eq('stripe_connect_id', accountId)

        // Update partners if exists
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (adminClient as any)
          .from('partners')
          .update({
            stripe_connect_status: 'not_started',
            stripe_payouts_enabled: false,
          })
          .eq('stripe_connect_id', accountId)

        break
      }

      case 'payout.failed': {
        // Payout from connected account failed
        const payout = event.data.object as {
          id: string
          amount: number
          failure_message?: string
          failure_code?: string
        }
        const accountId = event.account

        webhookLogger.error(
          {
            payoutId: payout.id,
            amount: payout.amount,
            accountId,
            failureMessage: payout.failure_message,
            failureCode: payout.failure_code,
          },
          'Payout to connected account failed'
        )

        // Could add notification logic here (email staff/partner, etc.)
        break
      }

      case 'transfer.reversed': {
        // Transfer was reversed (often due to charge failure)
        const transfer = event.data.object as {
          id: string
          amount: number
          amount_reversed: number
          destination: string
          metadata?: {
            order_id?: string
            staff_id?: string
            partner_id?: string
          }
        }

        webhookLogger.warn(
          {
            transferId: transfer.id,
            amount: transfer.amount,
            amountReversed: transfer.amount_reversed,
            destination: transfer.destination,
            orderId: transfer.metadata?.order_id,
            staffId: transfer.metadata?.staff_id,
            partnerId: transfer.metadata?.partner_id,
          },
          'Transfer to connected account was reversed'
        )

        // Could add notification logic here (email admin, etc.)
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
