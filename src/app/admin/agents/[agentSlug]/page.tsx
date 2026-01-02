import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  ArrowLeft,
  Bot,
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  Code2,
  FileText,
  Map,
  RefreshCw,
  Play,
  Settings,
  Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Metadata } from 'next'
import type { AIAgentCategory } from '@/lib/agents/types'

interface PageProps {
  params: Promise<{ agentSlug: string }>
}

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
  analytics: {
    label: 'Analytics',
    icon: Activity,
    color: 'text-cyan-500 bg-cyan-500/10',
  },
  marketing: {
    label: 'Marketing',
    icon: Zap,
    color: 'text-pink-500 bg-pink-500/10',
  },
  communication: {
    label: 'Communication',
    icon: Bot,
    color: 'text-yellow-500 bg-yellow-500/10',
  },
}

async function getAgentDetails(agentSlug: string) {
  const supabase = createAdminClient()

  // Get agent
  const { data: agent, error } = await supabase
    .from('ai_agents')
    .select('*')
    .eq('slug', agentSlug)
    .single()

  if (error || !agent) {
    return null
  }

  // Get recent executions
  const { data: executions } = await supabase
    .from('ai_agent_executions')
    .select('*')
    .eq('agent_slug', agentSlug)
    .order('created_at', { ascending: false })
    .limit(25)

  // Calculate stats
  const stats = {
    total: executions?.length || 0,
    success: executions?.filter((e) => e.status === 'completed').length || 0,
    failed: executions?.filter((e) => e.status === 'failed').length || 0,
    avgDuration: 0,
    totalTokens: 0,
  }

  if (executions && executions.length > 0) {
    const durationsWithValue = executions.filter((e) => e.duration_ms)
    if (durationsWithValue.length > 0) {
      stats.avgDuration = Math.round(
        durationsWithValue.reduce((sum, e) => sum + (e.duration_ms || 0), 0) /
          durationsWithValue.length
      )
    }
    stats.totalTokens = executions.reduce((sum, e) => sum + (e.tokens_used || 0), 0)
  }

  return { agent, executions: executions || [], stats }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { agentSlug } = await params
  const data = await getAgentDetails(agentSlug)

  if (!data) {
    return { title: 'Agent Not Found | ASM Admin' }
  }

  return {
    title: `${data.agent.name} | AI Agents | ASM Admin`,
    description: data.agent.description || `AI Agent: ${data.agent.name}`,
  }
}

