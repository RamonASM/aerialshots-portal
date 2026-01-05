import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Image,
  Clock,
  Zap,
  ChevronRight,
  Filter,
  Search,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

export default async function EditorQueuePage() {
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
    .select('id, name, role')
    .eq('email', user.email!)
    .eq('is_active', true)
    .single()

  if (!staff) {
    redirect('/staff-login')
  }

  // Get all editing jobs
  const { data: editingQueue } = await supabase
    .from('listings')
    .select(`
      id,
      address,
      city,
      state,
      sqft,
      ops_status,
      is_rush,
      updated_at,
      agent:agents(name)
    `)
    .in('ops_status', ['staged', 'awaiting_editing', 'in_editing'])
    .order('is_rush', { ascending: false })
    .order('updated_at', { ascending: true })

  // Group by status
  const staged = editingQueue?.filter(l => l.ops_status === 'staged') || []
  const awaiting = editingQueue?.filter(l => l.ops_status === 'awaiting_editing') || []
  const inProgress = editingQueue?.filter(l => l.ops_status === 'in_editing') || []

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
          <h1 className="text-xl font-bold text-foreground">Editing Queue</h1>
          <p className="text-sm text-muted-foreground">
            {editingQueue?.length || 0} jobs pending
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-amber-600">{staged.length}</p>
              <p className="text-xs text-muted-foreground">Ready to Edit</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-neutral-600">{awaiting.length}</p>
              <p className="text-xs text-muted-foreground">Queued</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{inProgress.length}</p>
              <p className="text-xs text-muted-foreground">In Progress</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Queue Sections */}
      {staged.length > 0 && (
        <QueueSection
          title="Ready to Edit"
          badgeColor="amber"
          jobs={staged}
        />
      )}

      {awaiting.length > 0 && (
        <QueueSection
          title="Awaiting Editing"
          badgeColor="neutral"
          jobs={awaiting}
        />
      )}

      {inProgress.length > 0 && (
        <QueueSection
          title="In Progress"
          badgeColor="blue"
          jobs={inProgress}
        />
      )}

      {editingQueue?.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Image className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-lg font-medium">Queue is empty!</p>
            <p className="text-sm text-muted-foreground mt-1">
              No jobs waiting to be edited.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

interface QueueSectionProps {
  title: string
  badgeColor: 'amber' | 'neutral' | 'blue' | 'green'
  jobs: Array<{
    id: string
    address: string
    city: string | null
    state: string | null
    sqft: number | null
    is_rush: boolean | null
    updated_at: string | null
    agent: { name: string } | null
  }>
}

function QueueSection({ title, badgeColor, jobs }: QueueSectionProps) {
  const colorClasses = {
    amber: 'bg-amber-100 text-amber-700',
    neutral: 'bg-neutral-100 text-neutral-700',
    blue: 'bg-blue-100 text-blue-700',
    green: 'bg-green-100 text-green-700',
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        <Badge variant="secondary" className={colorClasses[badgeColor]}>
          {jobs.length}
        </Badge>
      </div>
      <div className="space-y-2">
        {jobs.map((job) => (
          <Link
            key={job.id}
            href={`/team/editor/job/${job.id}`}
            className="block"
          >
            <Card className={`hover:shadow-md transition-shadow ${
              job.is_rush ? 'border-l-4 border-l-red-500' : ''
            }`}>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-foreground truncate">
                        {job.address}
                      </p>
                      {job.is_rush && (
                        <Badge variant="destructive" className="flex items-center gap-1">
                          <Zap className="h-3 w-3" />
                          RUSH
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {job.city}, {job.state}
                    </p>
                    <div className="mt-1 flex items-center gap-4 text-xs text-muted-foreground">
                      {job.sqft && <span>{job.sqft.toLocaleString()} sqft</span>}
                      {job.agent && <span>Agent: {job.agent.name}</span>}
                      {job.updated_at && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {getTimeAgo(job.updated_at)}
                        </span>
                      )}
                    </div>
                  </div>
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

function getTimeAgo(date: string): string {
  const now = new Date()
  const then = new Date(date)
  const diffMs = now.getTime() - then.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffDays > 0) return `${diffDays}d ago`
  if (diffHours > 0) return `${diffHours}h ago`
  if (diffMins > 0) return `${diffMins}m ago`
  return 'Just now'
}
