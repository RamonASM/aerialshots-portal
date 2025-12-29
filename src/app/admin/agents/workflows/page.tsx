import { Suspense } from 'react'
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { unstable_cache } from 'next/cache'
import {
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  Pause,
  Play,
  RefreshCw,
  ArrowLeft,
  ChevronRight,
  Home,
  Layers,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CACHE_REVALIDATION, CACHE_TAGS } from '@/lib/utils/cache'

type WorkflowStatus = 'pending' | 'running' | 'completed' | 'failed' | 'paused' | 'cancelled'

interface Workflow {
  id: string
  name: string
  trigger_event: string
  status: WorkflowStatus
  current_step: number
  steps: Record<string, unknown>[]
  listing_id: string | null
  campaign_id: string | null
  error_message: string | null
  created_at: string
  completed_at: string | null
  listing?: {
    id: string
    address: string
    city: string | null
  } | null
}

const statusConfig: Record<WorkflowStatus, { label: string; icon: typeof Activity; color: string }> = {
  pending: {
    label: 'Pending',
    icon: Clock,
    color: 'text-yellow-600 bg-yellow-100',
  },
  running: {
    label: 'Running',
    icon: RefreshCw,
    color: 'text-blue-600 bg-blue-100',
  },
  completed: {
    label: 'Completed',
    icon: CheckCircle2,
    color: 'text-green-600 bg-green-100',
  },
  failed: {
    label: 'Failed',
    icon: XCircle,
    color: 'text-red-600 bg-red-100',
  },
  paused: {
    label: 'Paused',
    icon: Pause,
    color: 'text-orange-600 bg-orange-100',
  },
  cancelled: {
    label: 'Cancelled',
    icon: XCircle,
    color: 'text-neutral-600 bg-neutral-100',
  },
}

// Cached function to get workflow data
const getWorkflowData = unstable_cache(
  async () => {
    const supabase = createAdminClient()

    // Get workflow executions
    const { data: workflows, error } = await supabase
      .from('ai_agent_workflows')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('Error fetching workflows:', error)
      return { workflows: [], stats: { total: 0, running: 0, completed: 0, failed: 0 } }
    }

    // Get listing info for workflows that have listing_id
    const listingIds = workflows?.filter(w => w.listing_id).map(w => w.listing_id!) || []
    let listingMap: Record<string, { id: string; address: string; city: string | null }> = {}

    if (listingIds.length > 0) {
      const { data: listings } = await supabase
        .from('listings')
        .select('id, address, city')
        .in('id', listingIds)

      listingMap = (listings || []).reduce((acc, l) => {
        acc[l.id] = l
        return acc
      }, {} as Record<string, { id: string; address: string; city: string | null }>)
    }

    // Merge workflows with listing info
    const workflowsWithListings = workflows?.map(w => ({
      ...w,
      listing: w.listing_id ? listingMap[w.listing_id] || null : null,
    })) || []

    // Calculate stats
    const stats = {
      total: workflows?.length || 0,
      running: workflows?.filter(w => w.status === 'running' || w.status === 'pending').length || 0,
      completed: workflows?.filter(w => w.status === 'completed').length || 0,
      failed: workflows?.filter(w => w.status === 'failed').length || 0,
    }

    return {
      workflows: workflowsWithListings as Workflow[],
      stats,
    }
  },
  ['admin-workflows-dashboard'],
  {
    revalidate: CACHE_REVALIDATION.AGENT_METRICS,
    tags: [CACHE_TAGS.AI_AGENTS, CACHE_TAGS.AI_AGENT_EXECUTIONS],
  }
)

