import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { format } from 'date-fns'
import {
  Film,
  Clock,
  CheckCircle,
  AlertTriangle,
  ChevronRight,
  Timer,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

/**
 * Video Edit Queue
 *
 * Displays videos awaiting editing/processing.
 */
export default async function VideoQueuePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/staff-login')
  }

  // Get staff member
  const { data: staff } = await supabase
    .from('staff')
    .select('id, name, role')
    .eq('email', user.email!)
    .single()

  if (!staff || (staff.role !== 'videographer' && staff.role !== 'admin')) {
    redirect('/staff-login')
  }

  // Get listings that need video editing
  // Status: processing or ready_for_qc (for video jobs)
  const videoServiceKeys = ['listingVideo', 'lifestyleVid', 'dayToNight', 'signatureVid', 'render3d', 'lp2v30', 'lp2v60']

  const { data: pendingVideos } = await supabase
    .from('listings')
    .select(`
      id,
      address,
      city,
      state,
      ops_status,
      scheduled_at,
      is_rush,
      agent:agents(name),
      order:orders(
        services,
        special_instructions
      )
    `)
    .in('ops_status', ['processing', 'ready_for_qc', 'staged'])
    .order('scheduled_at', { ascending: true })

  // Filter to video jobs only
  const videoJobs = (pendingVideos || []).filter((job) => {
    const order = Array.isArray(job.order) ? job.order[0] : job.order
    const orderServices = (order?.services || []) as Array<{ key?: string; id?: string }>
    const serviceKeys = orderServices.map((s) => s.key || s.id || '').filter(Boolean)
    return serviceKeys.some((s) => videoServiceKeys.includes(s))
  }).map((job) => {
    const order = Array.isArray(job.order) ? job.order[0] : job.order
    const agent = Array.isArray(job.agent) ? job.agent[0] : job.agent
    const orderServices = (order?.services || []) as Array<{ key?: string; id?: string }>
    const serviceKeys = orderServices.map((s) => s.key || s.id || '').filter(Boolean)

    return {
      id: job.id,
      address: job.address || 'Unknown',
      city: job.city || '',
      state: job.state || '',
      status: job.ops_status,
      scheduledAt: job.scheduled_at,
      isRush: job.is_rush,
      agentName: agent?.name,
      notes: order?.special_instructions,
      videoTypes: serviceKeys.filter((s) => videoServiceKeys.includes(s)),
    }
  })

  const rushJobs = videoJobs.filter((j) => j.isRush)
  const regularJobs = videoJobs.filter((j) => !j.isRush)

  return (
    <div className="space-y-6 pb-20 lg:pb-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Video Edit Queue</h1>
        <p className="mt-1 text-neutral-600">
          {videoJobs.length} video{videoJobs.length !== 1 ? 's' : ''} awaiting edit
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-3xl font-bold text-purple-600">{videoJobs.length}</p>
            <p className="mt-1 text-xs text-neutral-500">In Queue</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-3xl font-bold text-red-600">{rushJobs.length}</p>
            <p className="mt-1 text-xs text-neutral-500">Rush Orders</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-3xl font-bold text-blue-600">
              {videoJobs.filter((j) => j.status === 'ready_for_qc').length}
            </p>
            <p className="mt-1 text-xs text-neutral-500">Ready for QC</p>
          </CardContent>
        </Card>
      </div>

      {/* Rush Jobs */}
      {rushJobs.length > 0 && (
        <div className="space-y-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-red-600">
            <Timer className="h-5 w-5" />
            Rush Orders ({rushJobs.length})
          </h2>
          {rushJobs.map((job) => (
            <VideoJobCard key={job.id} job={job} />
          ))}
        </div>
      )}

      {/* Regular Queue */}
      <div className="space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-neutral-900">
          <Film className="h-5 w-5" />
          Queue ({regularJobs.length})
        </h2>

        {regularJobs.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <CheckCircle className="mx-auto mb-3 h-12 w-12 text-green-500" />
              <p className="text-neutral-600">No videos in queue</p>
              <p className="mt-1 text-sm text-neutral-500">All caught up!</p>
            </CardContent>
          </Card>
        ) : (
          regularJobs.map((job) => (
            <VideoJobCard key={job.id} job={job} />
          ))
        )}
      </div>
    </div>
  )
}

interface VideoJob {
  id: string
  address: string
  city: string
  state: string
  status: string | null
  scheduledAt: string | null
  isRush: boolean | null
  agentName: string | undefined | null
  notes: string | undefined | null
  videoTypes: string[]
}

function VideoJobCard({ job }: { job: VideoJob }) {
  return (
    <Link href={`/team/videographer/job/${job.id}`} className="block">
      <Card className={`transition-shadow hover:shadow-md ${job.isRush ? 'border-red-200 bg-red-50' : ''}`}>
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate font-medium text-neutral-900">{job.address}</p>
                {job.isRush && (
                  <Badge variant="destructive" className="text-xs">RUSH</Badge>
                )}
              </div>
              <p className="text-sm text-neutral-500">
                {job.city}, {job.state}
                {job.agentName && ` • ${job.agentName}`}
              </p>

              <div className="mt-2 flex flex-wrap gap-1">
                {job.videoTypes.map((type) => (
                  <Badge key={type} variant="secondary" className="text-xs">
                    {getVideoTypeName(type)}
                  </Badge>
                ))}
              </div>

              {job.notes && (
                <div className="mt-2 flex items-start gap-1.5 rounded bg-amber-50 p-2 text-xs text-amber-600">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                  <span>{job.notes}</span>
                </div>
              )}
            </div>

            <div className="flex flex-col items-end gap-2">
              <StatusBadge status={job.status || 'processing'} />
              {job.scheduledAt && (
                <p className="text-xs text-neutral-500">
                  Shot {format(new Date(job.scheduledAt), 'MMM d')}
                </p>
              )}
            </div>

            <ChevronRight className="h-5 w-5 flex-shrink-0 text-neutral-400" />
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    staged: { label: 'Staged', className: 'bg-neutral-100 text-neutral-700' },
    processing: { label: 'Editing', className: 'bg-purple-100 text-purple-700' },
    ready_for_qc: { label: 'Ready for QC', className: 'bg-blue-100 text-blue-700' },
  }

  const { label, className } = config[status] || config.processing

  return (
    <Badge variant="secondary" className={className}>
      {label}
    </Badge>
  )
}

function getVideoTypeName(key: string): string {
  const names: Record<string, string> = {
    listingVideo: 'Listing Video',
    lifestyleVid: 'Lifestyle',
    dayToNight: 'Day-to-Night',
    signatureVid: 'Signature',
    render3d: '3D Render',
    lp2v30: 'Photo→Video 30s',
    lp2v60: 'Photo→Video 60s',
  }
  return names[key] || key
}
