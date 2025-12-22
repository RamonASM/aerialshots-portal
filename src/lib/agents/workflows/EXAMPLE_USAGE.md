# Workflow Orchestrator - Usage Examples

## Example 1: Trigger Post-Delivery Workflow

When a carousel rendering completes, trigger the full post-delivery automation:

```typescript
import { executeWorkflow } from '@/lib/agents'

// In your carousel rendering webhook handler
async function handleCarouselRendered(carouselId: string) {
  const carousel = await getCarousel(carouselId)

  // Trigger post-delivery workflow
  const result = await executeWorkflow('post-delivery', {
    event: 'carousel.rendered',
    listingId: carousel.listing_id,
    campaignId: carousel.campaign_id,
    data: {
      carouselUrls: carousel.image_urls,
      carouselId: carousel.id,
      agentId: carousel.agent_id,
      autoLaunch: true, // Auto-launch marketing campaign
      campaignPreferences: {
        scheduleTime: '2024-01-15T10:00:00Z',
        platforms: ['instagram', 'facebook']
      }
    }
  })

  console.log(`Workflow ${result.workflowId} completed with status: ${result.status}`)

  // Check individual step results
  if (result.stepResults['qc-assistant']?.success) {
    const qcResults = result.stepResults['qc-assistant'].output
    console.log(`QC Priority Score: ${qcResults.priorityScore}`)
  }

  return result
}
```

## Example 2: Trigger New Listing Workflow

When a new listing is created, enrich it with data and send welcome notification:

```typescript
import { executeWorkflow } from '@/lib/agents'

// In your listing creation handler
async function handleNewListing(listingData: ListingInput) {
  const listing = await createListing(listingData)

  // Trigger new listing workflow
  const result = await executeWorkflow('new-listing', {
    event: 'listing.created',
    listingId: listing.id,
    data: {
      address: listing.address,
      city: listing.city,
      state: listing.state,
      zip: listing.zip,
      agentId: listing.agent_id,
      agentEmail: listing.agent?.email,
      beds: listing.beds,
      baths: listing.baths,
      sqft: listing.sqft,
      propertyType: listing.property_type,
      enableNeighborhoodResearch: true,
      includeSchools: true,
      includeDining: true,
      isFirstOrder: listing.is_first_order
    }
  })

  console.log(`New listing workflow completed: ${result.status}`)

  // Access enriched data
  if (result.stepResults['listing-data-enricher']?.success) {
    const enrichedData = result.stepResults['listing-data-enricher'].output
    console.log(`Geocoded coordinates: ${enrichedData.lat}, ${enrichedData.lng}`)
  }

  if (result.stepResults['neighborhood-researcher']?.success) {
    const neighborhoodData = result.stepResults['neighborhood-researcher'].output
    console.log(`Found ${neighborhoodData.totalPlaces} nearby places`)
  }

  return result
}
```

## Example 3: API Endpoint for Workflow Execution

Create an API route to trigger workflows:

```typescript
// app/api/workflows/execute/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { executeWorkflow } from '@/lib/agents'

export async function POST(request: NextRequest) {
  try {
    const { workflowId, trigger } = await request.json()

    // Validate inputs
    if (!workflowId || !trigger?.event) {
      return NextResponse.json(
        { error: 'workflowId and trigger.event are required' },
        { status: 400 }
      )
    }

    // Execute workflow
    const result = await executeWorkflow(workflowId, trigger)

    return NextResponse.json({
      success: result.status === 'completed',
      workflowId: result.workflowId,
      status: result.status,
      completedSteps: result.completedSteps,
      totalSteps: result.totalSteps,
      error: result.error
    })

  } catch (error) {
    console.error('Workflow execution error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Workflow execution failed' },
      { status: 500 }
    )
  }
}

// GET endpoint to check workflow status
export async function GET(request: NextRequest) {
  const workflowId = request.nextUrl.searchParams.get('id')

  if (!workflowId) {
    return NextResponse.json(
      { error: 'workflowId is required' },
      { status: 400 }
    )
  }

  const { getWorkflowExecution } = await import('@/lib/agents')
  const execution = await getWorkflowExecution(workflowId)

  if (!execution) {
    return NextResponse.json(
      { error: 'Workflow not found' },
      { status: 404 }
    )
  }

  return NextResponse.json(execution)
}
```

