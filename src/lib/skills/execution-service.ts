/**
 * Skill Execution Service
 *
 * Manages skill execution tracking, output storage, and usage statistics
 */

import { createAdminClient } from '@/lib/supabase/admin'

// Types
export interface SkillExecution {
  id: string
  skill_id: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  started_at: string
  completed_at?: string
  triggered_by: string
  trigger_source: 'manual' | 'agent' | 'workflow' | 'cron' | 'webhook'
  listing_id?: string
  agent_id?: string
  staff_id?: string
  input?: Record<string, unknown>
  output?: Record<string, unknown>
  error_message?: string
  execution_time_ms?: number
  tokens_used?: number
  cost_usd?: number
  metadata?: Record<string, unknown>
  created_at: string
}

export interface SkillExecutionInput {
  skill_id: string
  triggered_by: string
  trigger_source: 'manual' | 'agent' | 'workflow' | 'cron' | 'webhook'
  listing_id?: string
  agent_id?: string
  staff_id?: string
  input?: Record<string, unknown>
  metadata?: Record<string, unknown>
}

export interface ListingSkillOutput {
  id: string
  listing_id: string
  skill_id: string
  output_type: string
  output_data: Record<string, unknown>
  status: 'pending' | 'completed' | 'failed' | 'expired'
  execution_id?: string
  expires_at?: string
  created_at: string
  updated_at?: string
}

export interface SkillUsageStats {
  agent_id: string
  period_start: string
  period_end: string
  total_executions: number
  total_tokens: number
  total_cost: number
  by_skill: Record<string, {
    executions: number
    tokens: number
    cost: number
  }>
}

interface CreateOptions {
  startImmediately?: boolean
}

interface ListExecutionsFilter {
  listing_id?: string
  skill_id?: string
  status?: SkillExecution['status']
  trigger_source?: SkillExecution['trigger_source']
  limit?: number
}

interface ListOutputsFilter {
  skill_id?: string
  output_type?: string
}

interface CancelResult {
  success: boolean
  execution?: SkillExecution
  error?: string
}

interface RetryResult {
  success: boolean
  execution?: SkillExecution
  error?: string
}

/**
 * Create a new skill execution record
 */
export async function createSkillExecution(
  input: SkillExecutionInput,
  options: CreateOptions = {}
): Promise<SkillExecution> {
  const supabase = createAdminClient()

  const executionData = {
    skill_id: input.skill_id,
    triggered_by: input.triggered_by,
    trigger_source: input.trigger_source,
    listing_id: input.listing_id,
    agent_id: input.agent_id,
    staff_id: input.staff_id,
    input: input.input,
    metadata: input.metadata,
    status: options.startImmediately ? 'running' : 'pending',
    started_at: new Date().toISOString(),
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('skill_executions')
    .insert(executionData)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create skill execution: ${error.message}`)
  }

  return data
}

/**
 * Update a skill execution record
 */
export async function updateSkillExecution(
  executionId: string,
  updates: Partial<Pick<SkillExecution, 'status' | 'output' | 'error_message' | 'execution_time_ms' | 'tokens_used' | 'cost_usd' | 'completed_at'>>
): Promise<SkillExecution> {
  const supabase = createAdminClient()

  const updateData: Record<string, unknown> = { ...updates }

  // Auto-set completed_at when status changes to terminal state
  if (updates.status && ['completed', 'failed', 'cancelled'].includes(updates.status) && !updates.completed_at) {
    updateData.completed_at = new Date().toISOString()
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('skill_executions')
    .update(updateData)
    .eq('id', executionId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update skill execution: ${error.message}`)
  }

  return data
}

/**
 * Get a skill execution by ID
 */
export async function getSkillExecution(executionId: string): Promise<SkillExecution | null> {
  const supabase = createAdminClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('skill_executions')
    .select('*')
    .eq('id', executionId)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to get skill execution: ${error.message}`)
  }

  return data
}

/**
 * List skill executions with optional filters
 */
export async function listSkillExecutions(
  filters: ListExecutionsFilter = {}
): Promise<SkillExecution[]> {
  const supabase = createAdminClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from('skill_executions')
    .select('*')

  if (filters.listing_id) {
    query = query.eq('listing_id', filters.listing_id)
  }

  if (filters.skill_id) {
    query = query.eq('skill_id', filters.skill_id)
  }

  if (filters.status) {
    query = query.eq('status', filters.status)
  }

  if (filters.trigger_source) {
    query = query.eq('trigger_source', filters.trigger_source)
  }

  query = query.order('started_at', { ascending: false })

  if (filters.limit) {
    query = query.limit(filters.limit)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to list skill executions: ${error.message}`)
  }

  return data || []
}

