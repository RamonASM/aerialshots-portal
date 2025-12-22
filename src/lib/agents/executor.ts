// Agent Executor - handles running agents and logging executions

import { createAdminClient } from '@/lib/supabase/admin'
import { generateWithAI } from '@/lib/ai/client'
import { getAgent, getAgentDefinition } from './registry'
import {
  AppError,
  databaseError,
  resourceNotFound,
  externalServiceError,
} from '@/lib/utils/errors'
import type {
  AgentExecutionContext,
  AgentExecutionResult,
  ExecuteAgentRequest,
  AgentConfig,
  AIAgentExecution,
} from './types'

const DEFAULT_CONFIG: AgentConfig = {
  maxTokens: 1000,
  temperature: 0.7,
  timeout: 30000,
  retryAttempts: 1,
}

/**
 * Execute an agent and log the result
 */
export async function executeAgent(
  request: ExecuteAgentRequest
): Promise<AgentExecutionResult> {
  const supabase = createAdminClient()
  const startTime = Date.now()

  // Create execution record
  const { data: execution, error: createError } = await supabase
    .from('ai_agent_executions')
    .insert({
      agent_slug: request.agentSlug,
      trigger_source: request.triggerSource,
      listing_id: request.listingId,
      campaign_id: request.campaignId,
      triggered_by: request.triggeredBy,
      status: 'running',
      input: request.input,
    })
    .select()
    .single()

  if (createError || !execution) {
    const error = databaseError(
      createError || { message: 'Unknown error', code: 'UNKNOWN' },
      'ai_agent_executions insert'
    )
    console.error('Failed to create execution record:', error)

    return {
      success: false,
      error: error.message,
      errorCode: error.code,
    }
  }

  try {
    // Get agent from database
    const agent = await getAgent(request.agentSlug)
    if (!agent) {
      throw resourceNotFound('Agent', request.agentSlug)
    }

    if (!agent.is_active) {
      throw new AppError(
        `Agent is not active: ${request.agentSlug}`,
        'AGENT_INACTIVE',
        403,
        { agentSlug: request.agentSlug }
      )
    }

    // Try code-defined agent first, then fall back to prompt-based
    const definition = getAgentDefinition(request.agentSlug)

    let result: AgentExecutionResult

    if (definition?.execute) {
      // Execute code-defined agent
      const context: AgentExecutionContext = {
        executionId: execution.id,
        agentSlug: request.agentSlug,
        triggerSource: request.triggerSource,
        listingId: request.listingId,
        campaignId: request.campaignId,
        triggeredBy: request.triggeredBy,
        input: request.input,
        supabase,
        systemPrompt: agent.system_prompt || definition.systemPrompt,
        config: {
          ...DEFAULT_CONFIG,
          ...(agent.config as AgentConfig),
          ...definition.config,
        },
      }

      result = await definition.execute(context)
    } else {
      // Execute prompt-based agent using AI client
      result = await executePromptBasedAgent(agent, request.input)
    }

    // Update execution record
    const durationMs = Date.now() - startTime
    try {
      await updateExecution(supabase, execution.id, {
        status: result.success ? 'completed' : 'failed',
        output: result.output || null,
        error_message: result.error || null,
        tokens_used: result.tokensUsed || 0,
        duration_ms: durationMs,
        completed_at: new Date().toISOString(),
      })
    } catch (updateError) {
      // Log update failure but still return the execution result
      // The execution itself succeeded/failed, we just couldn't record it
      console.error('Failed to update execution record after completion:', updateError)
    }

    return result
  } catch (error) {
    const durationMs = Date.now() - startTime

    // Extract error details
    let errorMessage: string
    let errorCode: string | undefined

    if (error instanceof AppError) {
      errorMessage = error.message
      errorCode = error.code
    } else if (error instanceof Error) {
      errorMessage = error.message
    } else {
      errorMessage = 'Unknown error occurred during agent execution'
    }

    // Update execution record with error
    try {
      await updateExecution(supabase, execution.id, {
        status: 'failed',
        error_message: errorMessage,
        duration_ms: durationMs,
        completed_at: new Date().toISOString(),
      })
    } catch (updateError) {
      // Log update failure but continue with error handling
      console.error('Failed to update execution record after error:', updateError)
    }

    // Log the error with appropriate level
    if (error instanceof AppError && error.status < 500) {
      // Client errors (4xx) - log as warning
      console.warn(`Agent execution failed [${request.agentSlug}]:`, {
        code: error.code,
        message: error.message,
        details: error.details,
      })
    } else {
      // Server errors (5xx) or unknown errors - log as error
      console.error(`Agent execution failed [${request.agentSlug}]:`, error)
    }

    return {
      success: false,
      error: errorMessage,
      ...(errorCode && { errorCode }),
    }
  }
}

