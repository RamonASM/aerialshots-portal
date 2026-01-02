// Agent Registry - manages agent definitions and database records

import { createAdminClient } from '@/lib/supabase/admin'
import { unstable_cache } from 'next/cache'
import { agentLogger, formatError } from '@/lib/logger'
import type { AgentDefinition, AIAgent, AgentMetrics, AIAgentCategory } from './types'
import {
  CACHE_REVALIDATION,
  CACHE_TAGS,
  getAgentCacheKey,
  getAllAgentsCacheKey,
  getAgentMetricsCacheKey,
  getRecentExecutionsCacheKey,
  getAgentsByCategoryCacheKey,
} from '@/lib/utils/cache'

// In-memory registry for code-defined agents
const agentDefinitions = new Map<string, AgentDefinition>()

/**
 * Register an agent definition (for code-based agents)
 */
export function registerAgent(definition: AgentDefinition): void {
  agentDefinitions.set(definition.slug, definition)
}

/**
 * Get agent definition from registry
 */
export function getAgentDefinition(slug: string): AgentDefinition | undefined {
  return agentDefinitions.get(slug)
}

/**
 * Get all registered agent definitions
 */
export function getAllAgentDefinitions(): AgentDefinition[] {
  return Array.from(agentDefinitions.values())
}

/**
 * Internal function to fetch agent (for caching)
 */
async function fetchAgent(slug: string): Promise<AIAgent | null> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('ai_agents')
    .select('*')
    .eq('slug', slug)
    .single()

  if (error) {
    agentLogger.error({ slug, ...formatError(error) }, 'Error fetching agent')
    return null
  }

  return data
}

/**
 * Get agent from database by slug (cached)
 * Cache for 5 minutes as agent config is relatively static
 */
export const getAgent = unstable_cache(
  fetchAgent,
  ['ai-agent'],
  {
    revalidate: CACHE_REVALIDATION.AGENT,
    tags: [CACHE_TAGS.AI_AGENTS],
  }
)

/**
 * Internal function to fetch all agents (for caching)
 */
async function fetchAllAgents(options?: {
  category?: AIAgentCategory
  activeOnly?: boolean
}): Promise<AIAgent[]> {
  const supabase = createAdminClient()

  let query = supabase.from('ai_agents').select('*')

  if (options?.category) {
    query = query.eq('category', options.category)
  }

  if (options?.activeOnly) {
    query = query.eq('is_active', true)
  }

  const { data, error } = await query.order('category').order('name')

  if (error) {
    agentLogger.error({ ...formatError(error) }, 'Error fetching agents')
    return []
  }

  return data || []
}

/**
 * Get all agents from database (cached)
 * Cache for 5 minutes as agent list is relatively static
 */
export const getAllAgents = unstable_cache(
  async (options?: { category?: AIAgentCategory; activeOnly?: boolean }) => {
    return fetchAllAgents(options)
  },
  ['ai-agents-all'],
  {
    revalidate: CACHE_REVALIDATION.AGENT,
    tags: [CACHE_TAGS.AI_AGENTS],
  }
)

/**
 * Internal function to fetch agent metrics (for caching)
 * Computes metrics from ai_agents and ai_agent_executions tables
 */
