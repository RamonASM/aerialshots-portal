import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { format, addDays, startOfDay, endOfDay } from 'date-fns'
import {
  Calendar,
  Video,
  MapPin,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface SchedulePageProps {
  searchParams: Promise<{ date?: string }>
}

/**
 * Videographer Schedule
 *
 * Weekly view of upcoming video shoots.
 */
export default async function VideoSchedulePage({ searchParams }: SchedulePageProps) {
  const params = await searchParams
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

  // Parse date from URL or use today
  const currentDate = params.date ? new Date(params.date) : new Date()
  const weekStart = startOfDay(currentDate)
  const weekEnd = endOfDay(addDays(weekStart, 6))

  // Get video jobs for the week
  const videoServiceKeys = ['listingVideo', 'lifestyleVid', 'dayToNight', 'signatureVid', 'render3d', 'lp2v30', 'lp2v60']

  const { data: scheduledJobs } = await supabase
    .from('listings')
    .select(`
      id,
      address,
      city,
      state,
      lat,
      lng,
      scheduled_at,
      ops_status,
      is_rush,
      order:orders(services)
    `)
    .gte('scheduled_at', weekStart.toISOString())
    .lte('scheduled_at', weekEnd.toISOString())
    .order('scheduled_at', { ascending: true })

  // Filter to video jobs
  const videoJobs = (scheduledJobs || []).filter((job) => {
    const order = Array.isArray(job.order) ? job.order[0] : job.order
    const orderServices = (order?.services || []) as Array<{ key?: string; id?: string }>
    const serviceKeys = orderServices.map((s) => s.key || s.id || '').filter(Boolean)
    return serviceKeys.some((s) => videoServiceKeys.includes(s))
  }).map((job) => {
    const order = Array.isArray(job.order) ? job.order[0] : job.order
    const orderServices = (order?.services || []) as Array<{ key?: string; id?: string }>
    const serviceKeys = orderServices.map((s) => s.key || s.id || '').filter(Boolean)

    return {
      id: job.id,
      address: job.address || 'Unknown',
      city: job.city || '',
      state: job.state || '',
      lat: job.lat,
      lng: job.lng,
      scheduledAt: job.scheduled_at,
      status: job.ops_status,
      isRush: job.is_rush,
      videoTypes: serviceKeys.filter((s) => videoServiceKeys.includes(s)),
    }
  })

  // Group by day
  const jobsByDay: Record<string, typeof videoJobs> = {}
  for (let i = 0; i < 7; i++) {
    const day = addDays(weekStart, i)
    const dayKey = format(day, 'yyyy-MM-dd')
    jobsByDay[dayKey] = videoJobs.filter((job) =>
      job.scheduledAt && format(new Date(job.scheduledAt), 'yyyy-MM-dd') === dayKey
    )
  }

  const prevWeek = format(addDays(weekStart, -7), 'yyyy-MM-dd')
  const nextWeek = format(addDays(weekStart, 7), 'yyyy-MM-dd')

  return (
    <div className="space-y-6 pb-20 lg:pb-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Video Schedule</h1>
          <p className="mt-1 text-neutral-600">
            {format(weekStart, 'MMMM d')} - {format(addDays(weekStart, 6), 'MMMM d, yyyy')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/team/videographer/schedule?date=${prevWeek}`}>
            <Button variant="outline" size="icon">
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/team/videographer/schedule">
            <Button variant="outline" size="sm">Today</Button>
          </Link>
          <Link href={`/team/videographer/schedule?date=${nextWeek}`}>
            <Button variant="outline" size="icon">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Week Overview */}
      <div className="grid gap-4 lg:grid-cols-7">
        {Array.from({ length: 7 }).map((_, i) => {
          const day = addDays(weekStart, i)
          const dayKey = format(day, 'yyyy-MM-dd')
          const dayJobs = jobsByDay[dayKey] || []
          const isToday = format(new Date(), 'yyyy-MM-dd') === dayKey

          return (
            <Card
              key={dayKey}
              className={`${isToday ? 'border-purple-500 bg-purple-50' : ''}`}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">
                  <span className={isToday ? 'text-purple-600' : 'text-neutral-500'}>
                    {format(day, 'EEE')}
                  </span>
                  <br />
                  <span className={`text-lg ${isToday ? 'text-purple-600' : 'text-neutral-900'}`}>
                    {format(day, 'd')}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {dayJobs.length === 0 ? (
                  <p className="text-center text-xs text-neutral-400">No shoots</p>
                ) : (
                  dayJobs.map((job) => (
                    <Link
                      key={job.id}
                      href={`/team/videographer/job/${job.id}`}
                      className="block"
                    >
                      <div className={`rounded-lg border p-2 transition-colors hover:bg-neutral-50 ${
                        job.isRush ? 'border-red-200 bg-red-50' : 'border-neutral-200'
                      }`}>
                        <p className="truncate text-xs font-medium text-neutral-900">
                          {job.scheduledAt && format(new Date(job.scheduledAt), 'h:mm a')}
                        </p>
                        <p className="truncate text-xs text-neutral-600">{job.address}</p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {job.isRush && (
                            <Badge variant="destructive" className="h-4 px-1 text-[10px]">
                              RUSH
                            </Badge>
                          )}
                          <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                            {job.videoTypes.length} video{job.videoTypes.length !== 1 ? 's' : ''}
                          </Badge>
                        </div>
                      </div>
                    </Link>
                  ))
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Detailed List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            All Shoots This Week
          </CardTitle>
        </CardHeader>
        <CardContent>
          {videoJobs.length === 0 ? (
            <p className="py-4 text-center text-neutral-500">No video shoots scheduled this week</p>
          ) : (
            <div className="space-y-3">
              {videoJobs.map((job) => (
                <Link
                  key={job.id}
                  href={`/team/videographer/job/${job.id}`}
                  className="flex items-center justify-between rounded-lg border border-neutral-200 p-3 transition-colors hover:bg-neutral-50"
                >
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <p className="text-xs text-neutral-500">
                        {job.scheduledAt && format(new Date(job.scheduledAt), 'EEE')}
                      </p>
                      <p className="text-lg font-bold text-neutral-900">
                        {job.scheduledAt && format(new Date(job.scheduledAt), 'd')}
                      </p>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-neutral-900">{job.address}</p>
                        {job.isRush && (
                          <Badge variant="destructive" className="text-xs">RUSH</Badge>
                        )}
                      </div>
                      <p className="text-sm text-neutral-500">
                        {job.scheduledAt && format(new Date(job.scheduledAt), 'h:mm a')} •{' '}
                        {job.city}, {job.state}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {job.videoTypes.map((type) => (
                          <Badge key={type} variant="secondary" className="text-xs">
                            {getVideoTypeName(type)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-neutral-400" />
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
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
