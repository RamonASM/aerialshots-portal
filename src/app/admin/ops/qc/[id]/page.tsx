import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Clock,
  Check,
  X,
  Send,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PageProps {
  params: Promise<{ id: string }>
}

async function approvePhoto(formData: FormData) {
  'use server'

  const assetId = formData.get('assetId') as string
  const listingId = formData.get('listingId') as string
  const supabase = await createClient()

  await supabase
    .from('media_assets')
    .update({ qc_status: 'approved' })
    .eq('id', assetId)

  revalidatePath(`/admin/ops/qc/${listingId}`)
}

async function rejectPhoto(formData: FormData) {
  'use server'

  const assetId = formData.get('assetId') as string
  const listingId = formData.get('listingId') as string
  const notes = formData.get('notes') as string
  const supabase = await createClient()

  await supabase
    .from('media_assets')
    .update({ qc_status: 'rejected', qc_notes: notes || 'Quality not acceptable' })
    .eq('id', assetId)

  revalidatePath(`/admin/ops/qc/${listingId}`)
}

async function approveAll(formData: FormData) {
  'use server'

  const listingId = formData.get('listingId') as string
  const supabase = await createClient()

  await supabase
    .from('media_assets')
    .update({ qc_status: 'approved' })
    .eq('listing_id', listingId)
    .eq('qc_status', 'pending')

  revalidatePath(`/admin/ops/qc/${listingId}`)
}

async function markDelivered(formData: FormData) {
  'use server'

  const listingId = formData.get('listingId') as string
  const supabase = await createClient()

  await supabase
    .from('listings')
    .update({
      ops_status: 'delivered',
      delivered_at: new Date().toISOString(),
    })
    .eq('id', listingId)

  await supabase.from('job_events').insert({
    listing_id: listingId,
    event_type: 'delivered',
    new_value: JSON.parse(JSON.stringify({ timestamp: new Date().toISOString() })),
    actor_type: 'staff',
  })

  // TODO: Create care task for post-delivery call
  // TODO: Send delivery notification to agent

  redirect('/admin/ops/qc')
}

async function startQC(formData: FormData) {
  'use server'

  const listingId = formData.get('listingId') as string
  const supabase = await createClient()

  await supabase.from('listings').update({ ops_status: 'in_qc' }).eq('id', listingId)

  revalidatePath(`/admin/ops/qc/${listingId}`)
}

