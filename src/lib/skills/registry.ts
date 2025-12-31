/**
 * Skills Registry
 *
 * Central registry for skill registration, discovery, and management.
 * Supports both in-memory and database-backed skill definitions.
 */

import type {
  SkillDefinition,
  SkillRegistryOptions,
  SkillMetrics,
  SkillExecutionRecord,
  SkillCategory,
  AIProvider,
  ProviderConfig,
} from './types'

// In-memory skill registry
const skillRegistry = new Map<string, SkillDefinition>()

// Provider configurations
const providerConfigs: Map<AIProvider, ProviderConfig> = new Map()

/**
 * Register a skill in the registry
 */
export function registerSkill<TInput, TOutput>(
  skill: SkillDefinition<TInput, TOutput>
): void {
  if (skillRegistry.has(skill.id)) {
    console.warn(`[Skills] Skill '${skill.id}' already registered, overwriting`)
  }

  // Validate required fields
  if (!skill.id || !skill.name || !skill.category || !skill.version) {
    throw new Error(`[Skills] Invalid skill definition: missing required fields`)
  }

  if (!skill.execute || typeof skill.execute !== 'function') {
    throw new Error(`[Skills] Skill '${skill.id}' must have an execute function`)
  }

  skillRegistry.set(skill.id, skill as SkillDefinition)

  console.log(`[Skills] Registered skill: ${skill.id} (v${skill.version})`)
}

/**
 * Get a skill by ID
 */
export function getSkill<TInput = unknown, TOutput = unknown>(
  skillId: string
): SkillDefinition<TInput, TOutput> | undefined {
  return skillRegistry.get(skillId) as SkillDefinition<TInput, TOutput> | undefined
}

/**
 * Check if a skill exists
 */
export function hasSkill(skillId: string): boolean {
  return skillRegistry.has(skillId)
}

/**
 * List all registered skills
 */
export function listSkills(
  options: SkillRegistryOptions = {}
): SkillDefinition[] {
  let skills = Array.from(skillRegistry.values())

  // Filter by category
  if (options.category) {
    skills = skills.filter((s) => s.category === options.category)
  }

  // Filter by provider
  if (options.provider) {
    skills = skills.filter((s) => s.provider === options.provider)
  }

  return skills
}

/**
 * Get skills by category
 */
export function getSkillsByCategory(
  category: SkillCategory
): SkillDefinition[] {
  return listSkills({ category })
}

/**
 * Get skills by provider
 */
export function getSkillsByProvider(
  provider: AIProvider
): SkillDefinition[] {
  return listSkills({ provider })
}

/**
 * Unregister a skill
 */
export function unregisterSkill(skillId: string): boolean {
  const existed = skillRegistry.has(skillId)
  skillRegistry.delete(skillId)
  if (existed) {
    console.log(`[Skills] Unregistered skill: ${skillId}`)
  }
  return existed
}

/**
 * Clear all registered skills (for testing)
 */
export function clearRegistry(): void {
  skillRegistry.clear()
  console.log('[Skills] Registry cleared')
}

/**
 * Get registry stats
 */
export function getRegistryStats(): {
  totalSkills: number
  byCategory: Record<SkillCategory, number>
  byProvider: Record<string, number>
} {
  const skills = Array.from(skillRegistry.values())

  const byCategory: Record<SkillCategory, number> = {
    generate: 0,
    transform: 0,
    integrate: 0,
    data: 0,
    notify: 0,
    decision: 0,
  }

  const byProvider: Record<string, number> = {}

  for (const skill of skills) {
    byCategory[skill.category]++
    if (skill.provider) {
      byProvider[skill.provider] = (byProvider[skill.provider] || 0) + 1
    }
  }

  return {
    totalSkills: skills.length,
    byCategory,
    byProvider,
  }
}

// ============================================
// Provider Configuration
// ============================================

/**
 * Register a provider configuration
 */
export function registerProvider(config: ProviderConfig): void {
  providerConfigs.set(config.id, config)
}

/**
 * Get provider configuration
 */
export function getProvider(providerId: AIProvider): ProviderConfig | undefined {
  return providerConfigs.get(providerId)
}

/**
 * Check if a provider is configured (has API key)
 */
export function isProviderConfigured(providerId: AIProvider): boolean {
  const config = providerConfigs.get(providerId)
  if (!config) return false

  // Check if environment variable is set
  const apiKey = process.env[config.apiKeyEnvVar]
  return !!apiKey && apiKey.length > 0
}