/**
 * Get skill outputs for a listing
 */
export async function getListingSkillOutputs(
  listingId: string,
  filters: ListOutputsFilter = {}
): Promise<ListingSkillOutput[]> {
  const supabase = createAdminClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from('listing_skill_outputs')
    .select('*')
    .eq('listing_id', listingId)

  if (filters.skill_id) {
    query = query.eq('skill_id', filters.skill_id)
  }

  if (filters.output_type) {
    query = query.eq('output_type', filters.output_type)
  }

  query = query.order('created_at', { ascending: false })

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to get listing skill outputs: ${error.message}`)
  }

  return data || []
}

/**
 * Save skill output for a listing
 */
export async function saveSkillOutput(
  output: Omit<ListingSkillOutput, 'id' | 'created_at' | 'updated_at'>
): Promise<ListingSkillOutput> {
  const supabase = createAdminClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('listing_skill_outputs')
    .upsert(output, {
      onConflict: 'listing_id,skill_id,output_type',
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to save skill output: ${error.message}`)
  }

  return data
}

/**
 * Cancel a skill execution
 */
export async function cancelSkillExecution(executionId: string): Promise<CancelResult> {
  const execution = await getSkillExecution(executionId)

  if (!execution) {
    return { success: false, error: 'Execution not found' }
  }

  if (['completed', 'failed', 'cancelled'].includes(execution.status)) {
    return { success: false, error: `Execution with status '${execution.status}' cannot be cancelled` }
  }

  const updated = await updateSkillExecution(executionId, { status: 'cancelled' })
  return { success: true, execution: updated }
}

/**
 * Retry a failed skill execution
 */
export async function retrySkillExecution(executionId: string): Promise<RetryResult> {
  const original = await getSkillExecution(executionId)

  if (!original) {
    return { success: false, error: 'Execution not found' }
  }

  if (!['failed', 'cancelled'].includes(original.status)) {
    return { success: false, error: `Execution with status '${original.status}' cannot be retried` }
  }

  // Calculate retry count
  const currentRetryCount = (original.metadata?.retry_count as number) || 0
  const originalExecutionId = (original.metadata?.retry_of as string) || original.id

  const newExecution = await createSkillExecution({
    skill_id: original.skill_id,
    triggered_by: original.triggered_by,
    trigger_source: original.trigger_source,
    listing_id: original.listing_id,
    agent_id: original.agent_id,
    staff_id: original.staff_id,
    input: original.input,
    metadata: {
      ...original.metadata,
      retry_of: originalExecutionId,
      retry_count: currentRetryCount + 1,
    },
  })

  return { success: true, execution: newExecution }
}

/**
 * Get skill usage statistics for an agent
 */
export async function getSkillUsageStats(
  agentId: string,
  options: { period_start?: string; period_end?: string } = {}
): Promise<SkillUsageStats> {
  const supabase = createAdminClient()

  // Default to current month
  const now = new Date()
  const periodStart = options.period_start || new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const periodEnd = options.period_end || new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: usageData, error } = await (supabase as any)
    .from('skill_usage')
    .select('*')
    .eq('agent_id', agentId)
    .gte('period_start', periodStart)
    .lte('period_end', periodEnd)

  if (error) {
    throw new Error(`Failed to get skill usage stats: ${error.message}`)
  }

  // Aggregate by skill
  const bySkill: Record<string, { executions: number; tokens: number; cost: number }> = {}
  let totalExecutions = 0
  let totalTokens = 0
  let totalCost = 0

  for (const record of usageData || []) {
    if (!bySkill[record.skill_id]) {
      bySkill[record.skill_id] = { executions: 0, tokens: 0, cost: 0 }
    }
    bySkill[record.skill_id].executions += record.executions_count || 0
    bySkill[record.skill_id].tokens += record.tokens_used || 0
    bySkill[record.skill_id].cost += parseFloat(record.cost_usd || 0)

    totalExecutions += record.executions_count || 0
    totalTokens += record.tokens_used || 0
    totalCost += parseFloat(record.cost_usd || 0)
  }

  return {
    agent_id: agentId,
    period_start: periodStart,
    period_end: periodEnd,
    total_executions: totalExecutions,
    total_tokens: totalTokens,
    total_cost: totalCost,
    by_skill: bySkill,
  }
}

