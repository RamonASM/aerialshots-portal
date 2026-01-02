// Campaign Launcher Agent
// Auto-starts ListingLaunch carousel campaigns when media is delivered

import { registerAgent } from '../../registry'
import type { AgentExecutionContext, AgentExecutionResult } from '../../types'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'

interface CampaignLauncherInput {
  listing_id: string
  autoLaunch?: boolean // Override agent preference
  campaignType?: 'instagram' | 'facebook' | 'both'
  skipNeighborhoodResearch?: boolean
  carouselTypes?: string[] // Optional carousel types override
}

interface CampaignLauncherOutput {
  campaignId: string
  listingId: string
  status: 'questions_ready' | 'research_pending'
  questionsUrl: string
  neighborhoodResearchStatus: 'started' | 'skipped' | 'completed'
  nextSteps: string[]
}

const CAMPAIGN_LAUNCHER_PROMPT = `You are a marketing campaign orchestrator for real estate listings.

Your role is to automatically initiate ListingLaunch carousel campaigns when media is delivered to agents.

You will:
1. Create a new listing campaign record
2. Optionally trigger neighborhood research (via neighborhood-data agent)
3. Generate initial carousel questions
4. Set the campaign status appropriately

This agent streamlines the transition from media delivery to marketing content generation.`

/**
 * Main agent execution function
 */
async function execute(context: AgentExecutionContext): Promise<AgentExecutionResult> {
  const { input, supabase, listingId: contextListingId } = context
  const campaignInput = input as unknown as CampaignLauncherInput

  try {
    const db = supabase as SupabaseClient<Database>
    const listingId = campaignInput.listing_id || contextListingId

    if (!listingId) {
      return {
        success: false,
        error: 'listing_id is required',
        errorCode: 'MISSING_LISTING_ID',
      }
    }

    // Get listing details with agent info
    const { data: listing, error: listingError } = await db
      .from('listings')
      .select(`
        id,
        address,
        city,
        state,
        lat,
        lng,
        beds,
        baths,
        sqft,
        price,
        agent:agents(
          id,
          email,
          business_name,
          listinglaunch_enabled,
          listinglaunch_auto_launch
        )
      `)
      .eq('id', listingId)
      .single()

    if (listingError || !listing) {
      return {
        success: false,
        error: `Listing not found: ${listingId}`,
        errorCode: 'LISTING_NOT_FOUND',
      }
    }

    // Type assertion for the agent relationship
    const agent = listing.agent as {
      id: string
      email: string
      business_name: string | null
      listinglaunch_enabled: boolean | null
      listinglaunch_auto_launch: boolean | null
    } | null

    if (!agent) {
      return {
        success: false,
        error: 'Listing has no associated agent',
        errorCode: 'NO_AGENT',
      }
    }

    // Check if auto-launch is enabled (input can override agent preference)
    const shouldAutoLaunch = campaignInput.autoLaunch ?? agent.listinglaunch_auto_launch ?? false

    if (!shouldAutoLaunch && !campaignInput.autoLaunch) {
      return {
        success: false,
        error: 'Auto-launch is not enabled for this agent. Set autoLaunch: true to override.',
        errorCode: 'AUTO_LAUNCH_DISABLED',
      }
    }

    // Check if ListingLaunch is enabled for the agent
    if (!agent.listinglaunch_enabled) {
      return {
        success: false,
        error: 'ListingLaunch feature is not enabled for this agent',
        errorCode: 'FEATURE_NOT_ENABLED',
      }
    }

    // Check if a campaign already exists for this listing
    const { data: existingCampaign } = await db
      .from('listing_campaigns')
      .select('id, status')
      .eq('listing_id', listingId)
      .eq('agent_id', agent.id)
      .in('status', ['draft', 'researching', 'questions', 'generating'])
      .maybeSingle()

    if (existingCampaign) {
      // Return existing campaign info
      const questionsUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://portal.aerialshots.media'}/campaigns/${existingCampaign.id}/questions`

      return {
        success: true,
        output: {
          campaignId: existingCampaign.id,
          listingId,
          status: existingCampaign.status === 'questions' ? 'questions_ready' : 'research_pending',
          questionsUrl,
          neighborhoodResearchStatus: existingCampaign.status === 'questions' ? 'completed' : 'started',
          nextSteps: getNextSteps(existingCampaign.status || 'draft'),
          existingCampaign: true,
        },
      }
    }

    // Create new campaign
    const campaignName = `${listing.address}, ${listing.city || ''}, ${listing.state || 'FL'}`.trim()
    const defaultCarouselTypes = campaignInput.carouselTypes || [
      'property_highlights',
      'neighborhood_guide',
      'local_favorites'
    ]

    const { data: campaign, error: campaignError } = await db
      .from('listing_campaigns')
      .insert({
        listing_id: listingId,
        agent_id: agent.id,
        name: campaignName,
        status: 'draft',
        carousel_types: defaultCarouselTypes,
      })
      .select('id')
      .single()

    if (campaignError || !campaign) {
      console.error('Error creating campaign:', campaignError)
      return {
        success: false,
        error: 'Failed to create campaign',
        errorCode: 'CAMPAIGN_CREATE_FAILED',
      }
    }

    const campaignId = campaign.id
    const questionsUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://portal.aerialshots.media'}/campaigns/${campaignId}/questions`

    // Determine if we should run neighborhood research
    const skipResearch = campaignInput.skipNeighborhoodResearch ?? false
    let neighborhoodResearchStatus: 'started' | 'skipped' | 'completed' = 'skipped'
    let campaignStatus: 'questions_ready' | 'research_pending' = 'research_pending'

    if (!skipResearch && listing.lat && listing.lng) {
      // Trigger neighborhood research by calling the research API
      try {
        // Note: In production, this would be an API call or agent execution
        // For now, we'll set status to 'researching' and let the research endpoint handle it
        await db
          .from('listing_campaigns')
          .update({
            status: 'draft', // Keep as draft so research endpoint can claim it
            updated_at: new Date().toISOString(),
          })
          .eq('id', campaignId)

        neighborhoodResearchStatus = 'started'
        campaignStatus = 'research_pending'
      } catch (error) {
        console.error('Error initiating neighborhood research:', error)
        // Continue with campaign creation even if research fails
        neighborhoodResearchStatus = 'skipped'
      }
    } else if (skipResearch) {
      // If skipping research, move directly to questions status
      await db
        .from('listing_campaigns')
        .update({
          status: 'questions',
          updated_at: new Date().toISOString(),
        })
        .eq('id', campaignId)

      campaignStatus = 'questions_ready'
    } else {
      // No coordinates, can't do research
      await db
        .from('listing_campaigns')
        .update({
          status: 'questions',
          updated_at: new Date().toISOString(),
        })
        .eq('id', campaignId)

      neighborhoodResearchStatus = 'skipped'
      campaignStatus = 'questions_ready'
    }

    const output: CampaignLauncherOutput = {
      campaignId,
      listingId,
      status: campaignStatus,
      questionsUrl,
      neighborhoodResearchStatus,
      nextSteps: getNextSteps(
        skipResearch || !listing.lat || !listing.lng ? 'questions' : 'draft'
      ),
    }

    return {
      success: true,
      output: output as any,
      tokensUsed: 0, // No AI generation in this agent
    }
  } catch (error) {
    console.error('Campaign launcher error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      errorCode: 'EXECUTION_ERROR',
    }
  }
}

