import { Suspense } from 'react'
import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'
import {
  Activity,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Loader2,
  Zap,
  AlertTriangle,
  Server,
  Upload,
  ArrowLeft,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ProcessingJobsTable, ProcessingJob } from '@/components/processing/JobsTable'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

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
  const supabase = createAdminClient()

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
  const supabase = createAdminClient()

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
    <Card variant="glass">
      <CardContent className="pt-6">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${color}`}>
            <Icon className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-[24px] font-semibold text-white">
              {value ?? '-'}{suffix}
            </p>
            <p className="text-[13px] text-[#a1a1a6]">{title}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default async function PartnerProcessingPage() {
  let stats: ProcessingStats = {
    total: 0,
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0,
    avgProcessingTime: null,
    successRate: null,
  }
  let jobs: ProcessingJob[] = []

  try {
    ;[stats, jobs] = await Promise.all([
      getProcessingStats(),
      getRecentJobs() as Promise<ProcessingJob[]>,
    ])
  } catch (error) {
    console.error('Error fetching processing data:', error)
  }

  const activeJobs = jobs.filter(j => j.status && ['pending', 'queued', 'uploading', 'processing'].includes(j.status))
  const failedJobs = jobs.filter(j => j.status === 'failed')

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/team">
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600">
              <Server className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-[28px] font-semibold tracking-tight text-white">StashDR Processing</h1>
              <p className="text-[15px] text-[#a1a1a6]">HDR photo processing pipeline</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/team/processing" className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <StatsCard
          title="Total Jobs"
          value={stats.total}
          icon={Activity}
          color="bg-[#636366]"
        />
        <StatsCard
          title="In Queue"
          value={stats.pending}
          icon={Clock}
          color="bg-amber-500"
        />
        <StatsCard
          title="Processing"
          value={stats.processing}
          icon={Loader2}
          color="bg-blue-500"
        />
        <StatsCard
          title="Completed"
          value={stats.completed}
          icon={CheckCircle2}
          color="bg-green-500"
        />
        <StatsCard
          title="Failed"
          value={stats.failed}
          icon={XCircle}
          color="bg-red-500"
        />
        <StatsCard
          title="Avg Time"
          value={stats.avgProcessingTime !== null ? stats.avgProcessingTime.toFixed(1) : null}
          icon={Zap}
          color="bg-purple-500"
          suffix="s"
        />
      </div>

      {/* Success Rate */}
      {stats.successRate !== null && (
        <Card variant="glass">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[15px] font-medium text-white">Success Rate</span>
              <span className={`text-lg font-bold ${stats.successRate >= 90 ? 'text-green-400' : stats.successRate >= 70 ? 'text-amber-400' : 'text-red-400'}`}>
                {stats.successRate.toFixed(1)}%
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[#1c1c1e]">
              <div
                className={`h-full transition-all ${stats.successRate >= 90 ? 'bg-green-500' : stats.successRate >= 70 ? 'bg-amber-500' : 'bg-red-500'}`}
                style={{ width: `${stats.successRate}%` }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Jobs Alert */}
      {activeJobs.length > 0 && (
        <Card className="border-blue-500/30 bg-blue-500/10">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-blue-400" />
              <span className="font-medium text-blue-300">
                {activeJobs.length} job{activeJobs.length !== 1 ? 's' : ''} currently processing
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Failed Jobs Alert */}
      {failedJobs.length > 0 && (
        <Card className="border-red-500/30 bg-red-500/10">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-red-400" />
                <span className="font-medium text-red-300">
                  {failedJobs.length} failed job{failedJobs.length !== 1 ? 's' : ''} need attention
                </span>
              </div>
              <Button variant="outline" size="sm" className="border-red-500/50 text-red-400 hover:bg-red-500/20">
                Retry All
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Jobs Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-[17px]">Recent Jobs</CardTitle>
          <CardDescription>View and manage HDR processing jobs</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Suspense fallback={
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-[#636366]" />
            </div>
          }>
            <ProcessingJobsTable jobs={jobs} />
          </Suspense>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div>
        <h2 className="text-[17px] font-semibold text-white mb-4">Quick Actions</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link href="/admin/ops/processing">
            <Card variant="interactive" className="h-full">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#636366]">
                    <Activity className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-[15px]">Full Dashboard</CardTitle>
                    <CardDescription>Advanced processing controls</CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </Link>
          <Link href="/admin/ops">
            <Card variant="interactive" className="h-full">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500">
                    <Upload className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-[15px]">Operations</CardTitle>
                    <CardDescription>View jobs and upload media</CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </Link>
          <Link href="/admin/qc/live">
            <Card variant="interactive" className="h-full">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-500">
                    <CheckCircle2 className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-[15px]">QC Queue</CardTitle>
                    <CardDescription>Review processed photos</CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  )
}
