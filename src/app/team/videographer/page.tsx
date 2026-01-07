import { redirect } from 'next/navigation'
import { format, startOfDay, endOfDay } from 'date-fns'
import {
  MapPin,
  Clock,
  Video,
  Navigation,
  CheckCircle,
  AlertTriangle,
  Phone,
  ChevronRight,
  Film,
  Play,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { getStaffAccess } from '@/lib/auth/server-access'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Videographer Portal Dashboard
 *
 * Displays today's video jobs, route map, and weekly stats.
 * Mirrors the photographer portal but focused on video services.
 */
export default async function VideographerDashboard() {
  // Check authentication via Clerk (or Supabase fallback)
  const staff = await getStaffAccess()

  if (!staff) {
    redirect('/sign-in/staff')
  }

  // Verify videographer or admin role
  if (staff.role !== 'videographer' && staff.role !== 'admin') {
    redirect('/sign-in/staff')
  }

  const supabase = createAdminClient()

  const today = new Date()
  const todayStart = startOfDay(today).toISOString()
  const todayEnd = endOfDay(today).toISOString()

  // Get today's video assignments
  // Note: Video jobs are tracked through listings with video services
  const { data: videoJobs } = await supabase
    .from('listings')
    .select(`
      id,
      address,
      city,
      state,
      zip,
      lat,
      lng,
      sqft,
      ops_status,
      scheduled_at,
      is_rush,
      agent:agents(name, phone),
      order:orders(
        services,
        special_instructions
      )
    `)
    .gte('scheduled_at', todayStart)
    .lte('scheduled_at', todayEnd)
    .or('ops_status.eq.scheduled,ops_status.eq.in_progress')
    .order('scheduled_at', { ascending: true })

  // Filter to only video jobs (jobs with video services)
  const videoServiceKeys = ['listingVideo', 'lifestyleVid', 'dayToNight', 'signatureVid', 'render3d', 'lp2v30', 'lp2v60']
  const todaysVideoJobs = (videoJobs || []).filter((job) => {
    const order = Array.isArray(job.order) ? job.order[0] : job.order
    const orderServices = (order?.services || []) as Array<{ key?: string; id?: string }>
    const serviceKeys = orderServices.map((s) => s.key || s.id || '').filter(Boolean)
    return serviceKeys.some((s) => videoServiceKeys.includes(s))
  }).map((job) => {
    const order = Array.isArray(job.order) ? job.order[0] : job.order
    const agent = Array.isArray(job.agent) ? job.agent[0] : job.agent

    // Determine video types for this job
    const orderServices = (order?.services || []) as Array<{ key?: string; id?: string }>
    const serviceKeys = orderServices.map((s) => s.key || s.id || '').filter(Boolean)
    const videoTypes = serviceKeys.filter((s) => videoServiceKeys.includes(s))

    return {
      id: job.id,
      address: job.address || 'Unknown Address',
      city: job.city || '',
      state: job.state || '',
      zip: job.zip || '',
      lat: job.lat,
      lng: job.lng,
      sqft: job.sqft,
      status: job.ops_status || 'scheduled',
      scheduledTime: job.scheduled_at,
      agentName: agent?.name,
      agentPhone: agent?.phone,
      notes: order?.special_instructions,
      isRush: job.is_rush === true,
      videoTypes,
    }
  })

  // Get stats for the week
  const weekStart = new Date()
  weekStart.setDate(weekStart.getDate() - weekStart.getDay())

  // For now, count all delivered listings with video services this week
  const { count: weekCompletedCount } = await supabase
    .from('listings')
    .select('id', { count: 'exact', head: true })
    .eq('ops_status', 'delivered')
    .gte('delivered_at', weekStart.toISOString())

  const { count: weekTotalCount } = await supabase
    .from('listings')
    .select('id', { count: 'exact', head: true })
    .gte('scheduled_at', weekStart.toISOString())

  const pendingJobs = todaysVideoJobs.filter((j) => j.status === 'scheduled')
  const completedJobs = todaysVideoJobs.filter((j) => j.status === 'delivered')
  const currentJob = todaysVideoJobs.find((j) => j.status === 'in_progress')

  return (
    <div className="space-y-6 pb-20 lg:pb-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">
          Good {getTimeOfDay()}, {staff.name.split(' ')[0]}!
        </h1>
        <p className="mt-1 text-neutral-600">
          {format(today, 'EEEE, MMMM d, yyyy')}
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-3xl font-bold text-purple-600">{todaysVideoJobs.length}</p>
            <p className="mt-1 text-xs text-neutral-500">Today&apos;s Videos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-3xl font-bold text-green-600">{completedJobs.length}</p>
            <p className="mt-1 text-xs text-neutral-500">Completed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-3xl font-bold text-amber-600">{pendingJobs.length}</p>
            <p className="mt-1 text-xs text-neutral-500">Remaining</p>
          </CardContent>
        </Card>
      </div>

      {/* Current Job (if any) */}
      {currentJob && (
        <Card className="border-2 border-purple-500 bg-purple-50">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Video className="h-5 w-5 text-purple-600" />
                Current Video Shoot
              </CardTitle>
              <Badge className="bg-purple-600">In Progress</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <p className="font-semibold text-neutral-900">{currentJob.address}</p>
                <p className="text-sm text-neutral-600">
                  {currentJob.city}, {currentJob.state} {currentJob.zip}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {currentJob.videoTypes.map((type) => (
                  <Badge key={type} variant="outline" className="border-purple-300 text-purple-700">
                    <Film className="mr-1 h-3 w-3" />
                    {getVideoTypeName(type)}
                  </Badge>
                ))}
              </div>

              {currentJob.agentName && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-neutral-500">Agent:</span>
                  <span className="font-medium">{currentJob.agentName}</span>
                  {currentJob.agentPhone && (
                    <a href={`tel:${currentJob.agentPhone}`} className="text-purple-600">
                      <Phone className="h-4 w-4" />
                    </a>
                  )}
                </div>
              )}

              {currentJob.sqft && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-neutral-500">Size:</span>
                  <span className="font-medium">{currentJob.sqft.toLocaleString()} sq ft</span>
                </div>
              )}

              <Link
                href={`/team/videographer/job/${currentJob.id}`}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-purple-600 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-700"
              >
                <Play className="h-4 w-4" />
                View Job Details
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Job List */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-neutral-900">Today&apos;s Video Schedule</h2>

        {todaysVideoJobs.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <CheckCircle className="mx-auto mb-3 h-12 w-12 text-green-500" />
              <p className="text-neutral-600">No video shoots scheduled for today</p>
              <p className="mt-1 text-sm text-neutral-500">Time for editing or a day off!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {todaysVideoJobs.map((job) => (
              <Link
                key={job.id}
                href={`/team/videographer/job/${job.id}`}
                className="block"
              >
                <Card className={`transition-shadow hover:shadow-md ${
                  job.status === 'delivered' ? 'opacity-60' : ''
                }`}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      {/* Time */}
                      <div className="min-w-[60px] text-center">
                        <p className="text-lg font-bold text-neutral-900">
                          {job.scheduledTime ? format(new Date(job.scheduledTime), 'h:mm') : '--'}
                        </p>
                        <p className="text-xs text-neutral-500">
                          {job.scheduledTime ? format(new Date(job.scheduledTime), 'a') : ''}
                        </p>
                      </div>

                      {/* Details */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="truncate font-medium text-neutral-900">
                                {job.address}
                              </p>
                              {job.isRush && (
                                <Badge variant="destructive" className="text-xs">RUSH</Badge>
                              )}
                            </div>
                            <p className="text-sm text-neutral-500">
                              {job.city}, {job.state}
                            </p>
                          </div>
                          <StatusBadge status={job.status} />
                        </div>

                        <div className="mt-2 flex flex-wrap gap-1">
                          {job.videoTypes.map((type) => (
                            <Badge
                              key={type}
                              variant="secondary"
                              className="text-xs"
                            >
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

                      <ChevronRight className="h-5 w-5 flex-shrink-0 text-neutral-400" />
                    </div>

                    {/* Quick Actions */}
                    {job.status === 'scheduled' && job.lat && job.lng && (
                      <div className="mt-3 flex gap-2 border-t border-neutral-100 pt-3">
                        <a
                          href={`https://maps.google.com/?daddr=${job.lat},${job.lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-purple-50 py-2 text-sm font-medium text-purple-600 transition-colors hover:bg-purple-100"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MapPin className="h-4 w-4" />
                          Navigate
                        </a>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Week Stats */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">This Week</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-500">Videos Completed</p>
              <p className="text-2xl font-bold text-neutral-900">
                {weekCompletedCount || 0} / {weekTotalCount || 0}
              </p>
            </div>
            <div className="h-2 w-32 overflow-hidden rounded-full bg-neutral-200">
              <div
                className="h-full rounded-full bg-purple-500 transition-all"
                style={{
                  width: `${weekTotalCount ? ((weekCompletedCount || 0) / weekTotalCount) * 100 : 0}%`
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Links */}
      <div className="grid grid-cols-2 gap-4">
        <Link href="/team/videographer/queue">
          <Card className="transition-shadow hover:shadow-md">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
                <Film className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="font-medium text-neutral-900">Edit Queue</p>
                <p className="text-xs text-neutral-500">Videos awaiting edit</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/team/videographer/schedule">
          <Card className="transition-shadow hover:shadow-md">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-neutral-900">Schedule</p>
                <p className="text-xs text-neutral-500">Upcoming shoots</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    scheduled: { label: 'Pending', className: 'bg-neutral-100 text-neutral-700' },
    en_route: { label: 'En Route', className: 'bg-blue-100 text-blue-700' },
    in_progress: { label: 'Shooting', className: 'bg-amber-100 text-amber-700' },
    processing: { label: 'Editing', className: 'bg-purple-100 text-purple-700' },
    delivered: { label: 'Done', className: 'bg-green-100 text-green-700' },
    cancelled: { label: 'Cancelled', className: 'bg-red-100 text-red-700' },
  }

  const { label, className } = config[status] || config.scheduled

  return (
    <Badge variant="secondary" className={className}>
      {label}
    </Badge>
  )
}

function getTimeOfDay(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'morning'
  if (hour < 17) return 'afternoon'
  return 'evening'
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