/**
 * Get all configured providers
 */
export function getConfiguredProviders(): ProviderConfig[] {
  return Array.from(providerConfigs.values()).filter(
    (config) => isProviderConfigured(config.id)
  )
}

// ============================================
// Initialize default providers
// ============================================

registerProvider({
  id: 'gemini',
  name: 'Google Gemini',
  apiKeyEnvVar: 'GOOGLE_AI_API_KEY',
  isConfigured: false,
  rateLimits: {
    requestsPerMinute: 60,
    tokensPerMinute: 60000,
  },
  costPerUnit: {
    inputTokens: 0.000125,   // $0.125 per 1M tokens
    outputTokens: 0.000375,
    imageGeneration: 0.04,
  },
})

registerProvider({
  id: 'anthropic',
  name: 'Anthropic Claude',
  apiKeyEnvVar: 'ANTHROPIC_API_KEY',
  isConfigured: false,
  rateLimits: {
    requestsPerMinute: 60,
    tokensPerMinute: 100000,
  },
  costPerUnit: {
    inputTokens: 0.00025,    // Claude Haiku pricing
    outputTokens: 0.00125,
  },
})

registerProvider({
  id: 'openai',
  name: 'OpenAI',
  apiKeyEnvVar: 'OPENAI_API_KEY',
  isConfigured: false,
  rateLimits: {
    requestsPerMinute: 60,
  },
  costPerUnit: {
    inputTokens: 0.0015,     // GPT-4o-mini pricing
    outputTokens: 0.006,
  },
})

registerProvider({
  id: 'founddr',
  name: 'FoundDR',
  apiKeyEnvVar: 'FOUNDDR_API_SECRET',
  isConfigured: false,
})

registerProvider({
  id: 'ffmpeg',
  name: 'FFmpeg (Local)',
  apiKeyEnvVar: '',  // No API key needed
  isConfigured: true,  // Always available locally
})

registerProvider({
  id: 'bannerbear',
  name: 'Bannerbear',
  apiKeyEnvVar: 'BANNERBEAR_API_KEY',
  isConfigured: false,
  costPerUnit: {
    imageGeneration: 0.10,  // Approx per image
  },
})

registerProvider({
  id: 'satori_sharp',
  name: 'Satori + Sharp',
  apiKeyEnvVar: '',  // No API key needed
  isConfigured: true,  // Always available (local processing)
  costPerUnit: {
    imageGeneration: 0.001,  // Minimal compute cost
  },
})

registerProvider({
  id: 'puppeteer_chrome',
  name: 'Puppeteer Chrome',
  apiKeyEnvVar: '',  // No API key needed
  isConfigured: true,  // Always available (local processing)
  costPerUnit: {
    imageGeneration: 0.005,  // Higher compute cost than Satori
  },
})

registerProvider({
  id: 'life_here',
  name: 'Life Here API',
  apiKeyEnvVar: '',  // Uses internal API, no external key
  isConfigured: true,  // Always available (internal API)
  costPerUnit: {
    apiCall: 0.0005,  // Minimal cost per API call
  },
})

// ============================================
// Database Integration (Supabase)
// ============================================

import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Save skill execution to database
 */
