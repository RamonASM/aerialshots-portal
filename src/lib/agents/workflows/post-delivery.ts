// Post-Delivery Workflow
// Automated workflow triggered when carousel rendering completes

import { registerWorkflow } from '../orchestrator'
import type { WorkflowDefinition, WorkflowContext } from '../types'

/**
 * Post-Delivery Workflow
 *
 * Trigger: qc.approved (when QC staff approves media for delivery)
 *
 * Steps:
 * 1. QC Assistant - Analyzes approved media for quality insights
 * 2. Media Tips - Generates usage tips for the agent (parallel with QC)
 * 3. Delivery Notifier - Sends delivery notification to agent
 * 4. Care Task Generator - Creates follow-up tasks for VA team
 * 5. Video Creator - Creates slideshow video if 3+ photos
 * 6. Content Writer - Generates descriptions and social captions
 * 7. Campaign Launcher - Auto-launches marketing campaign (conditional)
 */
const postDeliveryWorkflow: WorkflowDefinition = {
  id: 'post-delivery',
  name: 'Post-Delivery Automation',
  description: 'Full automation workflow triggered after QC approval of media for delivery',
  triggerEvent: 'qc.approved',
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

    // Step 5: Video Creator - Create slideshow and social reel
    {
      agentSlug: 'video-creator',
      parallel: 'content-gen',
      required: false,
      condition: async (context: WorkflowContext): Promise<boolean> => {
        // Only create videos if we have at least 3 photos
        const photos = context.triggerData?.photos || context.sharedContext.photos as string[] | undefined
        return !!(photos && Array.isArray(photos) && photos.length >= 3)
      },
      inputMapper: async (context: WorkflowContext) => {
        const photos = (context.triggerData?.photos || context.sharedContext.photos || []) as string[]
        return {
          listingId: context.listingId,
          photos: photos,
          videoType: 'slideshow',
          aspectRatio: '16:9',
          transition: 'kenburns',
          outputFormat: 'mp4',
        }
      },
      onComplete: async (result, context) => {
        if (result.success && result.output) {
          const output = result.output as Record<string, unknown>
          context.sharedContext.slideshowVideo = {
            videoPath: output.videoPath as string,
            videoUrl: output.videoUrl as string,
            thumbnailPath: output.thumbnailPath as string,
            durationSeconds: output.durationSeconds as number,
          }
          console.log(`Slideshow video created: ${output.durationSeconds}s`)
        }
      },
    },

    // Step 6: Content Writer - Generate descriptions and social captions
    {
      agentSlug: 'content-writer',
      parallel: 'content-gen',
      required: false,
      inputMapper: async (context: WorkflowContext) => {
        const listingData = (context.sharedContext.listingData || context.triggerData?.listing || {}) as Record<string, unknown>

        const property = {
          address: (listingData.address || context.triggerData?.address || '') as string,
          city: (listingData.city || context.triggerData?.city || '') as string,
          state: (listingData.state || context.triggerData?.state || 'FL') as string,
          beds: (listingData.beds || context.triggerData?.beds || 0) as number,
          baths: (listingData.baths || context.triggerData?.baths || 0) as number,
          sqft: (listingData.sqft || context.triggerData?.sqft || 0) as number,
          price: listingData.price || context.triggerData?.price,
          propertyType: listingData.propertyType || context.triggerData?.propertyType,
          features: (listingData.features || context.triggerData?.features || []) as string[],
          agentName: context.triggerData?.agentName as string | undefined,
        }

        const neighborhood = context.sharedContext.neighborhoodData || undefined

        return {
          listingId: context.listingId,
          property,
          neighborhood,
          contentTypes: ['description', 'social'],
          descriptionStyles: ['professional', 'warm', 'luxury'],
          socialPlatforms: ['instagram', 'facebook', 'tiktok'],
          agentName: property.agentName || 'Your Agent',
        }
      },
      onComplete: async (result, context) => {
        if (result.success && result.output) {
          const output = result.output as Record<string, unknown>
          context.sharedContext.generatedContent = {
            descriptions: output.descriptions,
            socialCaptions: output.socialCaptions,
            generatedAt: output.generatedAt,
          }
          console.log(`Generated ${output.totalItemsGenerated || 0} content items`)
        }
      },
    },

    // Step 7: Campaign Launcher - Auto-launch marketing (conditional)
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
        const slideshowVideo = context.sharedContext.slideshowVideo as Record<string, unknown> | undefined
        const generatedContent = context.sharedContext.generatedContent as Record<string, unknown> | undefined

        return {
          listingId: context.listingId,
          campaignId: context.campaignId,
          carouselUrls: context.triggerData?.carouselUrls || [],
          preferences: context.triggerData?.campaignPreferences || {},
          autoSchedule: true,
          // Pass generated content and video URLs from previous steps
          videoUrls: slideshowVideo ? {
            slideshow: slideshowVideo.videoUrl,
            thumbnail: slideshowVideo.thumbnailPath,
          } : undefined,
          generatedDescriptions: generatedContent?.descriptions,
          socialCaptions: generatedContent?.socialCaptions,
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
