// New Listing Setup Workflow
// Automated workflow triggered when a new listing is created

import { registerWorkflow } from '../orchestrator'
import type { WorkflowDefinition, WorkflowContext } from '../types'

/**
 * New Listing Setup Workflow
 *
 * Trigger: listing.created
 *
 * Steps:
 * 1. Listing Data Enricher - Geocode address, fetch property data
 * 2. Neighborhood Researcher - Research local area, attractions, schools (conditional)
 * 3. Template Selector - Auto-select best template based on property type
 * 4. Shoot Scheduler - Generate optimal shoot schedule recommendations
 * 5. Agent Welcome - Send welcome/confirmation notification to agent
 */
const newListingWorkflow: WorkflowDefinition = {
  id: 'new-listing',
  name: 'New Listing Setup',
  description: 'Automated setup and enrichment when a new listing is created',
  triggerEvent: 'listing.created',
  onError: 'continue', // Continue even if individual steps fail

  steps: [
    // Step 1: Listing Data Enricher - Geocode and enrich property data
    {
      agentSlug: 'listing-data-enricher',
      required: false,
      inputMapper: async (context: WorkflowContext) => {
        return {
          listingId: context.listingId,
          address: context.triggerData?.address,
          city: context.triggerData?.city,
          state: context.triggerData?.state,
          zip: context.triggerData?.zip,
        }
      },
      onComplete: async (result, context) => {
        if (result.success && result.output) {
          // Store enriched data for downstream steps
          context.sharedContext.listingData = result.output
          context.sharedContext.coordinates = {
            lat: result.output.lat,
            lng: result.output.lng,
          }
          console.log(`Listing data enriched. Coordinates: ${result.output.lat}, ${result.output.lng}`)
        }
      },
    },

    // Step 2: Neighborhood Researcher - Research local area (conditional)
    {
      agentSlug: 'neighborhood-researcher',
      required: false,
      condition: async (context: WorkflowContext) => {
        // Only research neighborhood if:
        // 1. We have valid coordinates from previous step
        // 2. Agent has neighborhood research enabled in preferences
        const hasCoordinates = !!context.sharedContext.coordinates
        const researchEnabled = context.triggerData?.enableNeighborhoodResearch !== false

        if (!hasCoordinates) {
          console.log('Skipping neighborhood research (no coordinates available)')
          return false
        }

        if (!researchEnabled) {
          console.log('Skipping neighborhood research (disabled in preferences)')
          return false
        }

        return true
      },
      inputMapper: async (context: WorkflowContext) => {
        const coords = context.sharedContext.coordinates as { lat: number; lng: number }
        return {
          listingId: context.listingId,
          lat: coords.lat,
          lng: coords.lng,
          address: context.triggerData?.address,
          includeSchools: context.triggerData?.includeSchools !== false,
          includeDining: context.triggerData?.includeDining !== false,
          includeEvents: context.triggerData?.includeEvents !== false,
        }
      },
      onComplete: async (result, context) => {
        if (result.success && result.output) {
          context.sharedContext.neighborhoodData = result.output
          console.log(`Neighborhood research completed. Found ${result.output.totalPlaces || 0} places`)
        }
      },
    },

    // Step 3: Template Selector - Auto-select template
    {
      agentSlug: 'template-selector',
      required: false,
      inputMapper: async (context: WorkflowContext) => {
        const listingData = context.sharedContext.listingData as Record<string, unknown> | undefined
        return {
          listingId: context.listingId,
          propertyType: listingData?.propertyType || context.triggerData?.propertyType,
          beds: listingData?.beds || context.triggerData?.beds,
          baths: listingData?.baths || context.triggerData?.baths,
          sqft: listingData?.sqft || context.triggerData?.sqft,
          price: listingData?.price || context.triggerData?.price,
          agentPreferences: context.triggerData?.agentPreferences,
        }
      },
      onComplete: async (result, context) => {
        if (result.success && result.output) {
          context.sharedContext.selectedTemplate = result.output
          console.log(`Template selected: ${result.output.templateId}`)
        }
      },
    },

    // Step 4: Shoot Scheduler - Generate schedule recommendations (parallel with template)
    {
      agentSlug: 'shoot-scheduler',
      parallel: 'recommendations',
      required: false,
      inputMapper: async (context: WorkflowContext) => {
        const listingData = context.sharedContext.listingData as Record<string, unknown> | undefined
        return {
          listingId: context.listingId,
          address: context.triggerData?.address,
          sqft: listingData?.sqft || context.triggerData?.sqft,
          propertyType: listingData?.propertyType || context.triggerData?.propertyType,
          services: context.triggerData?.services || [],
          isRush: context.triggerData?.isRush === true,
          preferredDate: context.triggerData?.preferredDate,
        }
      },
      onComplete: async (result, context) => {
        if (result.success && result.output) {
          context.sharedContext.scheduleRecommendations = result.output
          const slots = result.output.recommendedSlots as unknown[] | undefined
          console.log(`Generated ${slots?.length || 0} schedule recommendations`)
        }
      },
    },

    // Step 5: Agent Welcome - Send confirmation/welcome notification
    {
      agentSlug: 'agent-welcome-notifier',
      required: true, // Critical - agent must be notified
      inputMapper: async (context: WorkflowContext) => {
        return {
          listingId: context.listingId,
          agentId: context.triggerData?.agentId,
          agentEmail: context.triggerData?.agentEmail,
          listingData: context.sharedContext.listingData,
          neighborhoodData: context.sharedContext.neighborhoodData,
          selectedTemplate: context.sharedContext.selectedTemplate,
          scheduleRecommendations: context.sharedContext.scheduleRecommendations,
          isFirstOrder: context.triggerData?.isFirstOrder === true,
        }
      },
      onComplete: async (result, context) => {
        if (result.success && result.output) {
          context.sharedContext.welcomeNotificationSent = true
          console.log(`Welcome notification sent to agent`)
        }
      },
    },
  ],
}

// Register the workflow
registerWorkflow(newListingWorkflow)

export default newListingWorkflow
