import { createClient } from '@/lib/supabase/server'
import { sendNotification } from '@/lib/notifications'
import { executeWorkflow } from '@/lib/agents/orchestrator'
import { integrationLogger, formatError } from '@/lib/logger'
import type { IntegrationStatus, Zillow3DStatus } from '@/lib/supabase/types'

/**
 * Integration Handoff Workflow
 *
 * Handles automated notifications and status updates when integrations complete.
 * Called from webhook handlers when integration status changes.
 */

type IntegrationType = 'cubicasa' | 'zillow_3d'

interface HandoffContext {
  listingId: string
  integration: IntegrationType
  previousStatus: string
  newStatus: IntegrationStatus | Zillow3DStatus
  externalId?: string
}

/**
 * Process integration status change and trigger appropriate handoffs
 */
export async function processIntegrationHandoff(context: HandoffContext): Promise<void> {
  const { listingId, integration, previousStatus, newStatus } = context

  integrationLogger.info({ listingId, integration, previousStatus, newStatus }, `Integration status change: ${integration} ${previousStatus} → ${newStatus}`)

  const supabase = await createClient()

  // Get listing details
  const { data: listing, error } = await supabase
    .from('listings')
    .select(`
      id,
      address,
      agent_id,
      ops_status,
      cubicasa_status,
      zillow_3d_status
    `)
    .eq('id', listingId)
    .single()

  if (error || !listing) {
    integrationLogger.warn({ listingId }, 'Listing not found for integration handoff')
    return
  }

  // Handle specific integration completions
  if (newStatus === 'delivered' || newStatus === 'live') {
    await handleIntegrationComplete(listing, integration)
  } else if (newStatus === 'failed' || newStatus === 'needs_manual') {
    await handleIntegrationFailed(listing, integration, context)
  }
}

/**
 * Handle successful integration completion
 */
async function handleIntegrationComplete(
  listing: {
    id: string
    address: string
    agent_id: string | null
    ops_status: string | null
    cubicasa_status: string | null
    zillow_3d_status: string | null
  },
  integration: IntegrationType
): Promise<void> {
  const supabase = await createClient()

  // Notify QC team that integration is ready for review
  const integrationNames: Record<IntegrationType, string> = {
    cubicasa: 'Floor plans',
    zillow_3d: '3D tour',
  }

  // Get QC staff to notify
  const { data: qcStaff } = await supabase
    .from('staff')
    .select('id, email, phone, name')
    .eq('role', 'editor') // QC staff are typically editors
    .eq('is_active', true)
    .limit(3)

  if (qcStaff && qcStaff.length > 0) {
    // Send notification to QC team
    for (const staff of qcStaff) {
      try {
        await sendNotification({
          type: 'integration_complete',
          recipient: {
            email: staff.email,
            phone: staff.phone || undefined,
            name: staff.name,
          },
          channel: staff.phone ? 'both' : 'email',
          data: {
            recipientName: staff.name,
            integrationName: integrationNames[integration],
            propertyAddress: listing.address,
            listingId: listing.id,
            dashboardUrl: `/admin/ops/jobs/${listing.id}`,
          },
        })
      } catch (notifyError) {
        integrationLogger.error({ staffId: staff.id, listingId: listing.id, ...formatError(notifyError) }, 'Failed to notify staff of integration completion')
      }
    }
  }

  // Check if ALL required integrations are complete
  const allComplete = await checkAllIntegrationsComplete(listing)

  if (allComplete) {
    integrationLogger.info({ listingId: listing.id }, 'All integrations complete, updating ops_status')

    // Trigger integrations-complete workflow for any post-integration automation
    try {
      await executeWorkflow('integrations-complete', {
        event: 'integrations.all_complete',
        listingId: listing.id,
        data: {
          agentId: listing.agent_id,
          address: listing.address,
          completedIntegrations: ['cubicasa', 'zillow_3d'].filter(i => {
            if (i === 'cubicasa') return listing.cubicasa_status === 'delivered'
            if (i === 'zillow_3d') return listing.zillow_3d_status === 'live'
            return false
          }),
        },
      })
    } catch (workflowError) {
      // Log but don't block status update if workflow fails
      integrationLogger.error({ listingId: listing.id, ...formatError(workflowError) }, 'Failed to trigger integrations-complete workflow')
    }

    // If all integrations are done and we're in an earlier stage, advance to ready_for_qc
    if (listing.ops_status && ['staged', 'processing'].includes(listing.ops_status)) {
      const { error: updateError } = await supabase
        .from('listings')
        .update({
          ops_status: 'ready_for_qc',
        })
        .eq('id', listing.id)

      if (updateError) {
        integrationLogger.error({ listingId: listing.id, ...formatError(updateError) }, 'Failed to update ops_status to ready_for_qc')
      } else {
        // Log the status change
        await supabase.from('job_events').insert({
          listing_id: listing.id,
          event_type: 'auto_status_advance',
          new_value: {
            ops_status: 'ready_for_qc',
            reason: 'all_integrations_complete',
          },
          actor_type: 'system',
        })

        // Notify agent that their listing is ready for QC
        if (listing.agent_id) {
          const { data: agent } = await supabase
            .from('agents')
            .select('email, name')
            .eq('id', listing.agent_id)
            .single()

          if (agent) {
            try {
              await sendNotification({
                type: 'status_update',
                recipient: {
                  email: agent.email,
                  name: agent.name,
                },
                channel: 'email',
                data: {
                  agentName: agent.name,
                  listingAddress: listing.address,
                  previousStatus: listing.ops_status,
                  newStatus: 'ready_for_qc',
                  message: 'All media processing is complete and your listing is entering quality review.',
                },
              })
            } catch (notifyError) {
              integrationLogger.error({ agentId: listing.agent_id, listingId: listing.id, ...formatError(notifyError) }, 'Failed to notify agent of ready_for_qc status')
            }
          }
        }
      }
    }
  }
}