/**
 * Execute a prompt-based agent using the AI client
 */
async function executePromptBasedAgent(
  agent: { system_prompt: string | null; config: Record<string, unknown> },
  input: Record<string, unknown>
): Promise<AgentExecutionResult> {
  if (!agent.system_prompt) {
    throw new AppError(
      'Agent has no system prompt configured',
      'MISSING_SYSTEM_PROMPT',
      500,
      { note: 'Agent must have a system prompt to execute' }
    )
  }

  const config = agent.config as AgentConfig

  // Build the prompt with input context
  const userPrompt = buildUserPrompt(input)

  try {
    const response = await generateWithAI({
      prompt: `${agent.system_prompt}\n\n${userPrompt}`,
      maxTokens: config.maxTokens || DEFAULT_CONFIG.maxTokens,
      temperature: config.temperature || DEFAULT_CONFIG.temperature,
    })

    // Try to parse as JSON, otherwise return as text
    let output: Record<string, unknown>
    try {
      output = JSON.parse(response.content)
    } catch {
      output = { text: response.content }
    }

    return {
      success: true,
      output,
      tokensUsed: response.tokensUsed,
    }
  } catch (error) {
    // Wrap AI generation errors
    throw externalServiceError(
      'AI Generation',
      error,
      true // Potentially retriable
    )
  }
}

/**
 * Build a user prompt from input data
 */
function buildUserPrompt(input: Record<string, unknown>): string {
  const parts: string[] = []

  for (const [key, value] of Object.entries(input)) {
    if (value === null || value === undefined) continue

    const label = key
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .trim()
      .toLowerCase()

    if (typeof value === 'object') {
      parts.push(`${label}:\n${JSON.stringify(value, null, 2)}`)
    } else {
      parts.push(`${label}: ${value}`)
    }
  }

  return parts.join('\n\n')
}

/**
 * Update execution record
 * Throws an error if update fails to ensure errors are not silently ignored
 */
async function updateExecution(
  supabase: ReturnType<typeof createAdminClient>,
  executionId: string,
  updates: Partial<AIAgentExecution>
): Promise<void> {
  const { error } = await supabase
    .from('ai_agent_executions')
    .update(updates)
    .eq('id', executionId)

  if (error) {
    const dbError = databaseError(error, 'ai_agent_executions update')
    console.error('Failed to update execution record:', dbError)
    throw dbError
  }
}

/**
 * Get execution by ID
 * Throws AppError if execution not found or database error occurs
 */
export async function getExecution(
  executionId: string
): Promise<AIAgentExecution> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('ai_agent_executions')
    .select('*')
    .eq('id', executionId)
    .single()

  if (error) {
    // Check if it's a "not found" error
    if (error.code === 'PGRST116') {
      throw resourceNotFound('Agent execution', executionId)
    }
    throw databaseError(error, 'ai_agent_executions select')
  }

  return data
}

/**
 * Cancel a pending or running execution
 * Throws AppError if cancellation fails
 */
export async function cancelExecution(executionId: string): Promise<void> {
  const supabase = createAdminClient()

  // First verify the execution exists and is in a cancellable state
  const execution = await getExecution(executionId)

  if (!['pending', 'running'].includes(execution.status)) {
    throw new AppError(
      `Cannot cancel execution in ${execution.status} status`,
      'INVALID_STATUS',
      400,
      {
        executionId,
        currentStatus: execution.status,
        allowedStatuses: ['pending', 'running'],
      }
    )
  }

  const { error } = await supabase
    .from('ai_agent_executions')
    .update({
      status: 'cancelled',
      completed_at: new Date().toISOString(),
    })
    .eq('id', executionId)
    .in('status', ['pending', 'running'])

  if (error) {
    throw databaseError(error, 'ai_agent_executions cancel')
  }
}

/**
 * Retry a failed execution
 * Throws AppError if execution cannot be retried
 */
export async function retryExecution(
  executionId: string
): Promise<AgentExecutionResult> {
  const execution = await getExecution(executionId)

  if (execution.status !== 'failed') {
    throw new AppError(
      `Cannot retry execution in ${execution.status} status`,
      'INVALID_STATUS',
      400,
      {
        executionId,
        currentStatus: execution.status,
        allowedStatuses: ['failed'],
      }
    )
  }

  // Re-execute with the same parameters
  return executeAgent({
    agentSlug: execution.agent_slug,
    triggerSource: (execution.trigger_source as 'webhook' | 'cron' | 'manual' | 'api') || 'manual',
    input: execution.input as Record<string, unknown>,
    listingId: execution.listing_id || undefined,
    campaignId: execution.campaign_id || undefined,
    triggeredBy: execution.triggered_by || undefined,
  })
}
