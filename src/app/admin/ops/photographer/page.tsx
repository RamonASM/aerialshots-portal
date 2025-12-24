import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { MapPin, Clock, Camera, CheckCircle, Navigation } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { RealtimeRefresh } from '@/components/admin/RealtimeRefresh'

export default async function PhotographerPage() {
  const supabase = await createClient()

  // Get today's jobs for the current photographer
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const { data: jobsData } = await supabase
    .from('listings')
    .select('*')
    .gte('scheduled_at', today.toISOString())
    .lt('scheduled_at', tomorrow.toISOString())
    .in('ops_status', ['scheduled', 'in_progress', 'staged'])
    .order('scheduled_at', { ascending: true })

  // Get agents for jobs
  const agentIds = [...new Set(jobsData?.map((j) => j.agent_id).filter((id): id is string => id !== null) || [])]
  const { data: agents } = agentIds.length > 0
    ? await supabase.from('agents').select('id, name, phone').in('id', agentIds)
    : { data: [] }

  // Combine data
  const jobs = jobsData?.map((job) => ({
    ...job,
    agent: agents?.find((a) => a.id === job.agent_id) || null,
  }))

  const completedToday = jobs?.filter((j) => j.ops_status === 'staged').length || 0
  const inProgressJob = jobs?.find((j) => j.ops_status === 'in_progress')

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <header className="border-b border-neutral-200 bg-white px-4 py-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-neutral-900">Today's Shoots</h1>
            <p className="text-sm text-neutral-600">
              {today.toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>
          <RealtimeRefresh statuses={['scheduled', 'in_progress']} />
        </div>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 p-4">
        <div className="rounded-lg bg-white p-3 text-center">
          <p className="text-2xl font-bold text-neutral-900">{jobs?.length || 0}</p>
          <p className="text-xs text-neutral-500">Scheduled</p>
        </div>
        <div className="rounded-lg bg-white p-3 text-center">
          <p className="text-2xl font-bold text-yellow-600">
            {inProgressJob ? 1 : 0}
          </p>
          <p className="text-xs text-neutral-500">In Progress</p>
        </div>
        <div className="rounded-lg bg-white p-3 text-center">
          <p className="text-2xl font-bold text-green-600">{completedToday}</p>
          <p className="text-xs text-neutral-500">Completed</p>
        </div>
      </div>

      {/* Current Job */}
      {inProgressJob && (
        <div className="mx-4 mb-4 rounded-lg border-2 border-yellow-400 bg-yellow-50 p-4">
          <div className="flex items-center gap-2 text-yellow-700">
            <Camera className="h-5 w-5" />
            <span className="font-medium">Currently Shooting</span>
          </div>
          <h2 className="mt-2 text-lg font-bold text-neutral-900">
            {inProgressJob.address}
          </h2>
          <p className="text-sm text-neutral-600">
            {inProgressJob.city}, {inProgressJob.state}
          </p>
          <div className="mt-4 flex gap-2">
            <Button asChild className="flex-1">
              <Link href={`/admin/ops/photographer/jobs/${inProgressJob.id}/upload`}>
                Upload Photos
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
                  `${inProgressJob.address}, ${inProgressJob.city}, ${inProgressJob.state}`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Navigation className="h-4 w-4" />
              </a>
            </Button>
          </div>
        </div>
      )}

      {/* Job List */}
      <div className="p-4">
        <h2 className="mb-3 font-semibold text-neutral-900">Upcoming</h2>
        <div className="space-y-3">
          {jobs
            ?.filter((j) => j.ops_status === 'scheduled')
            .map((job) => (
              <Link
                key={job.id}
                href={`/admin/ops/photographer/jobs/${job.id}`}
                className="block rounded-lg bg-white p-4 shadow-sm"
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

                <div className="mt-3 flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1 text-neutral-500">
                    <Clock className="h-4 w-4" />
                    {job.scheduled_at &&
                      new Date(job.scheduled_at).toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                  </div>
                  <div className="flex items-center gap-1 text-neutral-500">
                    <MapPin className="h-4 w-4" />
                    {job.sqft?.toLocaleString()} sqft
                  </div>
                </div>

                {job.agent && (
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="text-neutral-600">{job.agent.name}</span>
                    {job.agent.phone && (
                      <a
                        href={`tel:${job.agent.phone}`}
                        className="text-[#ff4533]"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {job.agent.phone}
                      </a>
                    )}
                  </div>
                )}
              </Link>
            ))}
        </div>

        {/* Completed */}
        {completedToday > 0 && (
          <div className="mt-6">
            <h2 className="mb-3 font-semibold text-neutral-900">Completed</h2>
            <div className="space-y-3">
              {jobs
                ?.filter((j) => j.ops_status === 'staged')
                .map((job) => (
                  <div
                    key={job.id}
                    className="flex items-center gap-3 rounded-lg bg-green-50 p-4"
                  >
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <div>
                      <p className="font-medium text-neutral-900">{job.address}</p>
                      <p className="text-sm text-neutral-500">Photos uploaded</p>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {jobs?.length === 0 && (
          <div className="rounded-lg bg-white p-8 text-center">
            <Camera className="mx-auto h-12 w-12 text-neutral-300" />
            <p className="mt-4 text-neutral-600">No shoots scheduled for today</p>
          </div>
        )}
      </div>
    </div>
  )
}