## Example 4: Webhook Handler Integration

Integrate workflows with webhook events:

```typescript
// app/api/webhooks/bannerbear/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { executeWorkflow } from '@/lib/agents'

export async function POST(request: NextRequest) {
  const payload = await request.json()

  // Bannerbear webhook: carousel rendering complete
  if (payload.event === 'video.ready' || payload.event === 'images.ready') {
    const carouselUid = payload.uid

    // Fetch carousel from database
    const carousel = await getCarouselByBannerbearUid(carouselUid)

    if (!carousel) {
      return NextResponse.json({ error: 'Carousel not found' }, { status: 404 })
    }

    // Update carousel status
    await updateCarousel(carousel.id, {
      render_status: 'completed',
      rendered_image_urls: payload.image_urls,
      rendered_at: new Date().toISOString()
    })

    // Trigger post-delivery workflow
    const workflowResult = await executeWorkflow('post-delivery', {
      event: 'carousel.rendered',
      listingId: carousel.listing_id,
      campaignId: carousel.campaign_id,
      data: {
        carouselId: carousel.id,
        carouselUrls: payload.image_urls,
        agentId: carousel.agent_id,
        autoLaunch: true // Auto-launch if agent has preferences set
      }
    })

    console.log(`Post-delivery workflow triggered: ${workflowResult.workflowId}`)

    return NextResponse.json({
      success: true,
      workflowId: workflowResult.workflowId
    })
  }

  return NextResponse.json({ success: true })
}
```

## Example 5: Monitor Workflow Progress

Check workflow status and progress:

```typescript
import {
  getWorkflowExecution,
  getWorkflowsForResource
} from '@/lib/agents'

// Check specific workflow
async function checkWorkflowStatus(workflowId: string) {
  const workflow = await getWorkflowExecution(workflowId)

  if (!workflow) {
    console.log('Workflow not found')
    return
  }

  console.log(`Workflow: ${workflow.name}`)
  console.log(`Status: ${workflow.status}`)
  console.log(`Progress: ${workflow.current_step} / ${workflow.steps.length}`)

  // Check individual steps
  for (const step of workflow.steps as WorkflowExecutionStep[]) {
    console.log(`  - ${step.agentSlug}: ${step.status}`)
    if (step.error) {
      console.log(`    Error: ${step.error}`)
    }
  }

  if (workflow.error_message) {
    console.log(`Workflow Error: ${workflow.error_message}`)
  }
}

// Get all workflows for a listing
async function getListingWorkflows(listingId: string) {
  const workflows = await getWorkflowsForResource('listing', listingId)

  console.log(`Found ${workflows.length} workflows for listing ${listingId}`)

  for (const workflow of workflows) {
    console.log(`  - ${workflow.name} (${workflow.status})`)
    console.log(`    Triggered: ${workflow.trigger_event}`)
    console.log(`    Created: ${workflow.created_at}`)
  }

  return workflows
}
```

## Example 6: Pause and Resume Workflow

Pause a running workflow and resume later:

```typescript
import { pauseWorkflow, resumeWorkflow } from '@/lib/agents'

// Pause workflow (e.g., if we need manual intervention)
async function pauseForReview(workflowId: string) {
  await pauseWorkflow(workflowId)
  console.log(`Workflow ${workflowId} paused for review`)

  // Send notification to staff
  await sendNotification({
    to: 'operations@aerialshots.media',
    subject: 'Workflow Paused - Review Needed',
    message: `Workflow ${workflowId} has been paused and requires review.`
  })
}

// Resume workflow after review
async function resumeAfterReview(workflowId: string) {
  const result = await resumeWorkflow(workflowId)
  console.log(`Workflow ${workflowId} resumed with status: ${result.status}`)
  return result
}
```