export default async function QCDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: listing, error } = await supabase
    .from('listings')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !listing) {
    notFound()
  }

  // Get agent info
  const { data: agent } = listing.agent_id
    ? await supabase
        .from('agents')
        .select('name, email')
        .eq('id', listing.agent_id)
        .single()
    : { data: null }

  // Get media assets
  const { data: media } = await supabase
    .from('media_assets')
    .select('*')
    .eq('listing_id', id)
    .order('sort_order', { ascending: true })

  const photos = media?.filter((m) => m.type === 'photo') || []
  const pendingCount = photos.filter((p) => p.qc_status === 'pending').length
  const approvedCount = photos.filter((p) => p.qc_status === 'approved').length
  const rejectedCount = photos.filter((p) => p.qc_status === 'rejected').length

  const canDeliver = pendingCount === 0 && approvedCount > 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/admin/ops/qc">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-neutral-900">
                {listing.address}
              </h1>
              {listing.is_rush && (
                <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-700">
                  RUSH
                </span>
              )}
            </div>
            <p className="mt-1 text-neutral-600">
              {listing.city}, {listing.state}
              {agent && ` • ${agent.name}`}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {listing.ops_status === 'ready_for_qc' && (
            <form action={startQC}>
              <input type="hidden" name="listingId" value={id} />
              <Button type="submit">Start QC</Button>
            </form>
          )}

          {canDeliver && (
            <form action={markDelivered}>
              <input type="hidden" name="listingId" value={id} />
              <Button type="submit" className="bg-green-600 hover:bg-green-700">
                <Send className="mr-2 h-4 w-4" />
                Mark Delivered
              </Button>
            </form>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="rounded-lg border border-neutral-200 bg-white p-4 text-center">
          <p className="text-2xl font-bold text-neutral-900">{photos.length}</p>
          <p className="text-sm text-neutral-500">Total Photos</p>
        </div>
        <div className="rounded-lg border border-neutral-200 bg-white p-4 text-center">
          <p className="text-2xl font-bold text-neutral-500">{pendingCount}</p>
          <p className="text-sm text-neutral-500">Pending</p>
        </div>
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{approvedCount}</p>
          <p className="text-sm text-green-600">Approved</p>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center">
          <p className="text-2xl font-bold text-red-600">{rejectedCount}</p>
          <p className="text-sm text-red-600">Rejected</p>
        </div>
      </div>

      {/* Quick Actions */}
      {pendingCount > 0 && (
        <div className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white p-4">
          <div>
            <h2 className="font-medium text-neutral-900">Quick Actions</h2>
            <p className="text-sm text-neutral-500">
              {pendingCount} photos waiting for review
            </p>
          </div>
          <form action={approveAll}>
            <input type="hidden" name="listingId" value={id} />
            <Button type="submit" variant="outline">
              <CheckCircle className="mr-2 h-4 w-4" />
              Approve All Pending
            </Button>
          </form>
        </div>
      )}

      {/* Photo Grid */}
      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        <h2 className="mb-4 font-semibold text-neutral-900">Photos</h2>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className={`relative overflow-hidden rounded-lg border-2 ${
                photo.qc_status === 'approved'
                  ? 'border-green-500'
                  : photo.qc_status === 'rejected'
                    ? 'border-red-500'
                    : 'border-neutral-200'
              }`}
            >
              <div className="aspect-square">
                <img
                  src={photo.aryeo_url}
                  alt=""
                  className="h-full w-full object-cover"
                />
              </div>

              {/* Status Badge */}
              <div
                className={`absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full ${
                  photo.qc_status === 'approved'
                    ? 'bg-green-500 text-white'
                    : photo.qc_status === 'rejected'
                      ? 'bg-red-500 text-white'
                      : 'bg-neutral-100 text-neutral-500'
                }`}
              >
                {photo.qc_status === 'approved' ? (
                  <Check className="h-4 w-4" />
                ) : photo.qc_status === 'rejected' ? (
                  <X className="h-4 w-4" />
                ) : (
                  <Clock className="h-3 w-3" />
                )}
              </div>

              {/* Category */}
              {photo.category && (
                <div className="absolute left-2 top-2 rounded bg-black/50 px-2 py-0.5 text-xs text-white">
                  {photo.category}
                </div>
              )}

              {/* Actions for pending photos */}
              {photo.qc_status === 'pending' && (
                <div className="flex border-t border-neutral-100">
                  <form action={approvePhoto} className="flex-1">
                    <input type="hidden" name="assetId" value={photo.id} />
                    <input type="hidden" name="listingId" value={id} />
                    <button
                      type="submit"
                      className="flex w-full items-center justify-center gap-1 bg-green-50 py-2 text-green-600 transition-colors hover:bg-green-100"
                    >
                      <CheckCircle className="h-4 w-4" />
                      <span className="text-sm">Approve</span>
                    </button>
                  </form>
                  <form action={rejectPhoto} className="flex-1 border-l border-neutral-100">
                    <input type="hidden" name="assetId" value={photo.id} />
                    <input type="hidden" name="listingId" value={id} />
                    <input type="hidden" name="notes" value="" />
                    <button
                      type="submit"
                      className="flex w-full items-center justify-center gap-1 bg-red-50 py-2 text-red-600 transition-colors hover:bg-red-100"
                    >
                      <XCircle className="h-4 w-4" />
                      <span className="text-sm">Reject</span>
                    </button>
                  </form>
                </div>
              )}

              {/* Rejection notes */}
              {photo.qc_status === 'rejected' && photo.qc_notes && (
                <div className="bg-red-50 p-2 text-xs text-red-600">
                  {photo.qc_notes}
                </div>
              )}
            </div>
          ))}
        </div>

        {photos.length === 0 && (
          <p className="py-8 text-center text-neutral-500">
            No photos have been uploaded yet.
          </p>
        )}
      </div>
    </div>
  )
}
