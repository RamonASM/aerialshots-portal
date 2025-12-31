import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { executeWorkflow } from '@/lib/agents/orchestrator'
import { qcLogger, formatError } from '@/lib/logger'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await params

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
      .select('id, name')
      .eq('email', user.email!)
      .eq('is_active', true)
      .single()

    if (!staff) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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
      actor_id: staff.id,
      actor_type: 'staff',
    })

    // Get approved media count and types for workflow
    const { data: mediaAssets } = await supabase
      .from('media_assets')
      .select('id, type, media_url')
      .eq('listing_id', id)
      .eq('qc_status', 'approved')

    const approvedCount = mediaAssets?.length || 0
    const mediaTypes = [...new Set(mediaAssets?.map(a => a.type).filter(Boolean) || [])]
    const photoUrls = mediaAssets
      ?.filter(a => a.type === 'photo' && a.media_url)
      .map(a => a.media_url) || []

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
          approvedBy: staff.id,
        },
      })

      qcLogger.info({ listingId: id }, 'Post-delivery workflow triggered successfully')
    } catch (workflowError) {
      // Log but don't fail the request if workflow fails
      qcLogger.error({ listingId: id, ...formatError(workflowError) }, 'Failed to trigger post-delivery workflow')
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
