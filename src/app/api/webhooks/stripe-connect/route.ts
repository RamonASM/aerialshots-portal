import { NextRequest, NextResponse } from 'next/server'
import { verifyConnectWebhook, syncAccountStatus, ConnectAccountType } from '@/lib/payments/stripe-connect'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * POST /api/webhooks/stripe-connect
 * Handle Stripe Connect webhook events
 *
 * Events handled:
 * - account.updated: Sync account status to database
 * - transfer.created: Log successful transfer
 * - transfer.reversed: Mark payout as reversed
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')

    if (!signature) {
      console.error('[Connect Webhook] Missing signature')
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
    }

    // Verify webhook signature
    const event = verifyConnectWebhook(body, signature)
    if (!event) {
      console.error('[Connect Webhook] Invalid signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    console.log('[Connect Webhook] Received event:', event.type)

    const supabase = createAdminClient()

    switch (event.type) {
      case 'account.updated': {
        const account = event.data.object as {
          id: string
          metadata?: { entity_type?: string; entity_id?: string }
        }

        const entityType = account.metadata?.entity_type as ConnectAccountType | undefined
        const entityId = account.metadata?.entity_id

        if (!entityType || !entityId) {
          // Try to find the account in our database
          const { data: staff } = await supabase
            .from('staff')
            .select('id')
            .eq('stripe_connect_id', account.id)
            .single()

          if (staff) {
            await syncAccountStatus({
              type: 'staff',
              entityId: staff.id,
              accountId: account.id,
            })
            console.log('[Connect Webhook] Synced staff account:', account.id)
          } else {
            const { data: partner } = await supabase
              .from('partners')
              .select('id')
              .eq('stripe_connect_id', account.id)
              .single()

            if (partner) {
              await syncAccountStatus({
                type: 'partner',
                entityId: partner.id,
                accountId: account.id,
              })
              console.log('[Connect Webhook] Synced partner account:', account.id)
            } else {
              console.warn('[Connect Webhook] Unknown account:', account.id)
            }
          }
        } else {
          await syncAccountStatus({
            type: entityType,
            entityId,
            accountId: account.id,
          })
          console.log(`[Connect Webhook] Synced ${entityType} account:`, account.id)
        }
        break
      }

      case 'transfer.created': {
        const transfer = event.data.object as {
          id: string
          metadata?: { order_id?: string; staff_id?: string; partner_id?: string }
        }

        console.log('[Connect Webhook] Transfer created:', transfer.id, transfer.metadata)
        // Transfer is already recorded when we create it - this is just for logging
        break
      }

      case 'transfer.reversed': {
        const transfer = event.data.object as {
          id: string
          metadata?: { order_id?: string; staff_id?: string; partner_id?: string }
        }

        const orderId = transfer.metadata?.order_id
        const staffId = transfer.metadata?.staff_id
        const partnerId = transfer.metadata?.partner_id

        console.log('[Connect Webhook] Transfer reversed:', transfer.id)

        // Update staff payout record
        if (staffId) {
          await supabase
            .from('staff_payouts')
            .update({
              status: 'reversed',
              reversed_at: new Date().toISOString(),
              reversal_reason: 'Transfer reversed via Stripe',
            })
            .eq('stripe_transfer_id', transfer.id)
        }

        // Update partner payout record
        if (partnerId) {
          await supabase
            .from('partner_payouts')
            .update({
              status: 'reversed',
              reversed_at: new Date().toISOString(),
              reversal_reason: 'Transfer reversed via Stripe',
            })
            .eq('stripe_transfer_id', transfer.id)
        }

        break
      }

      case 'payout.paid': {
        // When Stripe pays out to connected account's bank
        console.log('[Connect Webhook] Payout paid to connected account')
        break
      }

      case 'payout.failed': {
        // When payout to connected account fails
        const payout = event.data.object as { id: string; failure_message?: string }
        console.error('[Connect Webhook] Payout failed:', payout.id, payout.failure_message)
        // Could add notification to admin here
        break
      }

      default:
        console.log('[Connect Webhook] Unhandled event type:', event.type)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('[Connect Webhook] Error processing webhook:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}
