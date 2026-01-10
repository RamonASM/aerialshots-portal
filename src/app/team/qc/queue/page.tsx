import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getStaffAccess, hasRequiredRole } from '@/lib/auth/server-access'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  ArrowLeft,
  CheckCircle,
  Clock,
  Zap,
  ChevronRight,
  Image,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

export default async function QCQueuePage() {
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

  // Get QC queue - listings ready for QC or in QC
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

  // Get photo counts for each listing
  const listingIds = qcQueue?.map(l => l.id) || []

  let photoCounts: Record<string, { total: number; pending: number; approved: number; rejected: number }> = {}

  if (listingIds.length > 0) {
    const { data: assets } = await supabase
      .from('media_assets')
      .select('listing_id, qc_status')
      .in('listing_id', listingIds)
      .eq('type', 'photo')

    if (assets) {
      assets.forEach(asset => {
        if (!photoCounts[asset.listing_id]) {
          photoCounts[asset.listing_id] = { total: 0, pending: 0, approved: 0, rejected: 0 }
        }
        photoCounts[asset.listing_id].total++
        if (asset.qc_status === 'approved') {
          photoCounts[asset.listing_id].approved++
        } else if (asset.qc_status === 'rejected') {
          photoCounts[asset.listing_id].rejected++
        } else {
          photoCounts[asset.listing_id].pending++
        }
      })
    }
  }

  // Group by status
  const readyForQC = qcQueue?.filter(l => l.ops_status === 'ready_for_qc') || []
  const inQC = qcQueue?.filter(l => l.ops_status === 'in_qc') || []

  return (
    <div className="space-y-6 pb-20 lg:pb-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/team/qc">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Dashboard
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-foreground">QC Queue</h1>
          <p className="text-sm text-muted-foreground">
            {qcQueue?.length || 0} jobs pending review
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-amber-600">{readyForQC.length}</p>
              <p className="text-xs text-muted-foreground">Ready for QC</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{inQC.length}</p>
              <p className="text-xs text-muted-foreground">In Progress</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* In Progress Section */}
      {inQC.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">In Progress</h2>
            <Badge variant="secondary" className="bg-blue-100 text-blue-700">
              {inQC.length}
            </Badge>
          </div>
          <div className="space-y-2">
            {inQC.map((job) => (
              <QueueJobCard
                key={job.id}
                job={job}
                photoStats={photoCounts[job.id]}
              />
            ))}
          </div>
        </div>
      )}

      {/* Ready for QC Section */}
      {readyForQC.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Ready for QC</h2>
            <Badge variant="secondary" className="bg-amber-100 text-amber-700">
              {readyForQC.length}
            </Badge>
          </div>
          <div className="space-y-2">
            {readyForQC.map((job) => (
              <QueueJobCard
                key={job.id}
                job={job}
                photoStats={photoCounts[job.id]}
              />
            ))}
          </div>
        </div>
      )}

      {qcQueue?.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-3" />
            <p className="text-lg font-medium">Queue is empty!</p>
            <p className="text-sm text-muted-foreground mt-1">
              All jobs have been reviewed.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

interface QueueJobCardProps {
  job: {
    id: string
    address: string
    city: string | null
    state: string | null
    sqft: number | null
    ops_status: string | null
    is_rush: boolean | null
    updated_at: string | null
    agent: { name: string } | null
  }
  photoStats?: {
    total: number
    pending: number
    approved: number
    rejected: number
  }
}

function QueueJobCard({ job, photoStats }: QueueJobCardProps) {
  const progress = photoStats
    ? Math.round(((photoStats.approved + photoStats.rejected) / photoStats.total) * 100)
    : 0

  return (
    <Link href={`/team/qc/review/${job.id}`} className="block">
      <Card className={`hover:shadow-md transition-shadow ${
        job.is_rush ? 'border-l-4 border-l-red-500' : ''
      } ${job.ops_status === 'in_qc' ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}>
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
              <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                {job.sqft && <span>{job.sqft.toLocaleString()} sqft</span>}
                {job.agent && <span>Agent: {job.agent.name}</span>}
                {photoStats && (
                  <span className="flex items-center gap-1">
                    <Image className="h-3 w-3" />
                    {photoStats.total} photos
                  </span>
                )}
              </div>
              {/* Progress Bar */}
              {photoStats && photoStats.total > 0 && (
                <div className="mt-2">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-muted-foreground">{progress}% reviewed</span>
                    <span className="text-muted-foreground">
                      {photoStats.pending} pending
                    </span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 rounded-full transition-all"
                      style={{ width: `${(photoStats.approved / photoStats.total) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