/**
 * Get next steps based on campaign status
 */
function getNextSteps(status: string): string[] {
  switch (status) {
    case 'draft':
      return [
        'Campaign created successfully',
        'Neighborhood research will be initiated',
        'Questions will be generated after research completes',
        'You will receive a notification when questions are ready',
      ]
    case 'researching':
      return [
        'Neighborhood research in progress',
        'Gathering data from Google Places, Ticketmaster, and more',
        'Questions will be generated when research completes',
      ]
    case 'questions':
      return [
        'Campaign is ready for your input',
        'Answer personalized questions to enhance carousel content',
        'Navigate to the questions URL to begin',
        'Generate carousels after answering questions',
      ]
    case 'generating':
      return [
        'Carousel content is being generated',
        'This may take a few minutes',
        'You will be notified when carousels are ready',
      ]
    case 'completed':
      return [
        'Campaign is complete',
        'Review and download your carousel images',
        'Schedule posts or download for manual posting',
      ]
    default:
      return ['Campaign status: ' + status]
  }
}

// Register the agent
registerAgent({
  slug: 'campaign-launcher',
  name: 'Campaign Launcher',
  description:
    'Auto-starts ListingLaunch carousel campaigns when media is delivered. Creates campaign, triggers neighborhood research, and sets up initial questions.',
  category: 'content',
  executionMode: 'triggered',
  systemPrompt: CAMPAIGN_LAUNCHER_PROMPT,
  config: {
    maxTokens: 0, // No AI generation needed
    temperature: 0,
    timeout: 30000, // 30 seconds
  },
  execute,
})