async function fetchAgentMetrics(slug?: string): Promise<AgentMetrics[]> {
  const supabase = createAdminClient()

  // Batch query: Get agents and executions in parallel
  const [agentsResult, executionsResult] = await Promise.all([
    // Get agents - select only needed columns for better performance
    slug
      ? supabase.from('ai_agents').select('slug, name, category, is_active').eq('slug', slug)
      : supabase.from('ai_agents').select('slug, name, category, is_active'),
    // Get executions - select only needed columns
    slug
      ? supabase
          .from('ai_agent_executions')
          .select('agent_slug, status, duration_ms, tokens_used, created_at')
          .eq('agent_slug', slug)
      : supabase
          .from('ai_agent_executions')
          .select('agent_slug, status, duration_ms, tokens_used, created_at'),
  ])

  const { data: agents, error: agentsError } = agentsResult
  const { data: executions } = executionsResult

  if (agentsError || !agents) {
    agentLogger.error({ ...formatError(agentsError) }, 'Error fetching agents for metrics')
    return []
  }

  // Calculate metrics per agent using a single pass
  const metricsMap: Record<string, {
    total: number
    success: number
    failed: number
    totalDuration: number
    tokens: number
    lastExecution: string | null
  }> = {}

  // Batch calculation of metrics
  for (const exec of executions || []) {
    if (!metricsMap[exec.agent_slug]) {
      metricsMap[exec.agent_slug] = {
        total: 0,
        success: 0,
        failed: 0,
        totalDuration: 0,
        tokens: 0,
        lastExecution: null,
      }
    }
    const m = metricsMap[exec.agent_slug]
    m.total++
    if (exec.status === 'completed') m.success++
    if (exec.status === 'failed') m.failed++
    if (exec.duration_ms) m.totalDuration += exec.duration_ms
    m.tokens += exec.tokens_used || 0
    if (exec.created_at && (!m.lastExecution || exec.created_at > m.lastExecution)) {
      m.lastExecution = exec.created_at
    }
  }

  return agents.map((agent) => {
    const m = metricsMap[agent.slug] || { total: 0, success: 0, failed: 0, totalDuration: 0, tokens: 0, lastExecution: null }
    return {
      slug: agent.slug,
      name: agent.name,
      category: agent.category as AIAgentCategory,
      isActive: agent.is_active ?? false,
      totalExecutions: m.total,
      successfulExecutions: m.success,
      failedExecutions: m.failed,
      avgDurationMs: m.total > 0 ? Math.round(m.totalDuration / m.total) : null,
      totalTokensUsed: m.tokens,
      lastExecution: m.lastExecution,
    }
  })
}

/**
 * Get agent metrics for dashboard (cached)
 * Cache for 1 minute as metrics need to be relatively fresh
 */
export const getAgentMetrics = unstable_cache(
  async (slug?: string) => fetchAgentMetrics(slug),
  ['agent-metrics'],
  {
    revalidate: CACHE_REVALIDATION.AGENT_METRICS,
    tags: [CACHE_TAGS.AI_AGENTS, CACHE_TAGS.AI_AGENT_EXECUTIONS],
  }
)

/**
 * Internal function to fetch recent executions (for caching)
 */
async function fetchRecentExecutions(agentSlug: string, limit: number = 10) {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('ai_agent_executions')
    .select('*')
    .eq('agent_slug', agentSlug)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    agentLogger.error({ agentSlug, ...formatError(error) }, 'Error fetching executions')
    return []
  }

  return data || []
}

/**
 * Get recent executions for an agent (cached)
 * Cache for 30 seconds as execution data should be fresh
 */
export const getRecentExecutions = unstable_cache(
  async (agentSlug: string, limit: number = 10) => fetchRecentExecutions(agentSlug, limit),
  ['agent-recent-executions'],
  {
    revalidate: CACHE_REVALIDATION.AI_AGENT_EXECUTIONS,
    tags: [CACHE_TAGS.AI_AGENT_EXECUTIONS],
  }
)

/**
 * Update agent status
 */
export async function updateAgentStatus(
  slug: string,
  isActive: boolean
): Promise<boolean> {
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('ai_agents')
    .update({ is_active: isActive })
    .eq('slug', slug)

  if (error) {
    agentLogger.error({ slug, isActive, ...formatError(error) }, 'Error updating agent status')
    return false
  }

  return true
}

/**
 * Update agent configuration
 */
export async function updateAgentConfig(
  slug: string,
  updates: Partial<Pick<AIAgent, 'system_prompt' | 'config'>>
): Promise<boolean> {
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('ai_agents')
    .update(updates)
    .eq('slug', slug)

  if (error) {
    agentLogger.error({ slug, ...formatError(error) }, 'Error updating agent config')
    return false
  }

  return true
}

/**
 * Internal function to get agents grouped by category (for caching)
 */
async function fetchAgentsByCategory(): Promise<Record<AIAgentCategory, AIAgent[]>> {
  const agents = await fetchAllAgents()

  const grouped: Record<AIAgentCategory, AIAgent[]> = {
    operations: [],
    content: [],
    development: [],
    lifestyle: [],
    marketing: [],
    analytics: [],
    communication: [],
  }

  for (const agent of agents) {
    const category = agent.category as AIAgentCategory
    if (grouped[category]) {
      grouped[category].push(agent)
    }
  }

  return grouped
}

/**
 * Get agents grouped by category (cached)
 * Cache for 5 minutes as agent groupings are relatively static
 */
export const getAgentsByCategory = unstable_cache(
  fetchAgentsByCategory,
  ['agents-by-category'],
  {
    revalidate: CACHE_REVALIDATION.AGENT,
    tags: [CACHE_TAGS.AI_AGENTS],
  }
)
