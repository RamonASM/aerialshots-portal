import { Suspense } from 'react'
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { unstable_cache } from 'next/cache'
import {
  Bot,
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  Zap,
  Code2,
  FileText,
  Map,
  PlayCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { AIAgentCategory } from '@/lib/supabase/types'
import { CACHE_REVALIDATION, CACHE_TAGS } from '@/lib/utils/cache'

const categoryConfig: Record<
  AIAgentCategory,
  { label: string; icon: typeof Bot; color: string }
> = {
  operations: {
    label: 'Operations',
    icon: Activity,
    color: 'text-blue-500 bg-blue-500/10',
  },
  content: {
    label: 'Content',
    icon: FileText,
    color: 'text-purple-500 bg-purple-500/10',
  },
  development: {
    label: 'Development',
    icon: Code2,
    color: 'text-green-500 bg-green-500/10',
  },
  lifestyle: {
    label: 'Lifestyle',
    icon: Map,
    color: 'text-orange-500 bg-orange-500/10',
  },
}

// Cached function to get agent dashboard data
// Batches all queries and caches for 1 minute
const getAgentData = unstable_cache(
  async () => {
    const supabase = createAdminClient()

    // Get execution metrics (last 24 hours)
    const oneDayAgo = new Date()
    oneDayAgo.setDate(oneDayAgo.getDate() - 1)

    // Batch fetch agents and executions in parallel for better performance
    const [agentsResult, executionsResult] = await Promise.all([
      // Get all agents - only select needed columns
      supabase
        .from('ai_agents')
        .select('slug, name, description, category, is_active, execution_mode')
        .order('category')
        .order('name'),
      // Get recent executions
      supabase
        .from('ai_agent_executions')
        .select('agent_slug, status, duration_ms, tokens_used, created_at')
        .gte('created_at', oneDayAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(100),
    ])

    const { data: agents, error: agentsError } = agentsResult
    const { data: recentExecutions } = executionsResult

    if (agentsError) {
      console.error('Error fetching agents:', agentsError)
      return {
        agents: [],
        metrics: {} as Record<string, { total: number; success: number; failed: number; avgDuration: number; tokens: number }>,
        recentExecutions: []
      }
    }

    // Calculate metrics per agent using a single pass
    interface AgentMetric {
      total: number
      success: number
      failed: number
      avgDuration: number
      tokens: number
    }
    const metrics: Record<string, AgentMetric> = {}

    for (const exec of recentExecutions || []) {
      if (!metrics[exec.agent_slug]) {
        metrics[exec.agent_slug] = {
          total: 0,
          success: 0,
          failed: 0,
          avgDuration: 0,
          tokens: 0,
        }
      }

      const existing = metrics[exec.agent_slug]
      existing.total++
      if (exec.status === 'completed') existing.success++
      if (exec.status === 'failed') existing.failed++
      if (exec.duration_ms) {
        existing.avgDuration =
          (existing.avgDuration * (existing.total - 1) + exec.duration_ms) / existing.total
      }
      existing.tokens += exec.tokens_used || 0
    }

    return {
      agents: agents || [],
      metrics,
      recentExecutions: recentExecutions?.slice(0, 10) || [],
    }
  },
  ['admin-agents-dashboard'],
  {
    revalidate: CACHE_REVALIDATION.AGENT_METRICS,
    tags: [CACHE_TAGS.AI_AGENTS, CACHE_TAGS.AI_AGENT_EXECUTIONS],
  }
)

function AgentCard({
  agent,
  metrics,
}: {
  agent: {
    slug: string
    name: string
    description: string | null
    category: AIAgentCategory
    is_active: boolean
    execution_mode: string
  }
  metrics?: { total: number; success: number; failed: number; avgDuration: number; tokens: number }
}) {
  const config = categoryConfig[agent.category]
  const Icon = config.icon

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4 transition-shadow hover:shadow-md">
      <div className="mb-3 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={`rounded-lg p-2 ${config.color}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-medium text-neutral-900">{agent.name}</h3>
            <p className="text-xs text-neutral-500">{agent.slug}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-2 py-0.5 text-xs ${
              agent.is_active
                ? 'bg-green-100 text-green-700'
                : 'bg-neutral-100 text-neutral-500'
            }`}
          >
            {agent.is_active ? 'Active' : 'Inactive'}
          </span>
          <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">
            {agent.execution_mode}
          </span>
        </div>
      </div>

      <p className="mb-4 line-clamp-2 text-sm text-neutral-600">
        {agent.description || 'No description'}
      </p>

      {metrics && metrics.total > 0 ? (
        <div className="grid grid-cols-4 gap-2 border-t border-neutral-100 pt-3">
          <div className="text-center">
            <p className="text-lg font-semibold text-neutral-900">{metrics.total}</p>
            <p className="text-xs text-neutral-500">Runs</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold text-green-600">{metrics.success}</p>
            <p className="text-xs text-neutral-500">Success</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold text-red-600">{metrics.failed}</p>
            <p className="text-xs text-neutral-500">Failed</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold text-neutral-900">
              {Math.round(metrics.avgDuration)}
            </p>
            <p className="text-xs text-neutral-500">Avg ms</p>
          </div>
        </div>
      ) : (
        <div className="border-t border-neutral-100 pt-3 text-center text-sm text-neutral-400">
          No executions in last 24h
        </div>
      )}

      <div className="mt-4 flex gap-2">
        <Link href={`/admin/agents/${agent.slug}`} className="flex-1">
          <Button variant="outline" size="sm" className="w-full">
            View Details
          </Button>
        </Link>
        <form action={`/api/admin/agents/${agent.slug}/execute`} method="POST">
          <Button
            type="submit"
            size="sm"
            variant="default"
            disabled={!agent.is_active}
            className="gap-1"
          >
            <PlayCircle className="h-4 w-4" />
            Run
          </Button>
        </form>
      </div>
    </div>
  )
}

function RecentExecutionsList({
  executions,
}: {
  executions: {
    agent_slug: string
    status: string
    duration_ms: number | null
    tokens_used: number
    created_at: string
  }[]
}) {
  if (executions.length === 0) {
    return (
      <div className="py-8 text-center text-neutral-500">No recent executions</div>
    )
  }

  return (
    <div className="divide-y divide-neutral-100">
      {executions.map((exec, i) => (
        <div key={i} className="flex items-center justify-between py-3">
          <div className="flex items-center gap-3">
            {exec.status === 'completed' ? (
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            ) : exec.status === 'failed' ? (
              <XCircle className="h-4 w-4 text-red-500" />
            ) : (
              <Clock className="h-4 w-4 text-yellow-500" />
            )}
            <div>
              <p className="text-sm font-medium text-neutral-900">{exec.agent_slug}</p>
              <p className="text-xs text-neutral-500">
                {new Date(exec.created_at).toLocaleString()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm text-neutral-500">
            {exec.duration_ms && <span>{exec.duration_ms}ms</span>}
            {exec.tokens_used > 0 && <span>{exec.tokens_used} tokens</span>}
          </div>
        </div>
      ))}
    </div>
  )
}

async function AgentsDashboard() {
  const { agents, metrics, recentExecutions } = await getAgentData()

  // Group agents by category
  type AgentRow = (typeof agents)[number]
  const groupedAgents: Record<AIAgentCategory, AgentRow[]> = {
    operations: [],
    content: [],
    development: [],
    lifestyle: [],
  }

  for (const agent of agents) {
    const category = agent.category as AIAgentCategory
    groupedAgents[category].push(agent)
  }

  // Calculate summary stats
  const totalAgents = agents.length
  const activeAgents = agents.filter((a) => a.is_active).length
  const totalExecutions = Object.values(metrics).reduce(
    (sum: number, m) => sum + (m as { total: number }).total,
    0
  )
  const totalTokens = Object.values(metrics).reduce(
    (sum: number, m) => sum + (m as { tokens: number }).tokens,
    0
  )

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">AI Agents</h1>
          <p className="text-neutral-600">
            Manage and monitor AI agents for operations, content, and development
          </p>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-100 p-2">
              <Bot className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-neutral-900">{totalAgents}</p>
              <p className="text-sm text-neutral-500">Total Agents</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-green-100 p-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-neutral-900">{activeAgents}</p>
              <p className="text-sm text-neutral-500">Active Agents</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-purple-100 p-2">
              <Zap className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-neutral-900">{totalExecutions}</p>
              <p className="text-sm text-neutral-500">Executions (24h)</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-orange-100 p-2">
              <Activity className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-neutral-900">
                {totalTokens.toLocaleString()}
              </p>
              <p className="text-sm text-neutral-500">Tokens Used (24h)</p>
            </div>
          </div>
        </div>
      </div>

      {/* Agents by Category */}
      {(Object.keys(categoryConfig) as AIAgentCategory[]).map((category) => {
        const categoryAgents = groupedAgents[category] || []
        if (categoryAgents.length === 0) return null

        const config = categoryConfig[category]
        const Icon = config.icon

        return (
          <div key={category}>
            <div className="mb-4 flex items-center gap-2">
              <Icon className={`h-5 w-5 ${config.color.split(' ')[0]}`} />
              <h2 className="text-lg font-semibold text-neutral-900">
                {config.label} Agents
              </h2>
              <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">
                {categoryAgents.length}
              </span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {categoryAgents.map((agent) => (
                <AgentCard
                  key={agent.slug}
                  agent={agent as Parameters<typeof AgentCard>[0]['agent']}
                  metrics={metrics[agent.slug] as Parameters<typeof AgentCard>[0]['metrics']}
                />
              ))}
            </div>
          </div>
        )
      })}

      {/* Recent Executions */}
      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-neutral-900">
          Recent Executions
        </h2>
        <RecentExecutionsList executions={recentExecutions} />
      </div>
    </div>
  )
}

export default function AdminAgentsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-neutral-200 border-t-neutral-800" />
        </div>
      }
    >
      <AgentsDashboard />
    </Suspense>
  )
}

export const metadata = {
  title: 'AI Agents | ASM Admin',
  description: 'Manage and monitor AI agents',
}
