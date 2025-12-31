// Integrations Complete Workflow
// Automated workflow triggered when all integrations (floor plans, 3D tours, etc.) complete

import { registerWorkflow } from '../orchestrator'
import type { WorkflowDefinition, WorkflowContext } from '../types'

/**
 * Integrations Complete Workflow
 *
 * Trigger: integrations.all_complete
 *
 * This workflow runs when all required integrations (Cubicasa floor plans,
 * Zillow 3D tours, etc.) have finished processing for a listing.
 *
 * Steps:
 * 1. QC Readiness Check - Verify all media is ready for QC
 * 2. Agent Notification - Notify agent that integrations are complete
 */
const integrationsCompleteWorkflow: WorkflowDefinition = {
  id: 'integrations-complete',
  name: 'Integrations Complete',
  description: 'Workflow triggered when all integrations finish processing',
  triggerEvent: 'integrations.all_complete',
  onError: 'continue',

  steps: [
    // Step 1: QC Readiness Check
    {
      agentSlug: 'qc-assistant',
      required: false,
      inputMapper: async (context: WorkflowContext) => {
        return {
          listingId: context.listingId,
          checkType: 'integration_complete',
          completedIntegrations: context.triggerData?.completedIntegrations || [],
        }
      },
      onComplete: async (result, context) => {
        if (result.success && result.output) {
          context.sharedContext.qcReadinessCheck = result.output
          console.log(`QC readiness check completed for listing ${context.listingId}`)
        }
      },
    },

    // Step 2: Agent Status Update Notification
    {
      agentSlug: 'delivery-notifier',
      required: false,
      inputMapper: async (context: WorkflowContext) => {
        return {
          listingId: context.listingId,
          notificationType: 'integrations_complete',
          completedIntegrations: context.triggerData?.completedIntegrations || [],
          message: 'All integrations have completed processing. Your listing is now entering quality review.',
        }
      },
      onComplete: async (result, context) => {
        if (result.success && result.output) {
          context.sharedContext.agentNotified = true
          console.log(`Agent notified of integration completion for listing ${context.listingId}`)
        }
      },
    },
  ],
}

// Register the workflow
registerWorkflow(integrationsCompleteWorkflow)

export default integrationsCompleteWorkflow
