// Workflow Orchestrator - executes multi-step agent workflows

import { createAdminClient } from '@/lib/supabase/admin'
import { executeAgent } from './executor'
import { AppError } from '@/lib/utils/errors'
import { agentLogger, formatError } from '@/lib/logger'
import type {
  WorkflowDefinition,
  WorkflowTrigger,
  WorkflowResult,
  WorkflowContext,
  WorkflowStatus,
  WorkflowExecutionStep,
  AgentExecutionResult,
  AIAgentWorkflow,
} from './types'

// In-memory registry for workflow definitions
const workflowDefinitions = new Map<string, WorkflowDefinition>()

/**
 * Register a workflow definition
 */
export function registerWorkflow(definition: WorkflowDefinition): void {
  workflowDefinitions.set(definition.id, definition)
  agentLogger.debug({ workflowId: definition.id, workflowName: definition.name }, 'Registered workflow')
}

/**
 * Get a workflow definition by ID
 */
export function getWorkflowDefinition(id: string): WorkflowDefinition | undefined {
  return workflowDefinitions.get(id)
}

/**
 * Get all registered workflow definitions
 */
export function getAllWorkflowDefinitions(): WorkflowDefinition[] {
  return Array.from(workflowDefinitions.values())
}

/**
 * Execute a workflow by trigger
 */
export async function executeWorkflow(
  workflowId: string,
  trigger: WorkflowTrigger
): Promise<WorkflowResult> {
  const definition = getWorkflowDefinition(workflowId)
  if (!definition) {
    throw new AppError(
      `Workflow definition not found: ${workflowId}`,
      'WORKFLOW_NOT_FOUND',
      404,
      { workflowId }
    )
  }

  // Validate trigger event matches
  if (definition.triggerEvent !== trigger.event) {
    throw new AppError(
      `Workflow trigger mismatch. Expected: ${definition.triggerEvent}, got: ${trigger.event}`,
      'TRIGGER_MISMATCH',
      400,
      { expected: definition.triggerEvent, received: trigger.event }
    )
  }

  const supabase = createAdminClient()
  const startTime = new Date().toISOString()

  // Create workflow execution record
  const { data: workflowExecution, error: createError } = await supabase
    .from('ai_agent_workflows')
    .insert({
      name: definition.name,
      trigger_event: trigger.event,
      status: 'pending',
      listing_id: trigger.listingId || null,
      campaign_id: trigger.campaignId || null,
      current_step: 0,
      steps: [],
      context: (trigger.data || {}) as Record<string, never>,
    })
    .select()
    .single()

  if (createError || !workflowExecution) {
    throw new AppError(
      'Failed to create workflow execution record',
      'WORKFLOW_CREATE_FAILED',
      500,
      { error: createError }
    )
  }

  agentLogger.info({ workflowId: workflowExecution.id, workflowName: definition.name }, 'Starting workflow execution')

  // Initialize workflow context
  const context: WorkflowContext = {
    workflowId: workflowExecution.id,
    triggerEvent: trigger.event,
    triggerData: trigger.data,
    listingId: trigger.listingId,
    campaignId: trigger.campaignId,
    currentStep: 0,
    stepResults: {},
    sharedContext: trigger.data || {},
  }

  let status: WorkflowStatus = 'running'
  let errorMessage: string | undefined
  const executedSteps: WorkflowExecutionStep[] = []

  try {
    // Update status to running
    await updateWorkflowStatus(workflowExecution.id, 'running', 0)

    // Group steps by parallel execution groups
    const stepGroups = groupStepsByParallel(definition.steps)

    // Execute step groups sequentially
    for (let groupIndex = 0; groupIndex < stepGroups.length; groupIndex++) {
      const stepGroup = stepGroups[groupIndex]

      agentLogger.debug({
        groupIndex: groupIndex + 1,
        totalGroups: stepGroups.length,
        stepCount: stepGroup.length,
      }, 'Executing step group')

      // Execute steps in the group (parallel if applicable)
      const groupResults = await executeStepGroup(
        stepGroup,
        context,
        definition.onError,
        executedSteps
      )

      // Update context with results
      for (const [stepIndex, result] of groupResults.entries()) {
        const step = stepGroup[stepIndex]
        context.stepResults[step.agentSlug] = result

        // Call onComplete callback if defined
        if (step.onComplete) {
          try {
            await step.onComplete(result, context)
          } catch (error) {
            agentLogger.error({
              agentSlug: step.agentSlug,
              ...formatError(error),
            }, 'Error in onComplete callback')
          }
        }

        // Check if required step failed
        if (!result.success && step.required !== false) {
          if (definition.onError === 'stop') {
            status = 'failed'
            errorMessage = `Required step ${step.agentSlug} failed: ${result.error}`
            throw new Error(errorMessage)
          }
        }
      }

      // Update current step in database
      context.currentStep = (groupIndex + 1) * stepGroup.length
      await updateWorkflowStatus(
        workflowExecution.id,
        'running',
        context.currentStep,
        executedSteps
      )
    }

    // All steps completed successfully
    status = 'completed'
    agentLogger.info({ workflowId: workflowExecution.id }, 'Workflow completed successfully')
  } catch (error) {
    status = 'failed'
    errorMessage =
      error instanceof Error ? error.message : 'Unknown workflow error'
    agentLogger.error({ workflowId: workflowExecution.id, ...formatError(error) }, 'Workflow failed')
  }

  // Update final workflow status
  const completedAt = new Date().toISOString()
  await supabase
    .from('ai_agent_workflows')
    .update({
      status,
      current_step: context.currentStep,
      steps: executedSteps as unknown as Record<string, never>[],
      context: context.sharedContext as Record<string, never>,
      error_message: errorMessage || null,
      completed_at: completedAt,
      updated_at: completedAt,
    })
    .eq('id', workflowExecution.id)

  return {
    workflowId: workflowExecution.id,
    status,
    completedSteps: context.currentStep,
    totalSteps: definition.steps.length,
    stepResults: context.stepResults,
    error: errorMessage,
    startedAt: startTime,
    completedAt,
  }
}

