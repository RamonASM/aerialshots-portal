# Agent Workflow Orchestrator

The workflow orchestrator enables multi-step automated workflows that chain together multiple AI agents with context passing between steps.

## Overview

Workflows allow you to:
- Execute multiple agents sequentially or in parallel
- Pass data between agent steps via shared context
- Conditionally execute steps based on runtime conditions
- Handle errors gracefully (continue or stop on failure)
- Track workflow execution in the database

## Architecture

### Key Components

1. **Workflow Definition** - Declares the workflow structure
2. **Orchestrator** - Executes workflows and manages state
3. **Workflow Context** - Shared state passed between steps
4. **Step Results** - Output from each agent stored for downstream use

### Workflow Lifecycle

1. **Trigger** - Workflow triggered by event (e.g., `carousel.rendered`)
2. **Initialize** - Create workflow execution record in database
3. **Execute Steps** - Run agents sequentially/parallel based on configuration
4. **Context Passing** - Each step can access outputs from previous steps
5. **Complete** - Update workflow status and store final results

## Creating a Workflow

### Basic Structure

```typescript
import { registerWorkflow } from '../orchestrator'
import type { WorkflowDefinition } from '../types'

const myWorkflow: WorkflowDefinition = {
  id: 'my-workflow',
  name: 'My Workflow',
  description: 'Does something useful',
  triggerEvent: 'my.event',
  onError: 'continue', // or 'stop'

  steps: [
    {
      agentSlug: 'agent-1',
      required: true,
      inputMapper: async (context) => ({
        data: context.triggerData?.someValue
      }),
      onComplete: async (result, context) => {
        context.sharedContext.step1Result = result.output
      }
    },
    {
      agentSlug: 'agent-2',
      condition: async (context) => {
        return context.sharedContext.step1Result?.shouldContinue === true
      },
      inputMapper: async (context) => ({
        previousData: context.sharedContext.step1Result
      })
    }
  ]
}

registerWorkflow(myWorkflow)
export default myWorkflow
```

### Step Configuration

#### Required Fields

- `agentSlug` - The agent to execute

#### Optional Fields

- `required` (boolean) - If true, workflow fails if this step fails
- `parallel` (string) - Group ID for parallel execution
- `condition` (function) - Return true/false to execute step conditionally
- `inputMapper` (function) - Transform context into agent input
- `onComplete` (function) - Callback after step completes

### Parallel Execution

Steps with the same `parallel` value execute concurrently:

```typescript
steps: [
  {
    agentSlug: 'qc-assistant',
    parallel: 'analysis'
  },
  {
    agentSlug: 'media-tips',
    parallel: 'analysis'
  },
  // Both run in parallel, then workflow continues
  {
    agentSlug: 'delivery-notifier'
    // Runs after parallel group completes
  }
]
```

### Conditional Steps

Use `condition` to skip steps based on runtime data:

```typescript
{
  agentSlug: 'campaign-launcher',
  condition: async (context) => {
    // Only launch if auto-launch is enabled
    return context.triggerData?.autoLaunch === true
  }
}
```

### Context Passing

The workflow context is shared across all steps:

```typescript
interface WorkflowContext {
  workflowId: string
  triggerEvent: string
  triggerData?: Record<string, unknown>
  listingId?: string
  campaignId?: string
  currentStep: number
  stepResults: Record<string, AgentExecutionResult>
  sharedContext: Record<string, unknown>
}
```

**Access previous step outputs:**

```typescript
inputMapper: async (context) => {
  // Access by agent slug
  const qcResults = context.stepResults['qc-assistant']?.output

  // Access from shared context
  const customData = context.sharedContext.myCustomField

  return {
    qcResults,
    customData
  }
}
```

**Store data for downstream steps:**

```typescript
onComplete: async (result, context) => {
  if (result.success) {
    context.sharedContext.importantData = result.output
  }
}
```

## Executing Workflows

### From Code

```typescript
import { executeWorkflow } from '@/lib/agents'

const result = await executeWorkflow('post-delivery', {
  event: 'carousel.rendered',
  listingId: 'listing-123',
  campaignId: 'campaign-456',
  data: {
    carouselUrls: ['url1', 'url2'],
    autoLaunch: true
  }
})

console.log(result.status) // 'completed', 'failed', etc.
console.log(result.stepResults) // Results from each step
```

### From API

```typescript
// POST /api/workflows/execute
{
  "workflowId": "post-delivery",
  "trigger": {
    "event": "carousel.rendered",
    "listingId": "listing-123",
    "data": {
      "carouselUrls": ["url1", "url2"]
    }
  }
}
```

## Built-in Workflows

### Post-Delivery Workflow

**Trigger:** `carousel.rendered`

**Steps:**
1. QC Assistant - Pre-screen photos for quality issues
2. Media Tips - Generate usage tips (parallel with QC)
3. Delivery Notifier - Send notification to agent
4. Care Task Generator - Create follow-up tasks
5. Campaign Launcher - Auto-launch marketing (conditional)

