import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Clock, CheckCircle, Camera, AlertTriangle, ArrowRight, Palette, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { RealtimeRefresh } from '@/components/admin/RealtimeRefresh'
import { OpsMapSection } from '@/components/admin/ops/OpsMapSection'
import { OpsKanbanBoard } from '@/components/admin/ops/OpsKanbanBoard'

const statusColumns = [
  { key: 'scheduled', label: 'Scheduled', color: 'bg-blue-500' },
  { key: 'in_progress', label: 'In Progress', color: 'bg-yellow-500' },
  { key: 'staged', label: 'Staged', color: 'bg-purple-500' },
  { key: 'awaiting_editing', label: 'Awaiting Edit', color: 'bg-indigo-500' },
  { key: 'in_editing', label: 'In Editing', color: 'bg-violet-500' },
  { key: 'ready_for_qc', label: 'Ready for QC', color: 'bg-cyan-500' },
  { key: 'in_qc', label: 'In QC', color: 'bg-pink-500' },
  { key: 'delivered', label: 'Delivered', color: 'bg-green-500' },
]

export default async function OpsPage() {
  const supabase = await createClient()

  // Get listings by status
  const { data: listingsData } = await supabase
    .from('listings')
    .select('*')
    .not('ops_status', 'eq', 'pending')
    .order('scheduled_at', { ascending: true })

  // Get agents for listings
  const agentIds = [...new Set(listingsData?.map((l) => l.agent_id).filter((id): id is string => id !== null) || [])]
  const { data: agents } = agentIds.length > 0
    ? await supabase.from('agents').select('id, name').in('id', agentIds)
    : { data: [] }

  // Combine data
  const listings = listingsData?.map((listing) => ({
    ...listing,
    agent: agents?.find((a) => a.id === listing.agent_id) || null,
  }))

  // Group by status
  const jobsByStatus = statusColumns.reduce(
    (acc, col) => {
      acc[col.key] = listings?.filter((l) => l.ops_status === col.key) || []
      return acc
    },
    {} as Record<string, typeof listings>
  )

  const rushJobs = listings?.filter((l) => l.is_rush) || []

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">Operations Dashboard</h1>
            <p className="mt-1 text-neutral-600">
              Track jobs from scheduling to delivery.
            </p>
          </div>
          <RealtimeRefresh />
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link href="/admin/ops/assign">
              <UserPlus className="mr-2 h-4 w-4" />
              Assign Jobs
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/admin/ops/photographer">
              <Camera className="mr-2 h-4 w-4" />
              Photographer
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/admin/ops/editor">
              <Palette className="mr-2 h-4 w-4" />
              Editor
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/admin/ops/qc">
              <CheckCircle className="mr-2 h-4 w-4" />
              QC
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-5">
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-500" />
            <span className="text-sm text-neutral-600">Scheduled</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-neutral-900">
            {jobsByStatus.scheduled?.filter((j) => {
              const today = new Date().toDateString()
              return j.scheduled_at && new Date(j.scheduled_at).toDateString() === today
            }).length || 0}
          </p>
        </div>

        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <div className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-yellow-500" />
            <span className="text-sm text-neutral-600">Shooting</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-neutral-900">
            {jobsByStatus.in_progress?.length || 0}
          </p>
        </div>

        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <div className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-violet-500" />
            <span className="text-sm text-neutral-600">Editing</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-neutral-900">
            {(jobsByStatus.awaiting_editing?.length || 0) + (jobsByStatus.in_editing?.length || 0)}
          </p>
        </div>

        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-cyan-500" />
            <span className="text-sm text-neutral-600">In QC</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-neutral-900">
            {(jobsByStatus.ready_for_qc?.length || 0) + (jobsByStatus.in_qc?.length || 0)}
          </p>
        </div>

        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <span className="text-sm text-amber-700">Rush</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-amber-800">
            {rushJobs.length}
          </p>
        </div>
      </div>

      {/* Map View Toggle */}
      <OpsMapSection listings={listings || []} />

      {/* Kanban Board with Bulk Selection */}
      <OpsKanbanBoard
        jobsByStatus={jobsByStatus as Record<string, Array<{
          id: string
          address: string
          city: string | null
          state: string | null
          ops_status: string | null
          scheduled_at: string | null
          is_rush: boolean | null
          agent?: { id: string; name: string } | null
        }>>}
        statusColumns={statusColumns}
      />

      {/* Rush Jobs Alert */}
      {rushJobs.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <h2 className="font-semibold text-amber-800">Rush Jobs Pending</h2>
          </div>
          <div className="mt-3 space-y-2">
            {rushJobs.map((job) => (
              <Link
                key={job.id}
                href={`/admin/ops/jobs/${job.id}`}
                className="flex items-center justify-between rounded-lg bg-white p-3 hover:bg-amber-100"
              >
                <div>
                  <p className="font-medium text-neutral-900">{job.address}</p>
                  <p className="text-sm text-neutral-600">
                    {job.ops_status?.replace('_', ' ')} - {job.agent?.name}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-neutral-400" />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