/**
 * Skill Execution Service Class
 *
 * Manages skill execution lifecycle with integration to the skills framework
 */
export class SkillExecutionService {
  /**
   * Execute a skill and track the execution
   */
  async executeSkill(
    skillId: string,
    input: Record<string, unknown>,
    options: {
      listing_id?: string
      agent_id?: string
      staff_id?: string
      triggered_by: string
      trigger_source?: 'manual' | 'agent' | 'workflow' | 'cron' | 'webhook'
    }
  ): Promise<{
    success: boolean
    execution_id: string
    output?: Record<string, unknown>
    error?: string
    execution_time_ms?: number
  }> {
    const startTime = Date.now()

    // Create execution record
    const execution = await createSkillExecution({
      skill_id: skillId,
      triggered_by: options.triggered_by,
      trigger_source: options.trigger_source || 'manual',
      listing_id: options.listing_id,
      agent_id: options.agent_id,
      staff_id: options.staff_id,
      input,
    }, { startImmediately: true })

    try {
      // Import and execute the skill from the registry
      const { getSkill, executeSkill: runSkill } = await import('./index')
      const skill = getSkill(skillId)

      if (!skill) {
        await updateSkillExecution(execution.id, {
          status: 'failed',
          error_message: `Skill '${skillId}' not found`,
          execution_time_ms: Date.now() - startTime,
        })
        return {
          success: false,
          execution_id: execution.id,
          error: `Skill '${skillId}' not found`,
        }
      }

      const result = await runSkill({ skillId, input })
      const executionTime = Date.now() - startTime

      if (result.success) {
        await updateSkillExecution(execution.id, {
          status: 'completed',
          output: result.data as Record<string, unknown>,
          execution_time_ms: executionTime,
          tokens_used: result.metadata.tokensUsed,
          cost_usd: result.metadata.costUsd,
        })

        // Save output to listing if applicable
        if (options.listing_id && result.data) {
          await saveSkillOutput({
            listing_id: options.listing_id,
            skill_id: skillId,
            output_type: 'result',
            output_data: result.data as Record<string, unknown>,
            status: 'completed',
            execution_id: execution.id,
          })
        }

        return {
          success: true,
          execution_id: execution.id,
          output: result.data as Record<string, unknown>,
          execution_time_ms: executionTime,
        }
      } else {
        await updateSkillExecution(execution.id, {
          status: 'failed',
          error_message: result.error,
          execution_time_ms: result.metadata.executionTimeMs,
        })

        return {
          success: false,
          execution_id: execution.id,
          error: result.error,
          execution_time_ms: result.metadata.executionTimeMs,
        }
      }
    } catch (error) {
      const executionTime = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      await updateSkillExecution(execution.id, {
        status: 'failed',
        error_message: errorMessage,
        execution_time_ms: executionTime,
      })

      return {
        success: false,
        execution_id: execution.id,
        error: errorMessage,
        execution_time_ms: executionTime,
      }
    }
  }

  /**
   * Batch execute multiple skills
   */
  async batchExecute(
    skills: Array<{ skill_id: string; input: Record<string, unknown> }>,
    options: {
      listing_id?: string
      agent_id?: string
      triggered_by: string
      trigger_source?: 'manual' | 'agent' | 'workflow' | 'cron' | 'webhook'
      parallel?: boolean
    }
  ): Promise<{
    success: boolean
    results: Array<{
      skill_id: string
      success: boolean
      execution_id?: string
      output?: Record<string, unknown>
      error?: string
    }>
  }> {
    const executeOne = async (skill: { skill_id: string; input: Record<string, unknown> }) => {
      const result = await this.executeSkill(skill.skill_id, skill.input, {
        listing_id: options.listing_id,
        agent_id: options.agent_id,
        triggered_by: options.triggered_by,
        trigger_source: options.trigger_source,
      })

      return {
        skill_id: skill.skill_id,
        success: result.success,
        execution_id: result.execution_id,
        output: result.output,
        error: result.error,
      }
    }

    let results
    if (options.parallel !== false) {
      // Execute in parallel by default
      results = await Promise.all(skills.map(executeOne))
    } else {
      // Execute sequentially
      results = []
      for (const skill of skills) {
        results.push(await executeOne(skill))
      }
    }

    const allSucceeded = results.every((r) => r.success)

    return {
      success: allSucceeded,
      results,
    }
  }
}
