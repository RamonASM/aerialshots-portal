// Post-Delivery Workflow
// Automated workflow triggered when carousel rendering completes

import { registerWorkflow } from '../orchestrator'
import type { WorkflowDefinition, WorkflowContext } from '../types'

/**
 * Post-Delivery Workflow
 *
 * Trigger: carousel.rendered
 *
 * Steps:
 * 1. QC Assistant - Pre-screens photos for quality issues
 * 2. Media Tips - Generates usage tips for the agent (parallel with QC)
 * 3. Delivery Notifier - Sends delivery notification to agent
 * 4. Care Task Generator - Creates follow-up tasks for VA team
 * 5. Campaign Launcher - Auto-launches marketing campaign (conditional)
 */
const postDeliveryWorkflow: WorkflowDefinition = {
  id: 'post-delivery',
  name: 'Post-Delivery Automation',
  description: 'Full automation workflow triggered after media delivery and carousel rendering',
  triggerEvent: 'carousel.rendered',
  onError: 'continue', // Continue even if individual steps fail

  steps: [
    // Step 1: QC Assistant - Analyze media quality
    {
      agentSlug: 'qc-assistant',
      required: false, // Optional - don't block workflow if it fails
      inputMapper: async (context: WorkflowContext) => {
        return {
          listingId: context.listingId,
          readyForQCAt: new Date().toISOString(),
          isVIPClient: context.triggerData?.isVIPClient || false,
          deadline: context.triggerData?.deadline,
        }
      },
      onComplete: async (result, context) => {
        if (result.success && result.output) {
          // Store QC results in shared context for other steps
          context.sharedContext.qcResults = result.output
          console.log(`QC Assistant completed. Priority score: ${result.output.priorityScore}`)
        }
      },
    },

    // Step 2: Media Tips Generator (parallel with QC)
    {
      agentSlug: 'media-tips',
      parallel: 'analysis', // Run in parallel with other 'analysis' steps
      required: false,
      inputMapper: async (context: WorkflowContext) => {
        return {
          listingId: context.listingId,
          campaignId: context.campaignId,
          mediaTypes: context.triggerData?.mediaTypes || ['photo', 'video'],
        }
      },
      onComplete: async (result, context) => {
        if (result.success && result.output) {
          context.sharedContext.mediaTips = result.output
          console.log(`Generated ${result.output.tipCount || 0} media usage tips`)
        }
      },
    },

    // Step 3: Delivery Notifier - Send notification to agent
    {
      agentSlug: 'delivery-notifier',
      required: true, // Critical step - agent must be notified
      inputMapper: async (context: WorkflowContext) => {
        return {
          listingId: context.listingId,
          campaignId: context.campaignId,
          qcResults: context.sharedContext.qcResults,
          mediaTips: context.sharedContext.mediaTips,
          carouselUrls: context.triggerData?.carouselUrls || [],
        }
      },
      onComplete: async (result, context) => {
        if (result.success && result.output) {
          context.sharedContext.deliveryNotificationSent = true
          console.log(`Delivery notification sent to agent`)
        }
      },
    },

    // Step 4: Care Task Generator - Create follow-up tasks
    {
      agentSlug: 'care-task-generator',
      required: false,
      inputMapper: async (context: WorkflowContext) => {
        return {
          listing_id: context.listingId,
          agent_id: context.triggerData?.agentId,
          delivered_at: new Date().toISOString(),
        }
      },
      onComplete: async (result, context) => {
        if (result.success && result.output) {
          context.sharedContext.careTaskCreated = true
          console.log(`Care task created: ${result.output.taskId}`)
        }
      },
    },

    // Step 5: Campaign Launcher - Auto-launch marketing (conditional)
    {
      agentSlug: 'campaign-launcher',
      required: false,
      condition: async (context: WorkflowContext) => {
        // Only launch campaign if:
        // 1. autoLaunch flag is set
        // 2. Agent has campaign preferences configured
        const autoLaunch = context.triggerData?.autoLaunch === true
        const hasPreferences = context.triggerData?.campaignPreferences !== undefined

        const shouldLaunch = autoLaunch && hasPreferences

        if (!shouldLaunch) {
          console.log('Skipping campaign launch (autoLaunch not enabled or no preferences)')
        }

        return shouldLaunch
      },
      inputMapper: async (context: WorkflowContext) => {
        return {
          listingId: context.listingId,
          campaignId: context.campaignId,
          carouselUrls: context.triggerData?.carouselUrls || [],
          preferences: context.triggerData?.campaignPreferences || {},
          autoSchedule: true,
        }
      },
      onComplete: async (result, context) => {
        if (result.success && result.output) {
          context.sharedContext.campaignLaunched = true
          console.log(`Campaign launched: ${result.output.campaignId}`)
        }
      },
    },
  ],
}

// Register the workflow
registerWorkflow(postDeliveryWorkflow)

export default postDeliveryWorkflow
