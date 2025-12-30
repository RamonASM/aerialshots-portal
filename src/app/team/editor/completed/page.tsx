import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { format, subDays, startOfDay, endOfDay } from 'date-fns'
import {
  ArrowLeft,
  CheckCircle,
  ChevronRight,
  Calendar,
  TrendingUp,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function EditorCompletedPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/staff-login')
  }

  // Verify staff role
  const { data: staff } = await supabase
    .from('staff')
    .select('id, name, role, team_role')
    .eq('email', user.email!)
    .eq('is_active', true)
    .single()

  if (!staff) {
    redirect('/staff-login')
  }

  // Get completed jobs from the last 7 days
  const sevenDaysAgo = subDays(new Date(), 7)

  const { data: completedJobs } = await supabase
    .from('listings')
    .select(`
      id,
      address,
      city,
      state,
      sqft,
      ops_status,
      updated_at,
      delivered_at,
      agent:agents(name)
    `)
    .in('ops_status', ['ready_for_qc', 'in_qc', 'delivered'])
    .gte('updated_at', sevenDaysAgo.toISOString())
    .order('updated_at', { ascending: false })

  // Group by day
  const today = startOfDay(new Date())
  const yesterday = startOfDay(subDays(new Date(), 1))

  const todayJobs = completedJobs?.filter(j => {
    const date = new Date(j.updated_at)
    return date >= today
  }) || []

  const yesterdayJobs = completedJobs?.filter(j => {
    const date = new Date(j.updated_at)
    return date >= yesterday && date < today
  }) || []

  const olderJobs = completedJobs?.filter(j => {
    const date = new Date(j.updated_at)
    return date < yesterday
  }) || []

  // Stats
  const totalCompleted = completedJobs?.length || 0
  const readyForQC = completedJobs?.filter(j => j.ops_status === 'ready_for_qc').length || 0
  const inQC = completedJobs?.filter(j => j.ops_status === 'in_qc').length || 0
  const delivered = completedJobs?.filter(j => j.ops_status === 'delivered').length || 0

  return (
    <div className="space-y-6 pb-20 lg:pb-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/team/editor">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Dashboard
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-foreground">Completed Jobs</h1>
          <p className="text-sm text-muted-foreground">
            Last 7 days
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalCompleted}</p>
                <p className="text-xs text-muted-foreground">Total Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                <TrendingUp className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{todayJobs.length}</p>
                <p className="text-xs text-muted-foreground">Today</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{readyForQC + inQC}</p>
              <p className="text-xs text-muted-foreground">In QC</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{delivered}</p>
              <p className="text-xs text-muted-foreground">Delivered</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Jobs by Day */}
      {todayJobs.length > 0 && (
        <CompletedSection
          title="Today"
          jobs={todayJobs}
        />
      )}

      {yesterdayJobs.length > 0 && (
        <CompletedSection
          title="Yesterday"
          jobs={yesterdayJobs}
        />
      )}

      {olderJobs.length > 0 && (
        <CompletedSection
          title="Earlier This Week"
          jobs={olderJobs}
        />
      )}

      {totalCompleted === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-lg font-medium">No completed jobs</p>
            <p className="text-sm text-muted-foreground mt-1">
              Jobs you complete will appear here.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

interface CompletedSectionProps {
  title: string
  jobs: Array<{
    id: string
    address: string
    city: string | null
    state: string | null
    sqft: number | null
    ops_status: string | null
    updated_at: string
    delivered_at: string | null
    agent: { name: string } | null
  }>
}

function CompletedSection({ title, jobs }: CompletedSectionProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        <Badge variant="secondary">{jobs.length}</Badge>
      </div>
      <div className="space-y-2">
        {jobs.map((job) => (
          <Link
            key={job.id}
            href={`/team/editor/job/${job.id}`}
            className="block"
          >
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <StatusIcon status={job.ops_status} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">
                      {job.address}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {job.city}, {job.state}
                    </p>
                    <div className="mt-1 flex items-center gap-4 text-xs text-muted-foreground">
                      {job.sqft && <span>{job.sqft.toLocaleString()} sqft</span>}
                      {job.agent && <span>Agent: {job.agent.name}</span>}
                      <span>
                        {format(new Date(job.updated_at), 'h:mm a')}
                      </span>
                    </div>
                  </div>
                  <StatusBadge status={job.ops_status} />
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}

function StatusIcon({ status }: { status: string | null }) {
  if (status === 'delivered') {
    return (
      <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
        <CheckCircle className="h-5 w-5 text-green-600" />
      </div>
    )
  }
  return (
    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
      <CheckCircle className="h-5 w-5 text-blue-600" />
    </div>
  )
}

function StatusBadge({ status }: { status: string | null }) {
  const config: Record<string, { label: string; className: string }> = {
    ready_for_qc: { label: 'In QC Queue', className: 'bg-amber-100 text-amber-700' },
    in_qc: { label: 'QC Review', className: 'bg-blue-100 text-blue-700' },
    delivered: { label: 'Delivered', className: 'bg-green-100 text-green-700' },
  }

  const { label, className } = (status && config[status]) || { label: status || 'Unknown', className: 'bg-neutral-100' }

  return (
    <Badge variant="secondary" className={className}>
      {label}
    </Badge>
  )
}