**Usage:**

```typescript
await executeWorkflow('post-delivery', {
  event: 'carousel.rendered',
  listingId: 'listing-123',
  data: {
    carouselUrls: ['url1', 'url2'],
    autoLaunch: true,
    campaignPreferences: { ... }
  }
})
```

### New Listing Workflow

**Trigger:** `listing.created`

**Steps:**
1. Listing Data Enricher - Geocode and enrich property data
2. Neighborhood Researcher - Research local area (conditional)
3. Template Selector - Auto-select best template
4. Shoot Scheduler - Generate schedule recommendations (parallel)
5. Agent Welcome - Send welcome notification

**Usage:**

```typescript
await executeWorkflow('new-listing', {
  event: 'listing.created',
  listingId: 'listing-123',
  data: {
    address: '123 Main St',
    city: 'Austin',
    state: 'TX',
    agentId: 'agent-456',
    enableNeighborhoodResearch: true
  }
})
```

## Error Handling

### Workflow-Level

Set `onError` in workflow definition:

- `'continue'` - Continue executing steps even if one fails
- `'stop'` - Stop workflow on first failure

### Step-Level

Use `required` flag:

- `required: true` - Workflow fails if this step fails (respects `onError`)
- `required: false` - Step failure doesn't affect workflow

### Error Recovery

```typescript
onComplete: async (result, context) => {
  if (!result.success) {
    console.error(`Step failed: ${result.error}`)
    // Store fallback data
    context.sharedContext.useFallback = true
  }
}
```

## Monitoring

### Get Workflow Status

```typescript
import { getWorkflowExecution } from '@/lib/agents'

const execution = await getWorkflowExecution(workflowId)
console.log(execution.status)
console.log(execution.current_step)
console.log(execution.steps) // Step execution details
```

### Get All Workflows for a Resource

```typescript
import { getWorkflowsForResource } from '@/lib/agents'

const workflows = await getWorkflowsForResource('listing', 'listing-123')
```

### Pause/Resume

```typescript
import { pauseWorkflow, resumeWorkflow } from '@/lib/agents'

await pauseWorkflow(workflowId)
// ... do something ...
await resumeWorkflow(workflowId)
```

## Database Schema

Workflow executions are stored in the `ai_agent_workflows` table:

```sql
CREATE TABLE ai_agent_workflows (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  trigger_event TEXT NOT NULL,
  status TEXT NOT NULL, -- pending, running, completed, failed, paused
  listing_id UUID,
  campaign_id UUID,
  current_step INTEGER DEFAULT 0,
  steps JSONB[] DEFAULT '{}',
  context JSONB DEFAULT '{}',
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
)
```

## Best Practices

1. **Keep Steps Focused** - Each agent should do one thing well
2. **Use Conditions Wisely** - Skip optional steps based on context
3. **Handle Failures Gracefully** - Use `onError: 'continue'` for non-critical workflows
4. **Store Important Data** - Save outputs needed downstream in `sharedContext`
5. **Log Progress** - Use console.log in callbacks to track execution
6. **Test Independently** - Test each agent separately before adding to workflow
7. **Document Triggers** - Clearly document what triggers the workflow and expected data

## Examples

### Simple Sequential Workflow

```typescript
{
  id: 'simple-flow',
  name: 'Simple Flow',
  triggerEvent: 'test.event',
  onError: 'stop',
  steps: [
    { agentSlug: 'step-1' },
    { agentSlug: 'step-2' },
    { agentSlug: 'step-3' }
  ]
}
```

### Parallel + Conditional

```typescript
{
  id: 'complex-flow',
  name: 'Complex Flow',
  triggerEvent: 'test.event',
  onError: 'continue',
  steps: [
    {
      agentSlug: 'data-fetcher',
      onComplete: async (result, context) => {
        context.sharedContext.data = result.output
      }
    },
    {
      agentSlug: 'analyzer-1',
      parallel: 'analysis'
    },
    {
      agentSlug: 'analyzer-2',
      parallel: 'analysis'
    },
    {
      agentSlug: 'notifier',
      condition: async (context) => {
        return context.sharedContext.data?.shouldNotify === true
      }
    }
  ]
}
```

## Troubleshooting

**Workflow not executing:**
- Check if workflow is registered (import in `/workflows/index.ts`)
- Verify trigger event matches exactly
- Check database permissions

**Step being skipped:**
- Check `condition` function return value
- Verify agent exists and is active
- Check logs for condition evaluation

**Context not passing:**
- Ensure `onComplete` saves to `context.sharedContext`
- Check `inputMapper` is reading from correct context field
- Verify step order (can't access results from steps that haven't run)

**Parallel steps not working:**
- Ensure steps have same `parallel` group ID
- Check if any step in group is failing
- Verify all steps in group complete before next sequential step
