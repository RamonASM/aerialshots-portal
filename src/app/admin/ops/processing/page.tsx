import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import {
  Activity,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Loader2,
  ChevronRight,
  Zap,
  AlertTriangle,
  Server,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ProcessingJobsTable, ProcessingJob } from '@/components/processing/JobsTable'
import { formatDistanceToNow } from 'date-fns'

interface ProcessingStats {
  total: number
  pending: number
  processing: number
  completed: number
  failed: number
  avgProcessingTime: number | null
  successRate: number | null
}

interface JobMetrics {
  alignment_time_ms?: number
  segmentation_time_ms?: number
  fusion_time_ms?: number
  export_time_ms?: number
  total_time_ms?: number
}

async function getProcessingStats(): Promise<ProcessingStats> {
  const supabase = await createClient()

  // Get job counts by status
  const { data: jobs } = await supabase
    .from('processing_jobs')
    .select('status, metrics, completed_at, started_at')
    .order('created_at', { ascending: false })
    .limit(500)

  const stats: ProcessingStats = {
    total: jobs?.length || 0,
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0,
    avgProcessingTime: null,
    successRate: null,
  }

  let totalTime = 0
  let completedWithTime = 0

  jobs?.forEach(job => {
    const metrics = job.metrics as JobMetrics | null
    switch (job.status) {
      case 'pending':
      case 'queued':
      case 'uploading':
        stats.pending++
        break
      case 'processing':
        stats.processing++
        break
      case 'completed':
        stats.completed++
        if (metrics?.total_time_ms) {
          totalTime += metrics.total_time_ms
          completedWithTime++
        }
        break
      case 'failed':
      case 'cancelled':
        stats.failed++
        break
    }
  })

  if (completedWithTime > 0) {
    stats.avgProcessingTime = totalTime / completedWithTime / 1000 // in seconds
  }

  if (stats.completed + stats.failed > 0) {
    stats.successRate = (stats.completed / (stats.completed + stats.failed)) * 100
  }

  return stats
}

async function getRecentJobs() {
  const supabase = await createClient()

  const { data: jobs } = await supabase
    .from('processing_jobs')
    .select(`
      *,
      listings:listing_id (
        id,
        address
      )
    `)
    .order('created_at', { ascending: false })
    .limit(50)

  return jobs || []
}

function StatsCard({
  title,
  value,
  icon: Icon,
  color,
  suffix = '',
}: {
  title: string
  value: number | string | null
  icon: React.ElementType
  color: string
  suffix?: string
}) {
  return (
    <div className="rounded-lg bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <div className={`rounded-full p-2 ${color}`}>
          <Icon className="h-4 w-4" />
        </div>
        <span className="text-sm text-neutral-600">{title}</span>
      </div>
      <p className="mt-2 text-2xl font-bold text-neutral-900">
        {value ?? '-'}{suffix}
      </p>
    </div>
  )
}

export default async function ProcessingDashboardPage() {
  const [stats, jobs] = await Promise.all([
    getProcessingStats(),
    getRecentJobs(),
  ])

  const activeJobs = jobs.filter(j => ['pending', 'queued', 'uploading', 'processing'].includes(j.status))
  const failedJobs = jobs.filter(j => j.status === 'failed')

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-neutral-200 bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Server className="h-6 w-6 text-[#ff4533]" />
            <div>
              <h1 className="text-xl font-bold text-neutral-900">Processing Monitor</h1>
              <p className="text-sm text-neutral-500">FoundDR HDR Pipeline Status</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/ops/processing" className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <div className="p-6">
        {/* Stats Grid */}
        <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
          <StatsCard
            title="Total Jobs"
            value={stats.total}
            icon={Activity}
            color="bg-neutral-100 text-neutral-600"
          />
          <StatsCard
            title="In Queue"
            value={stats.pending}
            icon={Clock}
            color="bg-amber-100 text-amber-600"
          />
          <StatsCard
            title="Processing"
            value={stats.processing}
            icon={Loader2}
            color="bg-blue-100 text-blue-600"
          />
          <StatsCard
            title="Completed"
            value={stats.completed}
            icon={CheckCircle2}
            color="bg-green-100 text-green-600"
          />
          <StatsCard
            title="Failed"
            value={stats.failed}
            icon={XCircle}
            color="bg-red-100 text-red-600"
          />
          <StatsCard
            title="Avg Time"
            value={stats.avgProcessingTime !== null ? stats.avgProcessingTime.toFixed(1) : null}
            icon={Zap}
            color="bg-purple-100 text-purple-600"
            suffix="s"
          />
        </div>

        {/* Success Rate */}
        {stats.successRate !== null && (
          <div className="mb-6 rounded-lg bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-neutral-700">Success Rate</span>
              <span className={`text-lg font-bold ${stats.successRate >= 90 ? 'text-green-600' : stats.successRate >= 70 ? 'text-amber-600' : 'text-red-600'}`}>
                {stats.successRate.toFixed(1)}%
              </span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-neutral-200">
              <div
                className={`h-full ${stats.successRate >= 90 ? 'bg-green-500' : stats.successRate >= 70 ? 'bg-amber-500' : 'bg-red-500'}`}
                style={{ width: `${stats.successRate}%` }}
              />
            </div>
          </div>
        )}

        {/* Active Jobs Alert */}
        {activeJobs.length > 0 && (
          <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
            <div className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
              <span className="font-medium text-blue-900">
                {activeJobs.length} job{activeJobs.length !== 1 ? 's' : ''} currently processing
              </span>
            </div>
          </div>
        )}

        {/* Failed Jobs Alert */}
        {failedJobs.length > 0 && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <span className="font-medium text-red-900">
                  {failedJobs.length} failed job{failedJobs.length !== 1 ? 's' : ''} need attention
                </span>
              </div>
              <Button variant="outline" size="sm" className="border-red-300 text-red-700 hover:bg-red-100">
                Retry All
              </Button>
            </div>
          </div>
        )}

        {/* Jobs Table */}
        <div className="rounded-lg bg-white shadow-sm">
          <div className="border-b border-neutral-200 px-4 py-3">
            <h2 className="font-semibold text-neutral-900">Recent Jobs</h2>
          </div>
          <Suspense fallback={
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
            </div>
          }>
            <ProcessingJobsTable jobs={jobs as ProcessingJob[]} />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
