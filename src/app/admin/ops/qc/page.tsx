import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { CheckCircle, XCircle, Clock, Eye, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { RealtimeRefresh } from '@/components/admin/RealtimeRefresh'

export default async function QCPage() {
  const supabase = await createClient()

  // Get listings ready for QC
  const { data: listingsData } = await supabase
    .from('listings')
    .select('*')
    .in('ops_status', ['ready_for_qc', 'in_qc'])
    .order('is_rush', { ascending: false })
    .order('scheduled_at', { ascending: true })

  // Get agents for listings
  const agentIds = [
    ...new Set(
      listingsData?.map((l) => l.agent_id).filter((id): id is string => id !== null) || []
    ),
  ]
  const { data: agents } =
    agentIds.length > 0
      ? await supabase.from('agents').select('id, name').in('id', agentIds)
      : { data: [] }

  // Get media counts per listing
  const listingIds = listingsData?.map((l) => l.id) || []
  const { data: mediaData } =
    listingIds.length > 0
      ? await supabase
          .from('media_assets')
          .select('listing_id, qc_status')
          .in('listing_id', listingIds)
      : { data: [] }

  // Combine data
  const listings = listingsData?.map((listing) => {
    const media = mediaData?.filter((m) => m.listing_id === listing.id) || []
    return {
      ...listing,
      agent: agents?.find((a) => a.id === listing.agent_id) || null,
      media_count: media.length,
      pending_count: media.filter((m) => m.qc_status === 'pending').length,
      approved_count: media.filter((m) => m.qc_status === 'approved').length,
      rejected_count: media.filter((m) => m.qc_status === 'rejected').length,
    }
  })

  const readyForQC = listings?.filter((l) => l.ops_status === 'ready_for_qc') || []
  const inQC = listings?.filter((l) => l.ops_status === 'in_qc') || []
  const rushJobs = listings?.filter((l) => l.is_rush) || []

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Quality Control</h1>
          <p className="mt-1 text-neutral-600">
            Review and approve staged photos before delivery.
          </p>
        </div>
        <RealtimeRefresh statuses={['ready_for_qc', 'in_qc', 'delivered']} />
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-cyan-500" />
            <span className="text-sm text-neutral-600">Ready for QC</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-neutral-900">
            {readyForQC.length}
          </p>
        </div>

        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <div className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-pink-500" />
            <span className="text-sm text-neutral-600">In Review</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-neutral-900">{inQC.length}</p>
        </div>

        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <span className="text-sm text-amber-700">Rush Jobs</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-amber-800">{rushJobs.length}</p>
        </div>
      </div>

      {/* Queue */}
      <div className="rounded-lg border border-neutral-200 bg-white">
        <div className="border-b border-neutral-200 px-6 py-4">
          <h2 className="font-semibold text-neutral-900">QC Queue</h2>
        </div>

        {listings && listings.length > 0 ? (
          <div className="divide-y divide-neutral-100">
            {listings.map((listing) => (
              <Link
                key={listing.id}
                href={`/admin/ops/qc/${listing.id}`}
                className="flex items-center justify-between p-4 transition-colors hover:bg-neutral-50"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-medium text-neutral-900">
                      {listing.address}
                    </h3>
                    {listing.is_rush && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                        RUSH
                      </span>
                    )}
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        listing.ops_status === 'in_qc'
                          ? 'bg-pink-100 text-pink-700'
                          : 'bg-cyan-100 text-cyan-700'
                      }`}
                    >
                      {listing.ops_status === 'in_qc' ? 'In Review' : 'Ready'}
                    </span>
                  </div>

                  <p className="mt-1 text-sm text-neutral-500">
                    {listing.city}, {listing.state}
                    {listing.agent && ` • ${listing.agent.name}`}
                  </p>

                  <div className="mt-2 flex items-center gap-4 text-xs">
                    <span className="flex items-center gap-1 text-neutral-500">
                      {listing.media_count} photos
                    </span>
                    {listing.pending_count > 0 && (
                      <span className="flex items-center gap-1 text-neutral-500">
                        <Clock className="h-3 w-3" />
                        {listing.pending_count} pending
                      </span>
                    )}
                    {listing.approved_count > 0 && (
                      <span className="flex items-center gap-1 text-green-600">
                        <CheckCircle className="h-3 w-3" />
                        {listing.approved_count} approved
                      </span>
                    )}
                    {listing.rejected_count > 0 && (
                      <span className="flex items-center gap-1 text-red-600">
                        <XCircle className="h-3 w-3" />
                        {listing.rejected_count} rejected
                      </span>
                    )}
                  </div>
                </div>

                <Button size="sm">Review</Button>
              </Link>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center">
            <CheckCircle className="mx-auto h-12 w-12 text-green-300" />
            <h3 className="mt-4 font-semibold text-neutral-900">All clear!</h3>
            <p className="mt-2 text-neutral-600">No jobs waiting for QC review.</p>
          </div>
        )}
      </div>
    </div>
  )
}
