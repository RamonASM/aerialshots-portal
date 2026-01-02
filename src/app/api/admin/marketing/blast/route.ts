import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
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
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is staff
    const { data: staff } = await supabase
      .from('staff')
      .select('id')
      .eq('email', user.email!)
      .eq('is_active', true)
      .single()

    if (!staff) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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
        if (filter.type === 'manual' && filter.params?.agent_ids) {
          query = query.in('id', filter.params.agent_ids)
        }
        // TODO: Add other filter types (by_last_order, by_service, by_spend)
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
