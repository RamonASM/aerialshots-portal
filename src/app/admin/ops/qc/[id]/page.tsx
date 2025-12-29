import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import {
  ArrowLeft,
  Check,
  CheckCircle,
  Clock,
  Send,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { QCReviewClient } from '@/components/qc/QCReviewClient'
import { notifyDeliveryReady } from '@/lib/notifications'

interface PageProps {
  params: Promise<{ id: string }>
}

async function approvePhoto(assetId: string, listingId: string) {
  'use server'

  const supabase = await createClient()

  await supabase
    .from('media_assets')
    .update({ qc_status: 'approved' })
    .eq('id', assetId)

  revalidatePath(`/admin/ops/qc/${listingId}`)
}

async function rejectPhoto(assetId: string, listingId: string, notes?: string) {
  'use server'

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

  // Get listing and agent info before updating
  const { data: listing } = await supabase
    .from('listings')
    .select('address, agent_id')
    .eq('id', listingId)
    .single()

  // Update listing status
  await supabase
    .from('listings')
    .update({
      ops_status: 'delivered',
      delivered_at: new Date().toISOString(),
    })
    .eq('id', listingId)

  // Log the delivery event
  await supabase.from('job_events').insert({
    listing_id: listingId,
    event_type: 'delivered',
    new_value: JSON.parse(JSON.stringify({ timestamp: new Date().toISOString() })),
    actor_type: 'staff',
  })

  // Send delivery notification to agent
  if (listing?.agent_id) {
    const { data: agent } = await supabase
      .from('agents')
      .select('name, email')
      .eq('id', listing.agent_id)
      .single()

    if (agent?.email) {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://portal.aerialshots.media'
      const deliveryUrl = `${baseUrl}/delivery/${listingId}`

      try {
        await notifyDeliveryReady(
          { email: agent.email, name: agent.name || 'Agent' },
          {
            agentName: agent.name || 'Agent',
            listingAddress: listing.address || 'Your property',
            deliveryUrl,
          }
        )
      } catch (notifyError) {
        // Log but don't fail the delivery if notification fails
        console.error('Failed to send delivery notification:', notifyError)
      }
    }
  }

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

      {/* Photo Grid with Full-screen Viewer */}
      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold text-neutral-900">Photos</h2>
          <p className="text-sm text-neutral-500">
            Click any photo for full-screen review with keyboard shortcuts
          </p>
        </div>

        <QCReviewClient
          listingId={id}
          photos={photos}
          onApprove={async (assetId) => {
            'use server'
            await approvePhoto(assetId, id)
          }}
          onReject={async (assetId, notes) => {
            'use server'
            await rejectPhoto(assetId, id, notes)
          }}
        />
      </div>
    </div>
  )
}
