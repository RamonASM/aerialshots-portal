import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireStaffAccess } from '@/lib/auth/server-access'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

interface BlastRequest {
  campaign_id: string
  test_mode?: boolean // If true, only send to staff emails
  test_emails?: string[]
}

interface RecipientFilter {
  type: 'all' | 'by_last_order' | 'by_service' | 'by_spend' | 'manual'
  params?: {
    days_since_order?: number
    service_types?: string[]
    min_spend?: number
    max_spend?: number
    agent_ids?: string[]
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireStaffAccess()
    const supabase = createAdminClient()

    const body: BlastRequest = await request.json()

    if (!body.campaign_id) {
      return NextResponse.json(
        { error: 'campaign_id is required' },
        { status: 400 }
      )
    }

    // Get campaign
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: campaign, error: campaignError } = await (supabase as any)
      .from('marketing_campaigns')
      .select('*')
      .eq('id', body.campaign_id)
      .single()

    if (campaignError) {
      // Handle table doesn't exist
      if (campaignError.code === '42P01') {
        return NextResponse.json(
          { error: 'Campaign not found' },
          { status: 404 }
        )
      }
      throw campaignError
    }

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      )
    }

    // Check campaign status
    if (campaign.status === 'sent') {
      return NextResponse.json(
        { error: 'Campaign has already been sent' },
        { status: 400 }
      )
    }

    if (campaign.status === 'sending') {
      return NextResponse.json(
        { error: 'Campaign is currently being sent' },
        { status: 400 }
      )
    }

    // Get recipients
    let recipients: { id: string; email: string; name: string }[] = []

    if (body.test_mode && body.test_emails) {
      // Test mode - use provided emails
      recipients = body.test_emails.map((email) => ({
        id: 'test',
        email,
        name: 'Test Recipient',
      }))
    } else {
      // Get recipients based on filter
      const filter = campaign.recipient_filter as RecipientFilter | null
      let query = supabase
        .from('agents')
        .select('id, email, name')
        .not('email', 'is', null)

      if (filter) {
        switch (filter.type) {
          case 'manual':
            if (filter.params?.agent_ids) {
              query = query.in('id', filter.params.agent_ids)
            }
            break

          case 'by_last_order':
            if (filter.params?.days_since_order) {
              // Get agents who have ordered within the specified days
              const cutoffDate = new Date()
              cutoffDate.setDate(cutoffDate.getDate() - filter.params.days_since_order)
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const { data: recentAgents } = await (supabase as any)
                .from('orders')
                .select('agent_id')
                .gte('created_at', cutoffDate.toISOString())
                .not('agent_id', 'is', null) as { data: { agent_id: string }[] | null }
              const agentIds = [...new Set((recentAgents || []).map((o) => o.agent_id))] as string[]
              if (agentIds.length > 0) {
                query = query.in('id', agentIds)
              } else {
                // No matching agents, return empty
                query = query.eq('id', '00000000-0000-0000-0000-000000000000')
              }
            }
            break

          case 'by_service':
            if (filter.params?.service_types && filter.params.service_types.length > 0) {
              // Get agents who have ordered specific service types
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const { data: serviceAgents } = await (supabase as any)
                .from('orders')
                .select('agent_id')
                .in('service_type', filter.params.service_types)
                .not('agent_id', 'is', null) as { data: { agent_id: string }[] | null }
              const serviceAgentIds = [...new Set((serviceAgents || []).map((o) => o.agent_id))] as string[]
              if (serviceAgentIds.length > 0) {
                query = query.in('id', serviceAgentIds)
              } else {
                query = query.eq('id', '00000000-0000-0000-0000-000000000000')
              }
            }
            break

          case 'by_spend': {
            // Get agents based on total spend
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: spendData } = await (supabase as any)
              .rpc('get_agent_total_spend') as { data: { agent_id: string; total_spend: number }[] | null }
            if (spendData) {
              const spendAgentIds = spendData
                .filter((s) => {
                  if (filter.params?.min_spend && s.total_spend < filter.params.min_spend * 100) return false
                  if (filter.params?.max_spend && s.total_spend > filter.params.max_spend * 100) return false
                  return true
                })
                .map((s) => s.agent_id)
              if (spendAgentIds.length > 0) {
                query = query.in('id', spendAgentIds)
              } else {
                query = query.eq('id', '00000000-0000-0000-0000-000000000000')
              }
            }
            break
          }

          case 'all':
          default:
            // No filter needed, get all agents
            break
        }
      }

      const { data: agents, error: agentsError } = await query

      if (agentsError) throw agentsError
      recipients = (agents || []).filter((a) => a.email)
    }

    if (recipients.length === 0) {
      return NextResponse.json(
        { error: 'No recipients found' },
        { status: 400 }
      )
    }

    // Update campaign status to sending
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('marketing_campaigns')
      .update({
        status: 'sending',
        recipient_count: recipients.length,
      })
      .eq('id', campaign.id)

    // Send emails in batches
    const batchSize = 50
    let sentCount = 0
    let failedCount = 0
    const errors: string[] = []

    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize)

      // Create sends records
      const sends = batch.map((recipient) => ({
        campaign_id: campaign.id,
        recipient_email: recipient.email,
        status: 'pending' as const,
      }))

      // Try to insert sends
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any).from('campaign_sends').insert(sends)
      } catch {
        // Table may not exist yet
      }

      // Send emails
      for (const recipient of batch) {
        try {
          // Personalize content
          const personalizedBody = campaign.body
            .replace(/\{\{name\}\}/g, recipient.name || 'Valued Customer')
            .replace(/\{\{email\}\}/g, recipient.email)

          if (process.env.RESEND_API_KEY) {
            await resend.emails.send({
              from: 'Aerial Shots Media <noreply@aerialshots.media>',
              to: recipient.email,
              subject: campaign.subject,
              html: personalizedBody,
            })
          }

          sentCount++

          // Update send status
          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (supabase as any)
              .from('campaign_sends')
              .update({
                status: 'sent',
                sent_at: new Date().toISOString(),
              })
              .eq('campaign_id', campaign.id)
              .eq('recipient_email', recipient.email)
          } catch {
            // Table may not exist
          }
        } catch (sendError) {
          failedCount++
          errors.push(`Failed to send to ${recipient.email}: ${sendError}`)

          // Update send status
          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (supabase as any)
              .from('campaign_sends')
              .update({
                status: 'bounced',
                error_message: String(sendError),
              })
              .eq('campaign_id', campaign.id)
              .eq('recipient_email', recipient.email)
          } catch {
            // Table may not exist
          }
        }
      }
    }

    // Update campaign status
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('marketing_campaigns')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        recipient_count: recipients.length,
      })
      .eq('id', campaign.id)

    return NextResponse.json({
      success: true,
      campaign_id: campaign.id,
      total_recipients: recipients.length,
      sent: sentCount,
      failed: failedCount,
      errors: errors.slice(0, 10), // Only return first 10 errors
    })
  } catch (error) {
    console.error('Error sending blast:', error)
    return NextResponse.json(
      { error: 'Failed to send email blast' },
      { status: 500 }
    )
  }
}
