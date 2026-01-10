import { redirect } from 'next/navigation'
import { format, addDays, startOfDay, endOfDay } from 'date-fns'
import {
  Calendar,
  Camera,
  ChevronRight,
  ChevronLeft,
  Zap,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { getStaffAccess, hasRequiredRole } from '@/lib/auth/server-access'
import { createAdminClient } from '@/lib/supabase/admin'

interface SchedulePageProps {
  searchParams: Promise<{ date?: string }>
}

/**
 * Photographer Schedule
 *
 * Weekly view of upcoming photo shoots.
 */
export default async function PhotographerSchedulePage({ searchParams }: SchedulePageProps) {
  const params = await searchParams

  // Check authentication via Clerk
  const staff = await getStaffAccess()

  if (!staff) {
    redirect('/sign-in/staff')
  }

  // Verify photographer or admin role
  if (!hasRequiredRole(staff.role, ['photographer'])) {
    redirect('/sign-in/staff')
  }

  const supabase = createAdminClient()

  // Parse date from URL or use today
  const currentDate = params.date ? new Date(params.date) : new Date()
  const weekStart = startOfDay(currentDate)
  const weekEnd = endOfDay(addDays(weekStart, 6))

  // Get assignments for the week
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: assignments } = await (supabase as any)
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
        sqft,
        is_rush,
        agent:agents(name)
      )
    `)
    .eq('photographer_id', staff.id)
    .gte('scheduled_time', weekStart.toISOString())
    .lte('scheduled_time', weekEnd.toISOString())
    .order('scheduled_time', { ascending: true }) as { data: Array<{
      id: string
      status: string | null
      scheduled_time: string | null
      notes: string | null
      listing: {
        id: string
        address: string
        city: string | null
        state: string | null
        sqft: number | null
        is_rush: boolean | null
        agent: { name: string } | null
      } | null
    }> | null }

  // Transform assignments
  const jobs = (assignments || []).map((a) => {
    const listing = a.listing
    return {
      id: a.id,
      listingId: listing?.id,
      address: listing?.address || 'Unknown Address',
      city: listing?.city || '',
      state: listing?.state || '',
      sqft: listing?.sqft,
      scheduledAt: a.scheduled_time,
      status: a.status,
      isRush: listing?.is_rush || false,
      agentName: listing?.agent?.name,
      notes: a.notes,
    }
  })

  // Group by day
  const jobsByDay: Record<string, typeof jobs> = {}
  for (let i = 0; i < 7; i++) {
    const day = addDays(weekStart, i)
    const dayKey = format(day, 'yyyy-MM-dd')
    jobsByDay[dayKey] = jobs.filter((job) =>
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
          <h1 className="text-2xl font-bold text-white">Photo Schedule</h1>
          <p className="mt-1 text-zinc-400">
            {format(weekStart, 'MMMM d')} - {format(addDays(weekStart, 6), 'MMMM d, yyyy')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/team/photographer/schedule?date=${prevWeek}`}>
            <Button variant="outline" size="icon" className="border-white/10 bg-white/5 text-white hover:bg-white/10">
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/team/photographer/schedule">
            <Button variant="outline" size="sm" className="border-white/10 bg-white/5 text-white hover:bg-white/10">
              Today
            </Button>
          </Link>
          <Link href={`/team/photographer/schedule?date=${nextWeek}`}>
            <Button variant="outline" size="icon" className="border-white/10 bg-white/5 text-white hover:bg-white/10">
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
              className={`border-white/[0.08] bg-[#1c1c1e] ${isToday ? 'border-blue-500/50 ring-1 ring-blue-500/30' : ''}`}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">
                  <span className={isToday ? 'text-blue-400' : 'text-zinc-500'}>
                    {format(day, 'EEE')}
                  </span>
                  <br />
                  <span className={`text-lg ${isToday ? 'text-blue-400' : 'text-white'}`}>
                    {format(day, 'd')}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {dayJobs.length === 0 ? (
                  <p className="text-center text-xs text-zinc-500">No shoots</p>
                ) : (
                  dayJobs.map((job) => (
                    <Link
                      key={job.id}
                      href={`/team/photographer/job/${job.id}`}
                      className="block"
                    >
                      <div className={`rounded-lg border p-2 transition-colors hover:bg-white/5 ${
                        job.isRush ? 'border-red-500/30 bg-red-500/10' : 'border-white/[0.08] bg-black/20'
                      }`}>
                        <p className="truncate text-xs font-medium text-white">
                          {job.scheduledAt && format(new Date(job.scheduledAt), 'h:mm a')}
                        </p>
                        <p className="truncate text-xs text-zinc-400">{job.address}</p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {job.isRush && (
                            <Badge variant="destructive" className="h-4 px-1 text-[10px]">
                              <Zap className="mr-0.5 h-2.5 w-2.5" />
                              RUSH
                            </Badge>
                          )}
                          {job.status === 'completed' && (
                            <Badge className="h-4 px-1 text-[10px] bg-green-500/20 text-green-400">
                              Done
                            </Badge>
                          )}
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
      <Card className="border-white/[0.08] bg-[#1c1c1e]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Calendar className="h-5 w-5" />
            All Shoots This Week
          </CardTitle>
        </CardHeader>
        <CardContent>
          {jobs.length === 0 ? (
            <p className="py-4 text-center text-zinc-500">No photo shoots scheduled this week</p>
          ) : (
            <div className="space-y-3">
              {jobs.map((job) => (
                <Link
                  key={job.id}
                  href={`/team/photographer/job/${job.id}`}
                  className="flex items-center justify-between rounded-lg border border-white/[0.08] bg-black/20 p-3 transition-colors hover:bg-white/5"
                >
                  <div className="flex items-center gap-4">
                    <div className="text-center min-w-[40px]">
                      <p className="text-xs text-zinc-500">
                        {job.scheduledAt && format(new Date(job.scheduledAt), 'EEE')}
                      </p>
                      <p className="text-lg font-bold text-white">
                        {job.scheduledAt && format(new Date(job.scheduledAt), 'd')}
                      </p>
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                      <Camera className="h-5 w-5 text-blue-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-white">{job.address}</p>
                        {job.isRush && (
                          <Badge variant="destructive" className="text-xs">
                            <Zap className="mr-0.5 h-3 w-3" />
                            RUSH
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-zinc-400">
                        {job.scheduledAt && format(new Date(job.scheduledAt), 'h:mm a')} •{' '}
                        {job.city}, {job.state}
                        {job.sqft && ` • ${job.sqft.toLocaleString()} sqft`}
                      </p>
                      {job.agentName && (
                        <p className="text-xs text-zinc-500">Agent: {job.agentName}</p>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-zinc-500" />
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