/**
 * Handle integration failure
 */
async function handleIntegrationFailed(
  listing: {
    id: string
    address: string
    agent_id: string | null
    ops_status: string | null
  },
  integration: IntegrationType,
  context: HandoffContext
): Promise<void> {
  const supabase = await createClient()

  const integrationNames: Record<IntegrationType, string> = {
    cubicasa: 'Cubicasa (floor plans)',
    zillow_3d: 'Zillow 3D (virtual tour)',
  }

  // Get ops manager to notify
  const { data: managers } = await supabase
    .from('staff')
    .select('id, email, phone, name')
    .eq('role', 'admin')
    .eq('is_active', true)
    .limit(2)

  if (managers && managers.length > 0) {
    for (const manager of managers) {
      try {
        await sendNotification({
          type: 'integration_failed',
          recipient: {
            email: manager.email,
            phone: manager.phone || undefined,
            name: manager.name,
          },
          channel: manager.phone ? 'both' : 'email',
          data: {
            recipientName: manager.name,
            integrationName: integrationNames[integration],
            propertyAddress: listing.address,
            listingId: listing.id,
            status: context.newStatus,
            dashboardUrl: `/admin/ops/jobs/${listing.id}`,
          },
        })
      } catch (notifyError) {
        integrationLogger.error({ managerId: manager.id, listingId: listing.id, ...formatError(notifyError) }, 'Failed to notify manager of integration failure')
      }
    }
  }

  // Log the failure event
  await supabase.from('job_events').insert({
    listing_id: listing.id,
    event_type: 'integration_failure',
    new_value: {
      integration,
      status: context.newStatus,
      external_id: context.externalId,
    },
    actor_type: 'system',
  })
}

/**
 * Check if all required integrations are complete
 */
async function checkAllIntegrationsComplete(listing: {
  cubicasa_status: string | null
  zillow_3d_status: string | null
}): Promise<boolean> {
  // Integrations are complete if they're either "delivered"/"live" OR "not_applicable"
  const cubicasaComplete =
    listing.cubicasa_status === 'delivered' || listing.cubicasa_status === 'not_applicable'
  const zillow3dComplete =
    listing.zillow_3d_status === 'live' || listing.zillow_3d_status === 'not_applicable'

  return cubicasaComplete && zillow3dComplete
}

/**
 * Utility function to trigger handoff from webhook handlers
 */
export async function triggerIntegrationHandoff(
  listingId: string,
  integration: IntegrationType,
  previousStatus: string,
  newStatus: IntegrationStatus | Zillow3DStatus,
  externalId?: string
): Promise<void> {
  await processIntegrationHandoff({
    listingId,
    integration,
    previousStatus,
    newStatus,
    externalId,
  })
}