/**
 * Group workflow steps by parallel execution groups
 * Steps with the same parallel ID are grouped together
 * Steps without parallel ID get their own group
 */
function groupStepsByParallel(steps: WorkflowDefinition['steps']): WorkflowDefinition['steps'][] {
  const groups: WorkflowDefinition['steps'][] = []
  const parallelGroups = new Map<string, WorkflowDefinition['steps']>()

  for (const step of steps) {
    if (step.parallel) {
      // Add to parallel group
      if (!parallelGroups.has(step.parallel)) {
        parallelGroups.set(step.parallel, [])
      }
      parallelGroups.get(step.parallel)!.push(step)
    } else {
      // Sequential step - add as its own group
      groups.push([step])
    }
  }

  // Add parallel groups to the end (or interleave based on order in original steps)
  // For now, we'll add them at the end
  for (const group of parallelGroups.values()) {
    groups.push(group)
  }

  return groups
}

/**
 * Execute a group of steps (potentially in parallel)
 */
async function executeStepGroup(
  steps: WorkflowDefinition['steps'],
  context: WorkflowContext,
  onError: 'continue' | 'stop',
  executedSteps: WorkflowExecutionStep[]
): Promise<AgentExecutionResult[]> {
  const stepPromises = steps.map(async (step) => {
    const stepStart = new Date().toISOString()

    // Create execution step record
    const executionStep: WorkflowExecutionStep = {
      agentSlug: step.agentSlug,
      status: 'pending',
      startedAt: stepStart,
    }
    executedSteps.push(executionStep)

    try {
      // Evaluate condition if present
      if (step.condition) {
        const shouldExecute = await step.condition(context)
        if (!shouldExecute) {
          agentLogger.debug({ agentSlug: step.agentSlug }, 'Skipping step (condition not met)')
          executionStep.status = 'cancelled'
          executionStep.completedAt = new Date().toISOString()
          return {
            success: true,
            output: { skipped: true, reason: 'condition not met' },
          }
        }
      }

      // Map input from context
      const input = step.inputMapper
        ? await step.inputMapper(context)
        : { ...context.sharedContext }

      agentLogger.debug({ agentSlug: step.agentSlug }, 'Executing agent')
      executionStep.status = 'running'

      // Execute the agent
      const result = await executeAgent({
        agentSlug: step.agentSlug,
        triggerSource: 'api',
        input,
        listingId: context.listingId,
        campaignId: context.campaignId,
        triggeredBy: `workflow:${context.workflowId}`,
      })

      // Update execution step
      executionStep.status = result.success ? 'completed' : 'failed'
      executionStep.output = result.output
      executionStep.error = result.error
      executionStep.completedAt = new Date().toISOString()

      // Merge output into shared context
      if (result.success && result.output) {
        context.sharedContext = {
          ...context.sharedContext,
          [`${step.agentSlug}_output`]: result.output,
        }
      }

      return result
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error'

      executionStep.status = 'failed'
      executionStep.error = errorMessage
      executionStep.completedAt = new Date().toISOString()

      agentLogger.error({ agentSlug: step.agentSlug, ...formatError(error) }, 'Error executing agent')

      return {
        success: false,
        error: errorMessage,
        errorCode: 'AGENT_EXECUTION_ERROR',
      }
    }
  })

  // Execute all steps in the group (parallel if multiple)
  return Promise.all(stepPromises)
}

