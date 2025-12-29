import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { format, startOfDay, endOfDay } from 'date-fns'
import {
  MapPin,
  Clock,
  Camera,
  Navigation,
  CheckCircle,
  AlertTriangle,
  Phone,
  ChevronRight,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { PhotographerCheckIn } from '@/components/team/PhotographerCheckIn'
import { DailyRouteMap } from '@/components/team/DailyRouteMap'

export default async function PhotographerDashboard() {
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
    .select('id, name')
    .eq('email', user.email!)
    .single()

  if (!staff) {
    redirect('/staff-login')
  }

  const today = new Date()
  const todayStart = startOfDay(today).toISOString()
  const todayEnd = endOfDay(today).toISOString()

  // Get today's assignments
  const { data: assignments } = await supabase
    .from('photographer_assignments')
    .select(`
      id,
      status,
      scheduled_time,
      notes,
      listing:listings(
        id,
        address,
        city,
        state,
        zip,
        lat,
        lng,
        sqft,
        ops_status,
        agent:agents(name, phone)
      )
    `)
    .eq('photographer_id', staff.id)
    .gte('scheduled_time', todayStart)
    .lte('scheduled_time', todayEnd)
    .order('scheduled_time', { ascending: true })

  // Get stats for the week
  const weekStart = new Date()
  weekStart.setDate(weekStart.getDate() - weekStart.getDay())

  const { count: weekCompletedCount } = await supabase
    .from('photographer_assignments')
    .select('id', { count: 'exact', head: true })
    .eq('photographer_id', staff.id)
    .eq('status', 'completed')
    .gte('scheduled_time', weekStart.toISOString())

  const { count: weekTotalCount } = await supabase
    .from('photographer_assignments')
    .select('id', { count: 'exact', head: true })
    .eq('photographer_id', staff.id)
    .gte('scheduled_time', weekStart.toISOString())

  // Transform assignments for display
  const todaysJobs = assignments?.map((a) => {
    const listing = a.listing as {
      id: string
      address: string
      city: string | null
      state: string | null
      zip: string | null
      lat: number | null
      lng: number | null
      sqft: number | null
      ops_status: string | null
      agent: { name: string; phone: string | null } | null
    } | null

    return {
      id: a.id,
      listingId: listing?.id,
      address: listing?.address || 'Unknown Address',
      city: listing?.city || '',
      state: listing?.state || '',
      zip: listing?.zip || '',
      lat: listing?.lat,
      lng: listing?.lng,
      sqft: listing?.sqft,
      status: a.status,
      scheduledTime: a.scheduled_time,
      agentName: listing?.agent?.name,
      agentPhone: listing?.agent?.phone,
      notes: a.notes,
    }
  }) || []

  const pendingJobs = todaysJobs.filter(j => j.status === 'assigned' || j.status === 'en_route')
  const completedJobs = todaysJobs.filter(j => j.status === 'completed')
  const currentJob = todaysJobs.find(j => j.status === 'in_progress')

  return (
    <div className="space-y-6 pb-20 lg:pb-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">
          Good {getTimeOfDay()}, {staff.name.split(' ')[0]}!
        </h1>
        <p className="text-neutral-600 mt-1">
          {format(today, 'EEEE, MMMM d, yyyy')}
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-3xl font-bold text-blue-600">{todaysJobs.length}</p>
            <p className="text-xs text-neutral-500 mt-1">Today&apos;s Jobs</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-3xl font-bold text-green-600">{completedJobs.length}</p>
            <p className="text-xs text-neutral-500 mt-1">Completed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-3xl font-bold text-amber-600">{pendingJobs.length}</p>
            <p className="text-xs text-neutral-500 mt-1">Remaining</p>
          </CardContent>
        </Card>
      </div>

      {/* Current Job (if any) */}
      {currentJob && (
        <Card className="border-2 border-blue-500 bg-blue-50">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Camera className="h-5 w-5 text-blue-600" />
                Current Job
              </CardTitle>
              <Badge className="bg-blue-600">In Progress</Badge>
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

              {currentJob.agentName && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-neutral-500">Agent:</span>
                  <span className="font-medium">{currentJob.agentName}</span>
                  {currentJob.agentPhone && (
                    <a href={`tel:${currentJob.agentPhone}`} className="text-blue-600">
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

              <PhotographerCheckIn
                assignmentId={currentJob.id}
                type="checkout"
                listingId={currentJob.listingId || ''}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Today's Route Map */}
      {todaysJobs.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Navigation className="h-5 w-5 text-neutral-500" />
              Today&apos;s Route
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <DailyRouteMap
              jobs={todaysJobs.map(j => ({
                id: j.id,
                address: j.address,
                lat: j.lat || 0,
                lng: j.lng || 0,
                status: j.status,
                scheduledTime: j.scheduledTime,
              }))}
            />
          </CardContent>
        </Card>
      )}

      {/* Job List */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-neutral-900">Today&apos;s Schedule</h2>

        {todaysJobs.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-3" />
              <p className="text-neutral-600">No jobs scheduled for today</p>
              <p className="text-sm text-neutral-500 mt-1">Enjoy your day off!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {todaysJobs.map((job) => (
              <Link
                key={job.id}
                href={`/team/photographer/job/${job.id}`}
                className="block"
              >
                <Card className={`hover:shadow-md transition-shadow ${
                  job.status === 'completed' ? 'opacity-60' : ''
                }`}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      {/* Time */}
                      <div className="text-center min-w-[60px]">
                        <p className="text-lg font-bold text-neutral-900">
                          {job.scheduledTime ? format(new Date(job.scheduledTime), 'h:mm') : '--'}
                        </p>
                        <p className="text-xs text-neutral-500">
                          {job.scheduledTime ? format(new Date(job.scheduledTime), 'a') : ''}
                        </p>
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-medium text-neutral-900 truncate">
                              {job.address}
                            </p>
                            <p className="text-sm text-neutral-500">
                              {job.city}, {job.state}
                            </p>
                          </div>
                          <StatusBadge status={job.status} />
                        </div>

                        {job.sqft && (
                          <p className="text-xs text-neutral-400 mt-1">
                            {job.sqft.toLocaleString()} sq ft
                          </p>
                        )}

                        {job.notes && (
                          <div className="mt-2 flex items-start gap-1.5 text-xs text-amber-600 bg-amber-50 p-2 rounded">
                            <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                            <span>{job.notes}</span>
                          </div>
                        )}
                      </div>

                      <ChevronRight className="h-5 w-5 text-neutral-400 flex-shrink-0" />
                    </div>

                    {/* Quick Actions */}
                    {job.status === 'assigned' && job.lat && job.lng && (
                      <div className="mt-3 pt-3 border-t border-neutral-100 flex gap-2">
                        <a
                          href={`https://maps.google.com/?daddr=${job.lat},${job.lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 flex items-center justify-center gap-2 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MapPin className="h-4 w-4" />
                          Navigate
                        </a>
                        <PhotographerCheckIn
                          assignmentId={job.id}
                          type="checkin"
                          listingId={job.listingId || ''}
                          compact
                        />
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
              <p className="text-sm text-neutral-500">Jobs Completed</p>
              <p className="text-2xl font-bold text-neutral-900">
                {weekCompletedCount || 0} / {weekTotalCount || 0}
              </p>
            </div>
            <div className="w-32 h-2 bg-neutral-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full transition-all"
                style={{
                  width: `${weekTotalCount ? ((weekCompletedCount || 0) / weekTotalCount) * 100 : 0}%`
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    assigned: { label: 'Pending', className: 'bg-neutral-100 text-neutral-700' },
    en_route: { label: 'En Route', className: 'bg-blue-100 text-blue-700' },
    in_progress: { label: 'In Progress', className: 'bg-amber-100 text-amber-700' },
    completed: { label: 'Done', className: 'bg-green-100 text-green-700' },
    cancelled: { label: 'Cancelled', className: 'bg-red-100 text-red-700' },
  }

  const { label, className } = config[status] || config.assigned

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