function WorkflowCard({ workflow }: { workflow: Workflow }) {
  const config = statusConfig[workflow.status]
  const Icon = config.icon
  const totalSteps = workflow.steps?.length || 0
  const progress = totalSteps > 0 ? (workflow.current_step / totalSteps) * 100 : 0

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4 transition-shadow hover:shadow-md">
      <div className="mb-3 flex items-start justify-between">
        <div>
          <h3 className="font-medium text-neutral-900">{workflow.name}</h3>
          <p className="text-xs text-neutral-500">{workflow.trigger_event}</p>
        </div>
        <div className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${config.color}`}>
          <Icon className="h-3.5 w-3.5" />
          {config.label}
        </div>
      </div>

      {/* Progress bar */}
      {totalSteps > 0 && (
        <div className="mb-3">
          <div className="mb-1 flex justify-between text-xs text-neutral-500">
            <span>Step {workflow.current_step} of {totalSteps}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-neutral-100">
            <div
              className={`h-1.5 rounded-full transition-all ${
                workflow.status === 'failed' ? 'bg-red-500' :
                workflow.status === 'completed' ? 'bg-green-500' : 'bg-blue-500'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Listing info */}
      {workflow.listing && (
        <div className="mb-3 flex items-center gap-2 text-sm text-neutral-600">
          <Home className="h-4 w-4" />
          <span className="truncate">{workflow.listing.address}</span>
          {workflow.listing.city && (
            <span className="text-neutral-400">• {workflow.listing.city}</span>
          )}
        </div>
      )}

      {/* Error message */}
      {workflow.error_message && (
        <div className="mb-3 rounded-lg bg-red-50 p-2 text-xs text-red-700">
          {workflow.error_message}
        </div>
      )}

      {/* Timestamps */}
      <div className="flex items-center justify-between text-xs text-neutral-500">
        <span>Started: {new Date(workflow.created_at).toLocaleString()}</span>
        {workflow.completed_at && (
          <span>Completed: {new Date(workflow.completed_at).toLocaleString()}</span>
        )}
      </div>

      {/* Actions for paused/failed workflows */}
      {(workflow.status === 'paused' || workflow.status === 'failed') && (
        <div className="mt-3 flex gap-2">
          <form action={`/api/admin/agents/workflows/${workflow.id}/resume`} method="POST" className="flex-1">
            <Button type="submit" size="sm" variant="outline" className="w-full gap-1">
              <Play className="h-3.5 w-3.5" />
              Resume
            </Button>
          </form>
        </div>
      )}
    </div>
  )
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string
  value: number
  icon: typeof Activity
  color: string
}) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <div className="flex items-center gap-3">
        <div className={`rounded-lg p-2 ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-2xl font-bold text-neutral-900">{value}</p>
          <p className="text-sm text-neutral-500">{label}</p>
        </div>
      </div>
    </div>
  )
}

async function WorkflowsDashboard() {
  const { workflows, stats } = await getWorkflowData()

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/agents">
            <Button variant="ghost" size="sm" className="gap-1">
              <ArrowLeft className="h-4 w-4" />
              Back to Agents
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">Workflow Executions</h1>
            <p className="text-neutral-600">
              Monitor and manage multi-step agent workflows
            </p>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Workflows"
          value={stats.total}
          icon={Layers}
          color="bg-blue-100 text-blue-600"
        />
        <StatCard
          label="Running"
          value={stats.running}
          icon={RefreshCw}
          color="bg-yellow-100 text-yellow-600"
        />
        <StatCard
          label="Completed"
          value={stats.completed}
          icon={CheckCircle2}
          color="bg-green-100 text-green-600"
        />
        <StatCard
          label="Failed"
          value={stats.failed}
          icon={XCircle}
          color="bg-red-100 text-red-600"
        />
      </div>

      {/* Workflow List */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-neutral-900">Recent Workflows</h2>
          <Button variant="outline" size="sm" className="gap-1">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>

        {workflows.length === 0 ? (
          <div className="rounded-lg border border-neutral-200 bg-white p-12 text-center">
            <Layers className="mx-auto h-12 w-12 text-neutral-300" />
            <h3 className="mt-4 text-lg font-medium text-neutral-900">No workflows yet</h3>
            <p className="mt-2 text-neutral-600">
              Workflows are triggered automatically by events like new orders or content creation.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {workflows.map((workflow) => (
              <WorkflowCard key={workflow.id} workflow={workflow} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function AdminWorkflowsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-neutral-200 border-t-neutral-800" />
        </div>
      }
    >
      <WorkflowsDashboard />
    </Suspense>
  )
}

export const metadata = {
  title: 'Workflow Executions | ASM Admin',
  description: 'Monitor and manage AI agent workflows',
}