## Example 7: Custom Event-Driven Workflow

Create a custom workflow triggered by your own events:

```typescript
import { executeWorkflow } from '@/lib/agents'

// Trigger workflow when agent uploads media
async function handleMediaUpload(uploadData: MediaUploadData) {
  const result = await executeWorkflow('media-processing', {
    event: 'media.uploaded',
    listingId: uploadData.listingId,
    data: {
      mediaUrls: uploadData.urls,
      mediaType: uploadData.type,
      uploadedBy: uploadData.agentId,
      processingPriority: uploadData.isRush ? 'high' : 'normal'
    }
  })

  return result
}

// Trigger workflow when listing status changes
async function handleListingStatusChange(listingId: string, newStatus: string) {
  if (newStatus === 'under_contract') {
    // Trigger celebration workflow
    await executeWorkflow('listing-celebration', {
      event: 'listing.under_contract',
      listingId,
      data: {
        celebrationType: 'under_contract',
        sendCongrats: true
      }
    })
  }

  if (newStatus === 'sold') {
    // Trigger sold workflow
    await executeWorkflow('listing-sold', {
      event: 'listing.sold',
      listingId,
      data: {
        celebrationType: 'sold',
        requestTestimonial: true,
        offerReferralBonus: true
      }
    })
  }
}
```

## Example 8: Error Handling and Retry

Handle workflow errors and retry if needed:

```typescript
import { executeWorkflow, getWorkflowExecution } from '@/lib/agents'

async function executeWithRetry(
  workflowId: string,
  trigger: WorkflowTrigger,
  maxRetries: number = 3
) {
  let lastError: string | undefined

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await executeWorkflow(workflowId, trigger)

      if (result.status === 'completed') {
        console.log(`Workflow completed successfully on attempt ${attempt}`)
        return result
      }

      if (result.status === 'failed') {
        lastError = result.error
        console.log(`Workflow failed on attempt ${attempt}: ${result.error}`)

        if (attempt < maxRetries) {
          // Wait before retrying (exponential backoff)
          const delay = Math.pow(2, attempt) * 1000
          await new Promise(resolve => setTimeout(resolve, delay))
          console.log(`Retrying workflow (attempt ${attempt + 1})...`)
        }
      }
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'Unknown error'
      console.error(`Workflow execution error on attempt ${attempt}:`, error)

      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }

  throw new Error(`Workflow failed after ${maxRetries} attempts: ${lastError}`)
}

// Usage
try {
  const result = await executeWithRetry('post-delivery', {
    event: 'carousel.rendered',
    listingId: 'listing-123',
    data: { carouselUrls: ['url1', 'url2'] }
  })
  console.log('Workflow succeeded:', result.workflowId)
} catch (error) {
  console.error('Workflow failed permanently:', error)
  // Send alert to operations team
}
```

## Testing Workflows

### Test Individual Steps

```typescript
import { executeAgent } from '@/lib/agents'

// Test QC Assistant independently
const qcResult = await executeAgent({
  agentSlug: 'qc-assistant',
  triggerSource: 'manual',
  input: {
    listingId: 'listing-123',
    readyForQCAt: new Date().toISOString()
  }
})

console.log('QC Result:', qcResult)
```

### Test Full Workflow (Development)

```typescript
import { executeWorkflow } from '@/lib/agents'

// Test with mock data
const testResult = await executeWorkflow('post-delivery', {
  event: 'carousel.rendered',
  listingId: 'test-listing-123',
  data: {
    carouselUrls: ['https://test.com/image1.png'],
    agentId: 'test-agent-456',
    autoLaunch: false // Don't actually launch campaign in test
  }
})

console.log('Test Workflow Result:', testResult)
```
