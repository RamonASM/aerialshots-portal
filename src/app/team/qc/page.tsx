import { redirect } from 'next/navigation'
import { format } from 'date-fns'
import { getStaffAccess, hasRequiredRole } from '@/lib/auth/server-access'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  CheckCircle,
  Clock,
  Image,
  AlertTriangle,
  ChevronRight,
  Zap,
  Eye,
  ThumbsUp,
  ThumbsDown,
  BarChart3,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

export default async function QCDashboard() {
  // Check authentication via Clerk
  const staff = await getStaffAccess()

  if (!staff) {
    redirect('/sign-in/staff')
  }

  // Verify QC or admin role
  if (!hasRequiredRole(staff.role, ['qc'])) {
    redirect('/sign-in/staff')
  }

  const supabase = createAdminClient()

  // Get QC queue - listings ready for QC
  const { data: qcQueue } = await supabase
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
    .in('ops_status', ['ready_for_qc', 'in_qc'])
    .order('is_rush', { ascending: false })
    .order('updated_at', { ascending: true })

  // Get media assets that need QC for each listing
  const listingIds = qcQueue?.map(l => l.id) || []
  const { data: mediaAssets } = listingIds.length > 0
    ? await supabase
        .from('media_assets')
        .select('id, listing_id, qc_status')
        .in('listing_id', listingIds)
    : { data: [] }

  // Count assets by listing
  const assetCounts: Record<string, { total: number; pending: number; approved: number; rejected: number }> = {}
  mediaAssets?.forEach(asset => {
    if (!assetCounts[asset.listing_id]) {
      assetCounts[asset.listing_id] = { total: 0, pending: 0, approved: 0, rejected: 0 }
    }
    assetCounts[asset.listing_id].total++
    if (asset.qc_status === 'pending') assetCounts[asset.listing_id].pending++
    if (asset.qc_status === 'approved') assetCounts[asset.listing_id].approved++
    if (asset.qc_status === 'rejected') assetCounts[asset.listing_id].rejected++
  })

  // Get today's stats
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const { count: reviewedToday } = await supabase
    .from('media_assets')
    .select('id', { count: 'exact', head: true })
    .in('qc_status', ['approved', 'rejected'])
    .gte('updated_at', today.toISOString())

  const { count: deliveredToday } = await supabase
    .from('listings')
    .select('id', { count: 'exact', head: true })
    .eq('ops_status', 'delivered')
    .gte('updated_at', today.toISOString())

  // Stats
  const readyCount = qcQueue?.filter(l => l.ops_status === 'ready_for_qc').length || 0
  const inReviewCount = qcQueue?.filter(l => l.ops_status === 'in_qc').length || 0
  const rushCount = qcQueue?.filter(l => l.is_rush).length || 0
  const totalPendingAssets = Object.values(assetCounts).reduce((sum, c) => sum + c.pending, 0)

  // Transform queue items
  const queueItems = qcQueue?.map((listing) => ({
    id: listing.id,
    address: listing.address,
    city: listing.city,
    state: listing.state,
    sqft: listing.sqft,
    status: listing.ops_status,
    isRush: listing.is_rush,
    updatedAt: listing.updated_at,
    agentName: (listing.agent as { name: string } | null)?.name,
    assetStats: assetCounts[listing.id] || { total: 0, pending: 0, approved: 0, rejected: 0 },
  })) || []

  return (
    <div className="space-y-6 pb-20 lg:pb-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">
          QC Dashboard
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
              <div className="p-2 bg-cyan-100 rounded-lg">
                <Eye className="h-5 w-5 text-cyan-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-neutral-900">{readyCount}</p>
                <p className="text-xs text-neutral-500">Ready for QC</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-violet-100 rounded-lg">
                <Image className="h-5 w-5 text-violet-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-neutral-900">{totalPendingAssets}</p>
                <p className="text-xs text-neutral-500">Assets Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <ThumbsUp className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-neutral-900">{reviewedToday || 0}</p>
                <p className="text-xs text-neutral-500">Reviewed Today</p>
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

      {/* Today's Performance */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-neutral-500" />
            Today&apos;s Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-3xl font-bold text-green-600">{reviewedToday || 0}</p>
              <p className="text-sm text-green-700">Assets Reviewed</p>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-3xl font-bold text-blue-600">{deliveredToday || 0}</p>
              <p className="text-sm text-blue-700">Jobs Delivered</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rush Jobs Alert */}
      {rushCount > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <div>
                <p className="font-semibold text-red-800">
                  {rushCount} Rush {rushCount === 1 ? 'Job' : 'Jobs'} Awaiting QC
                </p>
                <p className="text-sm text-red-600">
                  Please prioritize these for immediate review
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* QC Queue */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-neutral-900">QC Queue</h2>
          <Badge variant="secondary">{queueItems.length} listings</Badge>
        </div>

        {queueItems.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-3" />
              <p className="text-neutral-600">All caught up!</p>
              <p className="text-sm text-neutral-500 mt-1">No listings pending QC review.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {queueItems.map((job) => (
              <Link
                key={job.id}
                href={`/team/qc/review/${job.id}`}
                className="block"
              >
                <Card className={`hover:shadow-md transition-shadow ${
                  job.isRush ? 'border-l-4 border-l-red-500' : ''
                } ${job.status === 'in_qc' ? 'bg-violet-50 border-violet-200' : ''}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      {/* Status Indicator */}
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        job.isRush
                          ? 'bg-red-100'
                          : job.status === 'in_qc'
                            ? 'bg-violet-100'
                            : 'bg-cyan-100'
                      }`}>
                        {job.isRush ? (
                          <Zap className="h-5 w-5 text-red-600" />
                        ) : job.status === 'in_qc' ? (
                          <Eye className="h-5 w-5 text-violet-600" />
                        ) : (
                          <CheckCircle className="h-5 w-5 text-cyan-600" />
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
                          <StatusBadge status={job.status} isRush={job.isRush} />
                        </div>

                        {/* Asset Stats */}
                        <div className="mt-2 flex items-center gap-3 text-xs">
                          <span className="flex items-center gap-1 text-neutral-600">
                            <Image className="h-3.5 w-3.5" />
                            {job.assetStats.total} assets
                          </span>
                          {job.assetStats.pending > 0 && (
                            <span className="flex items-center gap-1 text-amber-600">
                              <Clock className="h-3.5 w-3.5" />
                              {job.assetStats.pending} pending
                            </span>
                          )}
                          {job.assetStats.approved > 0 && (
                            <span className="flex items-center gap-1 text-green-600">
                              <ThumbsUp className="h-3.5 w-3.5" />
                              {job.assetStats.approved}
                            </span>
                          )}
                          {job.assetStats.rejected > 0 && (
                            <span className="flex items-center gap-1 text-red-600">
                              <ThumbsDown className="h-3.5 w-3.5" />
                              {job.assetStats.rejected}
                            </span>
                          )}
                        </div>

                        {job.updatedAt && (
                          <p className="text-xs text-neutral-400 mt-1">
                            <Clock className="h-3 w-3 inline mr-1" />
                            Submitted {getTimeAgo(job.updatedAt)}
                          </p>
                        )}
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
            href="/team/qc/queue"
            className="flex items-center justify-between p-3 rounded-lg hover:bg-neutral-100 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Eye className="h-5 w-5 text-neutral-500" />
              <span className="font-medium">Full Review Queue</span>
            </div>
            <ChevronRight className="h-5 w-5 text-neutral-400" />
          </Link>
          <Link
            href="/team/qc/rejected"
            className="flex items-center justify-between p-3 rounded-lg hover:bg-neutral-100 transition-colors"
          >
            <div className="flex items-center gap-3">
              <ThumbsDown className="h-5 w-5 text-neutral-500" />
              <span className="font-medium">Rejected Assets</span>
            </div>
            <ChevronRight className="h-5 w-5 text-neutral-400" />
          </Link>
          <Link
            href="/team/qc/delivered"
            className="flex items-center justify-between p-3 rounded-lg hover:bg-neutral-100 transition-colors"
          >
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-neutral-500" />
              <span className="font-medium">Delivered Today</span>
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
    ready_for_qc: { label: 'Ready', className: 'bg-cyan-100 text-cyan-700' },
    in_qc: { label: 'Reviewing', className: 'bg-violet-100 text-violet-700' },
  }

  const { label, className } = (status && config[status]) || config.ready_for_qc

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