export async function saveSkillExecution(
  record: SkillExecutionRecord
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createAdminClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('skill_executions')
      .insert({
        id: record.id,
        skill_id: record.skillId,
        started_at: record.startedAt.toISOString(),
        completed_at: record.completedAt?.toISOString(),
        status: record.status,
        input: record.input,
        output: record.output,
        error_message: record.errorMessage,
        execution_time_ms: record.executionTimeMs,
        tokens_used: record.tokensUsed,
        cost_usd: record.costUsd,
        triggered_by: record.triggeredBy,
        trigger_source: record.triggerSource,
        listing_id: record.listingId,
        campaign_id: record.campaignId,
        parent_execution_id: record.parentExecutionId,
        metadata: record.metadata,
      })

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error('[Skills] Error saving execution:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Update skill execution status
 */
export async function updateSkillExecution(
  executionId: string,
  updates: Partial<SkillExecutionRecord>
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createAdminClient()

    const updateData: Record<string, unknown> = {}
    if (updates.status) updateData.status = updates.status
    if (updates.completedAt) updateData.completed_at = updates.completedAt.toISOString()
    if (updates.output !== undefined) updateData.output = updates.output
    if (updates.errorMessage) updateData.error_message = updates.errorMessage
    if (updates.executionTimeMs) updateData.execution_time_ms = updates.executionTimeMs
    if (updates.tokensUsed) updateData.tokens_used = updates.tokensUsed
    if (updates.costUsd) updateData.cost_usd = updates.costUsd

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('skill_executions')
      .update(updateData)
      .eq('id', executionId)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error('[Skills] Error updating execution:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Get skill metrics from database
 */
export async function getSkillMetrics(skillId?: string): Promise<SkillMetrics[]> {
  try {
    const supabase = createAdminClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase as any)
      .from('skill_executions')
      .select('skill_id, status, execution_time_ms, tokens_used, cost_usd, started_at')

    if (skillId) {
      query = query.eq('skill_id', skillId)
    }

    const { data, error } = await query

    if (error || !data) {
      return []
    }

    // Aggregate metrics by skill
    const metricsMap = new Map<string, {
      executions: number[]
      successes: number
      failures: number
      tokens: number
      cost: number
      lastAt?: Date
    }>()

    for (const row of data) {
      if (!metricsMap.has(row.skill_id)) {
        metricsMap.set(row.skill_id, {
          executions: [],
          successes: 0,
          failures: 0,
          tokens: 0,
          cost: 0,
        })
      }

      const stats = metricsMap.get(row.skill_id)!
      stats.executions.push(row.execution_time_ms || 0)

      if (row.status === 'completed') {
        stats.successes++
      } else if (row.status === 'failed') {
        stats.failures++
      }

      stats.tokens += row.tokens_used || 0
      stats.cost += row.cost_usd || 0

      const startedAt = new Date(row.started_at)
      if (!stats.lastAt || startedAt > stats.lastAt) {
        stats.lastAt = startedAt
      }
    }

    // Convert to metrics array
    const metrics: SkillMetrics[] = []
    for (const [id, stats] of metricsMap) {
      const sorted = [...stats.executions].sort((a, b) => a - b)
      const total = stats.successes + stats.failures

      metrics.push({
        skillId: id,
        totalExecutions: total,
        successCount: stats.successes,
        failureCount: stats.failures,
        successRate: total > 0 ? (stats.successes / total) * 100 : 0,
        avgExecutionTimeMs: sorted.length > 0
          ? sorted.reduce((a, b) => a + b, 0) / sorted.length
          : 0,
        p50ExecutionTimeMs: sorted.length > 0
          ? sorted[Math.floor(sorted.length * 0.5)]
          : 0,
        p95ExecutionTimeMs: sorted.length > 0
          ? sorted[Math.floor(sorted.length * 0.95)]
          : 0,
        totalTokensUsed: stats.tokens,
        totalCostUsd: stats.cost,
        lastExecutedAt: stats.lastAt,
      })
    }

    return metrics
  } catch (error) {
    console.error('[Skills] Error getting metrics:', error)
    return []
  }
}

/**
 * Get recent executions for a skill
 */
export async function getRecentExecutions(
  skillId: string,
  limit: number = 10
): Promise<SkillExecutionRecord[]> {
  try {
    const supabase = createAdminClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('skill_executions')
      .select('*')
      .eq('skill_id', skillId)
      .order('started_at', { ascending: false })
      .limit(limit)

    if (error || !data) {
      return []
    }

    return data.map((row: Record<string, unknown>) => ({
      id: row.id as string,
      skillId: row.skill_id as string,
      startedAt: new Date(row.started_at as string),
      completedAt: row.completed_at ? new Date(row.completed_at as string) : undefined,
      status: row.status as SkillExecutionRecord['status'],
      input: row.input,
      output: row.output,
      errorMessage: row.error_message as string | undefined,
      executionTimeMs: row.execution_time_ms as number | undefined,
      tokensUsed: row.tokens_used as number | undefined,
      costUsd: row.cost_usd as number | undefined,
      triggeredBy: row.triggered_by as string,
      triggerSource: row.trigger_source as string,
      listingId: row.listing_id as string | undefined,
      campaignId: row.campaign_id as string | undefined,
      parentExecutionId: row.parent_execution_id as string | undefined,
      metadata: row.metadata as Record<string, unknown> | undefined,
    }))
  } catch (error) {
    console.error('[Skills] Error getting recent executions:', error)
    return []
  }
}