/**
 * Update workflow status in database
 */
async function updateWorkflowStatus(
  workflowId: string,
  status: WorkflowStatus,
  currentStep: number,
  steps?: WorkflowExecutionStep[]
): Promise<void> {
  const supabase = createAdminClient()

  const updates: Partial<AIAgentWorkflow> = {
    status,
    current_step: currentStep,
    updated_at: new Date().toISOString(),
  }

  if (steps) {
    updates.steps = steps as unknown as Record<string, never>[]
  }

  const { error } = await supabase
    .from('ai_agent_workflows')
    .update(updates)
    .eq('id', workflowId)

  if (error) {
    agentLogger.error({ workflowId, ...formatError(error) }, 'Failed to update workflow status')
    throw new AppError(
      'Failed to update workflow status',
      'WORKFLOW_UPDATE_FAILED',
      500,
      { error }
    )
  }
}

/**
 * Get workflow execution by ID
 */
export async function getWorkflowExecution(
  workflowId: string
): Promise<AIAgentWorkflow | null> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('ai_agent_workflows')
    .select('*')
    .eq('id', workflowId)
    .single()

  if (error) {
    agentLogger.error({ workflowId, ...formatError(error) }, 'Error fetching workflow execution')
    return null
  }

  return data
}

/**
 * Pause a running workflow
 */
export async function pauseWorkflow(workflowId: string): Promise<void> {
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('ai_agent_workflows')
    .update({
      status: 'paused',
      updated_at: new Date().toISOString(),
    })
    .eq('id', workflowId)
    .in('status', ['pending', 'running'])

  if (error) {
    throw new AppError(
      'Failed to pause workflow',
      'WORKFLOW_PAUSE_FAILED',
      500,
      { error }
    )
  }
}

/**
 * Resume a paused workflow
 */
export async function resumeWorkflow(workflowId: string): Promise<WorkflowResult> {
  const execution = await getWorkflowExecution(workflowId)

  if (!execution) {
    throw new AppError(
      `Workflow execution not found: ${workflowId}`,
      'WORKFLOW_NOT_FOUND',
      404
    )
  }

  if (execution.status !== 'paused') {
    throw new AppError(
      `Cannot resume workflow in ${execution.status} status`,
      'INVALID_STATUS',
      400
    )
  }

  // Re-execute from the current step
  const definition = getWorkflowDefinition(execution.name)
  if (!definition) {
    throw new AppError(
      `Workflow definition not found: ${execution.name}`,
      'WORKFLOW_DEFINITION_NOT_FOUND',
      404
    )
  }

  // Resume by triggering again with the stored context
  return executeWorkflow(definition.id, {
    event: execution.trigger_event,
    listingId: execution.listing_id || undefined,
    campaignId: execution.campaign_id || undefined,
    data: execution.context as Record<string, unknown>,
  })
}

/**
 * Get all workflows for a listing or campaign
 */
export async function getWorkflowsForResource(
  resourceType: 'listing' | 'campaign',
  resourceId: string
): Promise<AIAgentWorkflow[]> {
  const supabase = createAdminClient()

  const column = resourceType === 'listing' ? 'listing_id' : 'campaign_id'

  const { data, error } = await supabase
    .from('ai_agent_workflows')
    .select('*')
    .eq(column, resourceId)
    .order('created_at', { ascending: false })

  if (error) {
    agentLogger.error({ resourceType, resourceId, ...formatError(error) }, 'Error fetching workflows')
    return []
  }

  return data || []
}