export default async function AgentDetailPage({ params }: PageProps) {
  const { agentSlug } = await params
  const data = await getAgentDetails(agentSlug)

  if (!data) {
    notFound()
  }

  const { agent, executions, stats } = data
  const config = categoryConfig[agent.category as AIAgentCategory]
  const CategoryIcon = config?.icon || Bot

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Link
            href="/admin/agents"
            className="mt-1 text-neutral-400 hover:text-neutral-600"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex items-center gap-4">
            <div className={`rounded-lg p-3 ${config?.color || 'bg-neutral-100'}`}>
              <CategoryIcon className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-neutral-900">{agent.name}</h1>
              <div className="mt-1 flex items-center gap-2">
                <code className="rounded bg-neutral-100 px-2 py-0.5 text-sm text-neutral-600">
                  {agent.slug}
                </code>
                <span className={`rounded-full px-2 py-0.5 text-xs ${config?.color.replace('text-', 'text-').replace('bg-', 'bg-') || 'bg-neutral-100 text-neutral-600'}`}>
                  {config?.label || agent.category}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    agent.is_active
                      ? 'bg-green-100 text-green-700'
                      : 'bg-neutral-100 text-neutral-500'
                  }`}
                >
                  {agent.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1">
            <Settings className="h-4 w-4" />
            Configure
          </Button>
          <form action={`/api/admin/agents/${agent.slug}/execute`} method="POST">
            <Button
              type="submit"
              size="sm"
              disabled={!agent.is_active}
              className="gap-1"
            >
              <Play className="h-4 w-4" />
              Run Agent
            </Button>
          </form>
        </div>
      </div>

      {/* Description */}
      {agent.description && (
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <p className="text-neutral-700">{agent.description}</p>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <p className="text-sm text-neutral-500">Total Executions</p>
          <p className="mt-1 text-2xl font-bold text-neutral-900">{stats.total}</p>
        </div>
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <p className="text-sm text-neutral-500">Success Rate</p>
          <p className="mt-1 text-2xl font-bold text-green-600">
            {stats.total > 0
              ? `${Math.round((stats.success / stats.total) * 100)}%`
              : '-'}
          </p>
        </div>
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <p className="text-sm text-neutral-500">Avg Duration</p>
          <p className="mt-1 text-2xl font-bold text-neutral-900">
            {stats.avgDuration > 0 ? `${stats.avgDuration}ms` : '-'}
          </p>
        </div>
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <p className="text-sm text-neutral-500">Total Tokens</p>
          <p className="mt-1 text-2xl font-bold text-neutral-900">
            {stats.totalTokens > 0 ? stats.totalTokens.toLocaleString() : '-'}
          </p>
        </div>
      </div>

      {/* System Prompt */}
      {agent.system_prompt && (
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <h2 className="mb-3 text-lg font-semibold text-neutral-900">
            System Prompt
          </h2>
          <pre className="max-h-48 overflow-auto rounded-lg bg-neutral-50 p-3 text-sm text-neutral-700 whitespace-pre-wrap">
            {agent.system_prompt}
          </pre>
        </div>
      )}

      {/* Configuration */}
      {agent.config && Object.keys(agent.config as object).length > 0 && (
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <h2 className="mb-3 text-lg font-semibold text-neutral-900">
            Configuration
          </h2>
          <pre className="rounded-lg bg-neutral-50 p-3 text-sm text-neutral-700">
            {JSON.stringify(agent.config, null, 2)}
          </pre>
        </div>
      )}

      {/* Execution History */}
      <div className="rounded-lg border border-neutral-200 bg-white p-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-neutral-900">
            Execution History
          </h2>
          <Button variant="ghost" size="sm" className="gap-1">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>

        {executions.length === 0 ? (
          <div className="py-8 text-center text-neutral-500">
            No executions yet
          </div>
        ) : (
          <div className="divide-y divide-neutral-100">
            {executions.map((exec) => (
              <div
                key={exec.id}
                className="flex items-start justify-between py-4"
              >
                <div className="flex items-start gap-3">
                  {exec.status === 'completed' ? (
                    <CheckCircle2 className="mt-0.5 h-5 w-5 text-green-500" />
                  ) : exec.status === 'failed' ? (
                    <XCircle className="mt-0.5 h-5 w-5 text-red-500" />
                  ) : exec.status === 'running' ? (
                    <RefreshCw className="mt-0.5 h-5 w-5 animate-spin text-blue-500" />
                  ) : (
                    <Clock className="mt-0.5 h-5 w-5 text-yellow-500" />
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${
                          exec.status === 'completed'
                            ? 'bg-green-100 text-green-700'
                            : exec.status === 'failed'
                              ? 'bg-red-100 text-red-700'
                              : exec.status === 'running'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                        {exec.status}
                      </span>
                      <span className="text-xs text-neutral-400">
                        {exec.trigger_source || 'manual'}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-neutral-600">
                      {exec.created_at ? new Date(exec.created_at).toLocaleString() : 'N/A'}
                    </p>
                    {exec.error_message && (
                      <p className="mt-1 text-sm text-red-600">
                        {exec.error_message}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm text-neutral-500">
                  {exec.duration_ms && <span>{exec.duration_ms}ms</span>}
                  {exec.tokens_used && exec.tokens_used > 0 && (
                    <span>{exec.tokens_used} tokens</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
