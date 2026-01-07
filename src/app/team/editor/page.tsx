import { redirect } from 'next/navigation'
import { format } from 'date-fns'
import {
  Palette,
  Clock,
  Image,
  CheckCircle,
  AlertTriangle,
  ChevronRight,
  Zap,
  Layers,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { getStaffAccess } from '@/lib/auth/server-access'
import { createAdminClient } from '@/lib/supabase/admin'

export default async function EditorDashboard() {
  // Check authentication via Clerk (or Supabase fallback)
  const staff = await getStaffAccess()

  if (!staff) {
    redirect('/sign-in/staff')
  }

  // Verify editor or admin role
  if (staff.role !== 'editor' && staff.role !== 'admin') {
    redirect('/sign-in/staff')
  }

  const supabase = createAdminClient()

  // Get editing queue - listings in awaiting_editing or in_editing status
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

  // Get my assigned editing jobs (in_editing)
  const { data: myJobs } = await supabase
    .from('listings')
    .select(`
      id,
      address,
      city,
      state,
      sqft,
      ops_status,
      is_rush,
      updated_at
    `)
    .eq('ops_status', 'in_editing')
    .limit(10)

  // Get completed today
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const { count: completedToday } = await supabase
    .from('listings')
    .select('id', { count: 'exact', head: true })
    .eq('ops_status', 'ready_for_qc')
    .gte('updated_at', today.toISOString())

  // Stats
  const awaitingCount = editingQueue?.filter(l => l.ops_status === 'staged' || l.ops_status === 'awaiting_editing').length || 0
  const inProgressCount = myJobs?.length || 0
  const rushCount = editingQueue?.filter(l => l.is_rush).length || 0

  // Transform queue items
  const queueItems = editingQueue?.map((listing) => ({
    id: listing.id,
    address: listing.address,
    city: listing.city,
    state: listing.state,
    sqft: listing.sqft,
    status: listing.ops_status,
    isRush: listing.is_rush,
    stagedAt: listing.updated_at,
    agentName: (listing.agent as { name: string } | null)?.name,
  })) || []

  return (
    <div className="space-y-6 pb-20 lg:pb-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">
          Editor Dashboard
        </h1>
        <p className="text-neutral-600 mt-1">
          {format(new Date(), 'EEEE, MMMM d, yyyy')}
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Layers className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-neutral-900">{awaitingCount}</p>
                <p className="text-xs text-neutral-500">In Queue</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Palette className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-neutral-900">{inProgressCount}</p>
                <p className="text-xs text-neutral-500">In Progress</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-neutral-900">{completedToday || 0}</p>
                <p className="text-xs text-neutral-500">Done Today</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={rushCount > 0 ? 'border-red-200 bg-red-50' : ''}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${rushCount > 0 ? 'bg-red-100' : 'bg-neutral-100'}`}>
                <Zap className={`h-5 w-5 ${rushCount > 0 ? 'text-red-600' : 'text-neutral-600'}`} />
              </div>
              <div>
                <p className={`text-2xl font-bold ${rushCount > 0 ? 'text-red-700' : 'text-neutral-900'}`}>
                  {rushCount}
                </p>
                <p className="text-xs text-neutral-500">Rush Jobs</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rush Jobs Alert */}
      {rushCount > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <div>
                <p className="font-semibold text-red-800">
                  {rushCount} Rush {rushCount === 1 ? 'Job' : 'Jobs'} in Queue
                </p>
                <p className="text-sm text-red-600">
                  These need priority attention
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Editing Queue */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-neutral-900">Editing Queue</h2>
          <Badge variant="secondary">{queueItems.length} jobs</Badge>
        </div>

        {queueItems.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-3" />
              <p className="text-neutral-600">Queue is empty!</p>
              <p className="text-sm text-neutral-500 mt-1">Great job clearing the backlog.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {queueItems.map((job) => (
              <Link
                key={job.id}
                href={`/team/editor/job/${job.id}`}
                className="block"
              >
                <Card className={`hover:shadow-md transition-shadow ${
                  job.isRush ? 'border-l-4 border-l-red-500' : ''
                } ${job.status === 'in_editing' ? 'bg-blue-50 border-blue-200' : ''}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      {/* Priority/Status Indicator */}
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        job.isRush
                          ? 'bg-red-100'
                          : job.status === 'in_editing'
                            ? 'bg-blue-100'
                            : 'bg-neutral-100'
                      }`}>
                        {job.isRush ? (
                          <Zap className="h-5 w-5 text-red-600" />
                        ) : job.status === 'in_editing' ? (
                          <Palette className="h-5 w-5 text-blue-600" />
                        ) : (
                          <Image className="h-5 w-5 text-neutral-600" />
                        )}
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
                          <div className="flex flex-col items-end gap-1">
                            <StatusBadge status={job.status} isRush={job.isRush} />
                            {job.stagedAt && (
                              <span className="text-xs text-neutral-400">
                                <Clock className="h-3 w-3 inline mr-1" />
                                {getTimeAgo(job.stagedAt)}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="mt-2 flex items-center gap-4 text-xs text-neutral-500">
                          {job.sqft && (
                            <span>{job.sqft.toLocaleString()} sq ft</span>
                          )}
                          {job.agentName && (
                            <span>Agent: {job.agentName}</span>
                          )}
                        </div>
                      </div>

                      <ChevronRight className="h-5 w-5 text-neutral-400 flex-shrink-0" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Link
            href="/team/editor/queue"
            className="flex items-center justify-between p-3 rounded-lg hover:bg-neutral-100 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Layers className="h-5 w-5 text-neutral-500" />
              <span className="font-medium">View Full Queue</span>
            </div>
            <ChevronRight className="h-5 w-5 text-neutral-400" />
          </Link>
          <Link
            href="/team/editor/completed"
            className="flex items-center justify-between p-3 rounded-lg hover:bg-neutral-100 transition-colors"
          >
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-neutral-500" />
              <span className="font-medium">Completed Jobs</span>
            </div>
            <ChevronRight className="h-5 w-5 text-neutral-400" />
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}

function StatusBadge({ status, isRush }: { status: string | null; isRush: boolean | null }) {
  if (isRush) {
    return (
      <Badge className="bg-red-100 text-red-700 border-red-200">
        <Zap className="h-3 w-3 mr-1" />
        RUSH
      </Badge>
    )
  }

  const config: Record<string, { label: string; className: string }> = {
    staged: { label: 'Ready', className: 'bg-amber-100 text-amber-700' },
    awaiting_editing: { label: 'Queued', className: 'bg-neutral-100 text-neutral-700' },
    in_editing: { label: 'Editing', className: 'bg-blue-100 text-blue-700' },
  }

  const { label, className } = (status && config[status]) || config.awaiting_editing

  return (
    <Badge variant="secondary" className={className}>
      {label}
    </Badge>
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
