import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  Image,
  Clock,
  CheckCircle,
  Play,
  AlertTriangle,
  Palette,
  ArrowRight,
  Upload,
  Timer,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

export default async function EditorDashboardPage() {
  const supabase = await createClient()

  // Verify user is an editor
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/staff-login')
  }

  const { data: staff } = await supabase
    .from('staff')
    .select('*')
    .eq('email', user.email!)
    .single()

  if (!staff || (staff.role !== 'editor' && staff.role !== 'admin')) {
    redirect('/admin')
  }

  // Get jobs awaiting editing (staged status, ready for editor)
  const { data: awaitingJobsData } = await supabase
    .from('listings')
    .select('*')
    .in('ops_status', ['staged', 'awaiting_editing'])
    .order('staged_at', { ascending: true })

  // Get jobs in editing (assigned to this editor)
  const { data: inProgressJobsData } = await supabase
    .from('listings')
    .select('*')
    .eq('ops_status', 'in_editing')
    .eq('editor_id', staff.id)
    .order('editing_started_at', { ascending: true })

  // Get recently completed jobs (last 7 days)
  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)

  const { data: completedJobsData } = await supabase
    .from('listings')
    .select('*')
    .eq('editor_id', staff.id)
    .in('ops_status', ['ready_for_qc', 'in_qc', 'delivered'])
    .gte('editing_completed_at', weekAgo.toISOString())
    .order('editing_completed_at', { ascending: false })
    .limit(10)

  // Get agents for all jobs
  const allJobs = [
    ...(awaitingJobsData || []),
    ...(inProgressJobsData || []),
    ...(completedJobsData || []),
  ]
  const agentIds = [...new Set(allJobs.map((j) => j.agent_id).filter((id): id is string => id !== null))]
  const { data: agents } = agentIds.length > 0
    ? await supabase.from('agents').select('id, name').in('id', agentIds)
    : { data: [] }

  // Combine data
  const enrichJob = (job: any) => ({
    ...job,
    agent: agents?.find((a) => a.id === job.agent_id) || null,
  })

  const awaitingJobs = awaitingJobsData?.map(enrichJob) || []
  const inProgressJobs = inProgressJobsData?.map(enrichJob) || []
  const completedJobs = completedJobsData?.map(enrichJob) || []

  // Count rush jobs
  const rushJobs = awaitingJobs.filter((j) => j.is_rush)

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <header className="border-b border-neutral-200 bg-white px-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-neutral-900">Editor Dashboard</h1>
            <p className="text-sm text-neutral-600">
              Welcome back, {staff.name}
            </p>
          </div>
          <Link
            href="/admin/ops"
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            Ops Overview
          </Link>
        </div>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2 p-4">
        <div className="rounded-lg bg-white p-3 text-center">
          <p className="text-2xl font-bold text-blue-600">{awaitingJobs.length}</p>
          <p className="text-xs text-neutral-500">Awaiting Edit</p>
        </div>
        <div className="rounded-lg bg-white p-3 text-center">
          <p className="text-2xl font-bold text-yellow-600">{inProgressJobs.length}</p>
          <p className="text-xs text-neutral-500">In Progress</p>
        </div>
        <div className="rounded-lg bg-white p-3 text-center">
          <p className="text-2xl font-bold text-green-600">{completedJobs.length}</p>
          <p className="text-xs text-neutral-500">This Week</p>
        </div>
        <div className="rounded-lg bg-amber-50 p-3 text-center">
          <p className="text-2xl font-bold text-amber-600">{rushJobs.length}</p>
          <p className="text-xs text-amber-700">Rush</p>
        </div>
      </div>

      {/* Rush Jobs Alert */}
      {rushJobs.length > 0 && (
        <div className="mx-4 mb-4 rounded-lg border-2 border-amber-400 bg-amber-50 p-4">
          <div className="flex items-center gap-2 text-amber-700">
            <AlertTriangle className="h-5 w-5" />
            <span className="font-medium">Rush Jobs Need Priority</span>
          </div>
          <div className="mt-2 space-y-2">
            {rushJobs.slice(0, 3).map((job) => (
              <Link
                key={job.id}
                href={`/admin/ops/editor/jobs/${job.id}`}
                className="flex items-center justify-between rounded-lg bg-white p-3"
              >
                <div>
                  <p className="font-medium text-neutral-900">{job.address}</p>
                  <p className="text-sm text-neutral-500">
                    {job.agent?.name || 'Unknown Agent'}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-amber-600" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Currently Editing */}
      {inProgressJobs.length > 0 && (
        <div className="mx-4 mb-4">
          <h2 className="mb-3 font-semibold text-neutral-900 flex items-center gap-2">
            <Palette className="h-5 w-5 text-yellow-500" />
            Currently Editing
          </h2>
          <div className="space-y-3">
            {inProgressJobs.map((job) => (
              <div
                key={job.id}
                className="rounded-lg border-2 border-yellow-400 bg-yellow-50 p-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium text-neutral-900">{job.address}</h3>
                    <p className="text-sm text-neutral-500">
                      {job.city}, {job.state}
                    </p>
                  </div>
                  {job.is_rush && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
                      RUSH
                    </span>
                  )}
                </div>

                <div className="mt-3 flex items-center gap-4 text-sm text-neutral-500">
                  <div className="flex items-center gap-1">
                    <Timer className="h-4 w-4" />
                    Started{' '}
                    {job.editing_started_at &&
                      new Date(job.editing_started_at).toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                  </div>
                  <div className="flex items-center gap-1">
                    <Image className="h-4 w-4" />
                    {job.sqft?.toLocaleString()} sqft
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <Button asChild className="flex-1">
                    <Link href={`/admin/ops/editor/jobs/${job.id}`}>
                      <Upload className="mr-2 h-4 w-4" />
                      Upload Edits
                    </Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link href={`/admin/ops/jobs/${job.id}`}>
                      View Details
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Awaiting Editing Queue */}
      <div className="p-4">
        <h2 className="mb-3 font-semibold text-neutral-900 flex items-center gap-2">
          <Clock className="h-5 w-5 text-blue-500" />
          Editing Queue ({awaitingJobs.length})
        </h2>
        <div className="space-y-3">
          {awaitingJobs.map((job) => (
            <Link
              key={job.id}
              href={`/admin/ops/editor/jobs/${job.id}`}
              className={`block rounded-lg bg-white p-4 shadow-sm ${
                job.is_rush ? 'border-l-4 border-amber-500' : ''
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-medium text-neutral-900">{job.address}</h3>
                  <p className="text-sm text-neutral-500">
                    {job.city}, {job.state}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {job.is_rush && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
                      RUSH
                    </span>
                  )}
                  <Button size="sm" variant="outline">
                    <Play className="mr-1 h-3 w-3" />
                    Start
                  </Button>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-4 text-sm text-neutral-500">
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  Staged{' '}
                  {job.staged_at &&
                    new Date(job.staged_at).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                </div>
                <div className="flex items-center gap-1">
                  <Image className="h-4 w-4" />
                  {job.sqft?.toLocaleString()} sqft
                </div>
              </div>

              {job.agent && (
                <div className="mt-2 text-sm text-neutral-600">
                  {job.agent.name}
                </div>
              )}
            </Link>
          ))}

          {awaitingJobs.length === 0 && (
            <div className="rounded-lg bg-white p-8 text-center">
              <Palette className="mx-auto h-12 w-12 text-neutral-300" />
              <p className="mt-4 text-neutral-600">No jobs awaiting editing</p>
              <p className="mt-1 text-sm text-neutral-500">
                New jobs will appear here when photographers upload their photos.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Recently Completed */}
      {completedJobs.length > 0 && (
        <div className="p-4">
          <h2 className="mb-3 font-semibold text-neutral-900 flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Recently Completed
          </h2>
          <div className="space-y-2">
            {completedJobs.map((job) => (
              <div
                key={job.id}
                className="flex items-center gap-3 rounded-lg bg-green-50 p-3"
              >
                <CheckCircle className="h-5 w-5 flex-shrink-0 text-green-500" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-neutral-900 truncate">{job.address}</p>
                  <p className="text-xs text-neutral-500">
                    Completed{' '}
                    {job.editing_completed_at &&
                      new Date(job.editing_completed_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    job.ops_status === 'delivered'
                      ? 'bg-green-100 text-green-700'
                      : job.ops_status === 'in_qc'
                      ? 'bg-pink-100 text-pink-700'
                      : 'bg-cyan-100 text-cyan-700'
                  }`}
                >
                  {job.ops_status === 'delivered'
                    ? 'Delivered'
                    : job.ops_status === 'in_qc'
                    ? 'In QC'
                    : 'Ready for QC'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
