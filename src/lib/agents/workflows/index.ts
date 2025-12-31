// Workflow Definitions Index
// Import and register all workflow definitions

import './post-delivery'
import './new-listing'
import './integrations-complete'
import { executeWorkflow } from '../orchestrator'
import { agentLogger, formatError } from '@/lib/logger'

// Re-export workflow definitions for direct access
export { default as postDeliveryWorkflow } from './post-delivery'
export { default as newListingWorkflow } from './new-listing'
export { default as integrationsCompleteWorkflow } from './integrations-complete'

/**
 * Trigger the new-listing workflow when a listing is created
 *
 * This utility function should be called whenever a new listing is created:
 * - After payment confirmation (via Stripe webhook)
 * - When admin manually creates a listing
 * - When listings are imported from external sources
 *
 * The workflow will:
 * 1. Enrich listing data (geocoding)
 * 2. Research neighborhood
 * 3. Generate initial content
 * 4. Select template
 * 5. Provide scheduling recommendations
 * 6. Send agent welcome notification
 */
export async function triggerNewListingWorkflow(params: {
  listingId: string
  agentId?: string | null
  agentEmail?: string | null
  address?: string
  city?: string
  state?: string
  zip?: string
  sqft?: number
  beds?: number
  baths?: number
  propertyType?: string
  isFirstOrder?: boolean
  services?: string[]
}): Promise<{ success: boolean; workflowId?: string; error?: string }> {
  try {
    agentLogger.info(
      { listingId: params.listingId, agentId: params.agentId },
      'Triggering new-listing workflow'
    )

    const result = await executeWorkflow('new-listing', {
      event: 'listing.created',
      listingId: params.listingId,
      data: {
        agentId: params.agentId,
        agentEmail: params.agentEmail,
        address: params.address,
        city: params.city,
        state: params.state,
        zip: params.zip,
        sqft: params.sqft,
        beds: params.beds,
        baths: params.baths,
        propertyType: params.propertyType,
        isFirstOrder: params.isFirstOrder,
        services: params.services,
      },
    })

    agentLogger.info(
      { listingId: params.listingId, workflowId: result.workflowId, status: result.status },
      'New-listing workflow completed'
    )

    return {
      success: result.status === 'completed',
      workflowId: result.workflowId,
      error: result.error,
    }
  } catch (error) {
    agentLogger.error(
      { listingId: params.listingId, ...formatError(error) },
      'Failed to trigger new-listing workflow'
    )
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Trigger the post-delivery workflow when QC approves media
 *
 * This is typically called from /api/admin/qc/listings/[id]/approve
 * but can also be called manually for re-triggering workflow steps.
 */
export async function triggerPostDeliveryWorkflow(params: {
  listingId: string
  agentId?: string | null
  address?: string
  approvedCount?: number
  mediaTypes?: string[]
  photos?: string[]
}): Promise<{ success: boolean; workflowId?: string; error?: string }> {
  try {
    agentLogger.info(
      { listingId: params.listingId, approvedCount: params.approvedCount },
      'Triggering post-delivery workflow'
    )

    const result = await executeWorkflow('post-delivery', {
      event: 'qc.approved',
      listingId: params.listingId,
      data: {
        agentId: params.agentId,
        address: params.address,
        approvedCount: params.approvedCount,
        mediaTypes: params.mediaTypes,
        photos: params.photos,
        approvedAt: new Date().toISOString(),
      },
    })

    agentLogger.info(
      { listingId: params.listingId, workflowId: result.workflowId, status: result.status },
      'Post-delivery workflow completed'
    )

    return {
      success: result.status === 'completed',
      workflowId: result.workflowId,
      error: result.error,
    }
  } catch (error) {
    agentLogger.error(
      { listingId: params.listingId, ...formatError(error) },
      'Failed to trigger post-delivery workflow'
    )
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// All workflows are auto-registered when this module is imported
