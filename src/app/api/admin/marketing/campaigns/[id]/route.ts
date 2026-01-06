import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireStaffAccess } from '@/lib/auth/server-access'
import {
  sendCampaign,
  getCampaignStats,
  scheduleCampaign,
  cancelCampaign,
} from '@/lib/marketing/campaigns'
import { apiLogger, formatError } from '@/lib/logger'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/admin/marketing/campaigns/[id]
 * Get campaign details with statistics
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params
    await requireStaffAccess()
    const supabase = createAdminClient()

    // Get campaign
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: campaign, error } = await (supabase as any)
      .from('marketing_campaigns')
      .select('*, created_by_staff:staff!created_by(name, email)')
      .eq('id', id)
      .single()

    if (error || !campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    // Get stats if campaign has been sent
    let stats = null
    if (['sending', 'sent'].includes(campaign.status)) {
      stats = await getCampaignStats(id)
    }

    return NextResponse.json({
      campaign,
      stats,
    })
  } catch (error) {
    apiLogger.error({ error: formatError(error) }, 'Failed to get campaign')
    return NextResponse.json({ error: 'Failed to get campaign' }, { status: 500 })
  }
}

/**
 * PATCH /api/admin/marketing/campaigns/[id]
 * Update campaign (draft only)
 */
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params
    await requireStaffAccess(['admin'])
    const supabase = createAdminClient()

    // Get current campaign
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existingCampaign } = await (supabase as any)
      .from('marketing_campaigns')
      .select('status')
      .eq('id', id)
      .single()

    if (!existingCampaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    if (!['draft', 'scheduled'].includes(existingCampaign.status)) {
      return NextResponse.json(
        { error: 'Can only edit draft or scheduled campaigns' },
        { status: 400 }
      )
    }

    const updates = await request.json()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: campaign, error } = await (supabase as any)
      .from('marketing_campaigns')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({ campaign })
  } catch (error) {
    apiLogger.error({ error: formatError(error) }, 'Failed to update campaign')
    return NextResponse.json({ error: 'Failed to update campaign' }, { status: 500 })
  }
}

/**
 * POST /api/admin/marketing/campaigns/[id]
 * Perform action on campaign (send, schedule, cancel, test)
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params
    const access = await requireStaffAccess(['admin'])
    const supabase = createAdminClient()

    const { action, ...actionParams } = await request.json()

    switch (action) {
      case 'send': {
        const result = await sendCampaign({
          campaignId: id,
          batchSize: actionParams.batchSize,
          delayBetweenBatchesMs: actionParams.delayMs,
        })

        apiLogger.info({
          campaignId: id,
          sentCount: result.sentCount,
          failedCount: result.failedCount,
          staffEmail: access.email,
        }, 'Campaign sent')

        return NextResponse.json({
          success: result.success,
          message: `Sent ${result.sentCount} emails, ${result.failedCount} failed`,
          details: result,
        })
      }

      case 'test': {
        if (!actionParams.testEmails?.length) {
          return NextResponse.json(
            { error: 'Test emails required' },
            { status: 400 }
          )
        }

        const result = await sendCampaign({
          campaignId: id,
          testMode: true,
          testEmails: actionParams.testEmails,
        })

        return NextResponse.json({
          success: result.success,
          message: `Test sent to ${result.sentCount} email(s)`,
          details: result,
        })
      }

      case 'schedule': {
        if (!actionParams.scheduledFor) {
          return NextResponse.json(
            { error: 'scheduledFor date required' },
            { status: 400 }
          )
        }

        await scheduleCampaign(id, actionParams.scheduledFor)

        return NextResponse.json({
          success: true,
          message: `Campaign scheduled for ${actionParams.scheduledFor}`,
        })
      }

      case 'cancel': {
        await cancelCampaign(id)

        return NextResponse.json({
          success: true,
          message: 'Campaign cancelled',
        })
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        )
    }
  } catch (error) {
    apiLogger.error({ error: formatError(error) }, 'Campaign action failed')
    return NextResponse.json({ error: 'Action failed' }, { status: 500 })
  }
}

/**
 * DELETE /api/admin/marketing/campaigns/[id]
 * Delete a campaign (draft/cancelled only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params
    await requireStaffAccess(['admin'])
    const supabase = createAdminClient()

    // Only allow deleting draft or cancelled campaigns
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('marketing_campaigns')
      .delete()
      .eq('id', id)
      .in('status', ['draft', 'cancelled'])

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      message: 'Campaign deleted',
    })
  } catch (error) {
    apiLogger.error({ error: formatError(error) }, 'Failed to delete campaign')
    return NextResponse.json({ error: 'Failed to delete campaign' }, { status: 500 })
  }
}
