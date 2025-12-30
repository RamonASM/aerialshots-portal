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

    // Step 3: Content Writer - Generate initial property descriptions
    {
      agentSlug: 'content-writer',
      parallel: 'initial-content',
      required: false,
      condition: async (context: WorkflowContext) => {
        // Only generate descriptions if we have minimum property data
        const listingData = context.sharedContext.listingData as Record<string, unknown> | undefined
        const hasAddress = !!(listingData?.address || context.triggerData?.address)
        const hasBeds = !!(listingData?.beds || context.triggerData?.beds)
        return hasAddress && hasBeds
      },
      inputMapper: async (context: WorkflowContext) => {
        const listingData = context.sharedContext.listingData as Record<string, unknown> | undefined

        const property = {
          address: (listingData?.address || context.triggerData?.address || '') as string,
          city: (listingData?.city || context.triggerData?.city || '') as string,
          state: (listingData?.state || context.triggerData?.state || 'FL') as string,
          zipCode: (listingData?.zipCode || context.triggerData?.zip) as string | undefined,
          beds: (listingData?.beds || context.triggerData?.beds || 0) as number,
          baths: (listingData?.baths || context.triggerData?.baths || 0) as number,
          sqft: (listingData?.sqft || context.triggerData?.sqft || 0) as number,
          price: listingData?.price || context.triggerData?.price,
          yearBuilt: listingData?.yearBuilt || context.triggerData?.yearBuilt,
          propertyType: listingData?.propertyType || context.triggerData?.propertyType,
          features: (listingData?.features || context.triggerData?.features || []) as string[],
          agentName: context.triggerData?.agentName as string | undefined,
        }

        // Use neighborhood data from previous step if available
        const neighborhoodData = context.sharedContext.neighborhoodData as Record<string, unknown> | undefined
        const neighborhood = neighborhoodData ? {
          name: (neighborhoodData.name || '') as string,
          city: property.city,
          state: property.state,
          walkScore: neighborhoodData.walkScore as number | undefined,
          nearbyPlaces: neighborhoodData.nearbyPlaces,
          vibe: neighborhoodData.vibe as string | undefined,
        } : undefined

        return {
          listingId: context.listingId,
          property,
          neighborhood,
          contentTypes: ['description'], // Only descriptions for initial listing
          descriptionStyles: ['professional', 'warm'], // Two styles for agent to choose
          agentName: property.agentName || 'Your Agent',
        }
      },
      onComplete: async (result, context) => {
        if (result.success && result.output) {
          const output = result.output as Record<string, unknown>
          const descriptions = output.descriptions as unknown[] | undefined
          context.sharedContext.initialDescription = {
            descriptions: descriptions,
            generatedAt: output.generatedAt,
          }
          const descCount = descriptions?.length || 0
          console.log(`Generated ${descCount} initial descriptions`)
        }
      },
    },

    // Step 4: Template Selector - Auto-select template (parallel with content-writer)
    {
      agentSlug: 'template-selector',
      parallel: 'initial-content',
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

    // Step 5: Shoot Scheduler - Generate schedule recommendations
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

    // Step 6: Agent Welcome - Send confirmation/welcome notification
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
          // Include generated descriptions
          initialDescription: context.sharedContext.initialDescription,
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
