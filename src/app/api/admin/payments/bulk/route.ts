import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resend } from '@/lib/email/resend'
import { z } from 'zod'

// Zod schema for request validation
const BulkPaymentSchema = z.object({
  action: z.enum(['mark_paid', 'send_reminder', 'void']),
  invoiceIds: z
    .array(z.string().uuid('Invalid invoice ID format'))
    .min(1, 'At least one invoice required')
    .max(100, 'Maximum 100 invoices per batch'),
})

type BulkPaymentRequest = z.infer<typeof BulkPaymentSchema>

// Type for invoice data (table not yet in generated types)
interface InvoiceRow {
  id: string
  amount: number
  due_date: string
  status: string
  agent: { name: string; email: string } | null
  order: { address: string } | null
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication and staff status
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify staff member
    const { data: staff } = await supabase
      .from('staff')
      .select('id, role')
      .eq('email', user.email)
      .eq('is_active', true)
      .single()

    if (!staff) {
      return NextResponse.json({ error: 'Staff access required' }, { status: 403 })
    }

    // Parse and validate request body with Zod
    const rawBody = await request.json()
    const parseResult = BulkPaymentSchema.safeParse(rawBody)

    if (!parseResult.success) {
      const errors = parseResult.error.issues.map((e) => e.message).join(', ')
      return NextResponse.json({ error: errors }, { status: 400 })
    }

    const { action, invoiceIds } = parseResult.data

    // Cast to any since invoices table not yet in generated types
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any

    switch (action) {
      case 'mark_paid': {
        // Mark selected invoices as paid
        const { error: updateError, count } = await db
          .from('invoices')
          .update({
            status: 'paid',
            paid_at: new Date().toISOString(),
            payment_method: 'manual_bulk',
          })
          .in('id', invoiceIds)
          .eq('status', 'pending') // Only update pending invoices

        if (updateError) {
          console.error('Bulk update error:', updateError)
          return NextResponse.json(
            { error: 'Failed to update invoices' },
            { status: 500 }
          )
        }

        return NextResponse.json({
          success: true,
          action: 'mark_paid',
          processed: count || 0,
        })
      }

      case 'send_reminder': {
        // Get invoices with agent info
        const { data: invoices, error: fetchError } = await db
          .from('invoices')
          .select(`
            id,
            amount,
            due_date,
            agent:agents (
              name,
              email
            ),
            order:orders (
              address
            )
          `)
          .in('id', invoiceIds)
          .in('status', ['pending', 'overdue'])

        if (fetchError) {
          console.error('Fetch invoices error:', fetchError)
          return NextResponse.json(
            { error: 'Failed to fetch invoices' },
            { status: 500 }
          )
        }

        if (!invoices?.length) {
          return NextResponse.json({
            success: true,
            action: 'send_reminder',
            sent: 0,
            message: 'No eligible invoices found',
          })
        }

        // Send reminder emails
        let sentCount = 0
        for (const invoice of invoices as InvoiceRow[]) {
          const agent = invoice.agent
          const order = invoice.order

          if (!agent?.email) continue

          try {
            await resend.emails.send({
              from: 'Aerial Shots Media <billing@aerialshots.media>',
              to: agent.email,
              subject: `Payment Reminder: Invoice ${invoice.id.slice(0, 8).toUpperCase()}`,
              html: `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #1a1a1a;">Payment Reminder</h2>

                  <p>Hi ${agent.name.split(' ')[0]},</p>

                  <p>This is a friendly reminder that we have an outstanding invoice for your attention.</p>

                  <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 0 0 8px 0;"><strong>Invoice:</strong> ${invoice.id.slice(0, 8).toUpperCase()}</p>
                    <p style="margin: 0 0 8px 0;"><strong>Property:</strong> ${order?.address || 'N/A'}</p>
                    <p style="margin: 0 0 8px 0;"><strong>Amount:</strong> $${invoice.amount.toFixed(2)}</p>
                    <p style="margin: 0;"><strong>Due:</strong> ${new Date(invoice.due_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                  </div>

                  <p>Please log in to your portal to complete this payment at your earliest convenience.</p>

                  <a href="https://portal.aerialshots.media/dashboard/orders" style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500; margin: 16px 0;">
                    Pay Now
                  </a>

                  <p style="color: #6b7280; font-size: 14px;">
                    If you've already made this payment, please disregard this reminder. Questions? Reply to this email.
                  </p>

                  <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 24px 0;" />

                  <p style="color: #9ca3af; font-size: 12px;">
                    Aerial Shots Media · Orlando, Tampa, Central Florida
                  </p>
                </div>
              `,
            })
            sentCount++
          } catch (emailError) {
            console.error(`Failed to send reminder to ${agent.email}:`, emailError)
          }
        }

        return NextResponse.json({
          success: true,
          action: 'send_reminder',
          sent: sentCount,
          total: invoices.length,
        })
      }

      case 'void': {
        // Void selected invoices
        const { error: updateError, count } = await db
          .from('invoices')
          .update({
            status: 'void',
          })
          .in('id', invoiceIds)
          .neq('status', 'paid') // Can't void paid invoices

        if (updateError) {
          console.error('Bulk void error:', updateError)
          return NextResponse.json(
            { error: 'Failed to void invoices' },
            { status: 500 }
          )
        }

        return NextResponse.json({
          success: true,
          action: 'void',
          processed: count || 0,
        })
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Bulk payment error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
