import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import {
  ArrowLeft,
  MapPin,
  Calendar,
  User,
  CheckCircle,
  Clock,
  AlertTriangle,
  Plug,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { IntegrationPanelClient } from '@/components/admin/ops/IntegrationPanelClient'
import { SkillsPanelClient } from '@/components/admin/ops/SkillsPanelClient'
import { JobNotesClient } from '@/components/admin/ops/JobNotesClient'
import { JobTasksClient } from '@/components/admin/ops/JobTasksClient'
import { JobServicesClient } from '@/components/admin/ops/JobServicesClient'
import type { IntegrationStatus, Zillow3DStatus } from '@/lib/supabase/types'

interface PageProps {
  params: Promise<{ id: string }>
}

const statusOptions = [
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'staged', label: 'Staged' },
  { value: 'processing', label: 'Processing' },
  { value: 'ready_for_qc', label: 'Ready for QC' },
  { value: 'in_qc', label: 'In QC' },
  { value: 'delivered', label: 'Delivered' },
]

async function updateStatus(formData: FormData) {
  'use server'

  const id = formData.get('id') as string
  const status = formData.get('status') as string

  const supabase = await createClient()

  await supabase
    .from('listings')
    .update({
      ops_status: status,
      ...(status === 'delivered' ? { delivered_at: new Date().toISOString() } : {}),
    })
    .eq('id', id)

  // Log event
  await supabase.from('job_events').insert({
    listing_id: id,
    event_type: 'status_change',
    new_value: JSON.parse(JSON.stringify({ status })),
    actor_type: 'staff',
  })

  revalidatePath(`/admin/ops/jobs/${id}`)
  revalidatePath('/admin/ops')
}

export default async function JobDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: listingData, error } = await supabase
    .from('listings')
    .select(`
      *,
      fotello_job_id,
      fotello_status,
      cubicasa_order_id,
      cubicasa_status,
      zillow_3d_id,
      zillow_3d_status,
      integration_error_message,
      last_integration_check
    `)
    .eq('id', id)
    .single()

  if (error || !listingData) {
    notFound()
  }

  // Get agent and media assets
  const [{ data: agent }, { data: media_assets }] = await Promise.all([
    listingData.agent_id
      ? supabase.from('agents').select('name, email, phone').eq('id', listingData.agent_id).single()
      : { data: null },
    supabase
      .from('media_assets')
      .select('id, aryeo_url, media_url, type, category, qc_status')
      .eq('listing_id', id),
  ])

  const listing = {
    ...listingData,
    agent,
    media_assets,
  }

  // Get job events
  const { data: events } = await supabase
    .from('job_events')
    .select('*')
    .eq('listing_id', id)
    .order('created_at', { ascending: false })
    .limit(20)

  const statusIndex = statusOptions.findIndex((s) => s.value === listing.ops_status)

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/ops">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-neutral-900">{listing.address}</h1>
            {listing.is_rush && (
              <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-700">
                RUSH
              </span>
            )}
          </div>
          <p className="mt-1 text-neutral-600">
            {listing.city}, {listing.state} {listing.zip}
          </p>
        </div>
        <JobServicesClient listingId={listing.id} />
      </div>

      {/* Status Progress */}
      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        <h2 className="mb-4 font-semibold text-neutral-900">Status</h2>

        <div className="mb-6 flex items-center justify-between">
          {statusOptions.map((status, index) => (
            <div
              key={status.value}
              className="flex flex-col items-center"
            >
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full ${
                  index <= statusIndex
                    ? 'bg-green-500 text-white'
                    : 'bg-neutral-200 text-neutral-400'
                }`}
              >
                {index < statusIndex ? (
                  <CheckCircle className="h-5 w-5" />
                ) : (
                  <span className="text-xs font-medium">{index + 1}</span>
                )}
              </div>
              <span
                className={`mt-2 text-xs ${
                  index <= statusIndex ? 'text-green-600' : 'text-neutral-400'
                }`}
              >
                {status.label}
              </span>
            </div>
          ))}
        </div>

        <form action={updateStatus} className="flex items-center gap-4">
          <input type="hidden" name="id" value={listing.id} />
          <select
            name="status"
            defaultValue={listing.ops_status}
            className="flex-1 rounded-lg border border-neutral-200 px-3 py-2"
          >
            {statusOptions.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
          <Button type="submit">Update Status</Button>
        </form>
      </div>

      {/* Integration Status */}
      <IntegrationPanelClient
        listingId={listing.id}
        integrations={{
          fotello: {
            status: (listing.fotello_status as IntegrationStatus) || 'pending',
            external_id: listing.fotello_job_id || null,
          },
          cubicasa: {
            status: (listing.cubicasa_status as IntegrationStatus) || 'pending',
            external_id: listing.cubicasa_order_id || null,
          },
          zillow_3d: {
            status: (listing.zillow_3d_status as Zillow3DStatus) || 'pending',
            external_id: listing.zillow_3d_id || null,
          },
        }}
        errorMessage={listing.integration_error_message}
        lastCheck={listing.last_integration_check}
      />

      {/* AI Skills Panel */}
      <SkillsPanelClient
        listingId={listing.id}
        mediaAssets={(media_assets || []).map((asset) => ({
          url: asset.media_url || asset.aryeo_url || '',
          type: asset.type,
        }))}
      />

      {/* Details Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Job Info */}
        <div className="rounded-lg border border-neutral-200 bg-white p-6">
          <h2 className="mb-4 font-semibold text-neutral-900">Job Details</h2>

          <div className="space-y-4">
            {listing.scheduled_at && (
              <div className="flex items-start gap-3">
                <Calendar className="mt-0.5 h-5 w-5 text-neutral-400" />
                <div>
                  <p className="text-sm text-neutral-600">Scheduled</p>
                  <p className="font-medium text-neutral-900">
                    {new Date(listing.scheduled_at).toLocaleString()}
                  </p>
                </div>
              </div>
            )}

            {listing.delivered_at && (
              <div className="flex items-start gap-3">
                <CheckCircle className="mt-0.5 h-5 w-5 text-green-500" />
                <div>
                  <p className="text-sm text-neutral-600">Delivered</p>
                  <p className="font-medium text-neutral-900">
                    {new Date(listing.delivered_at).toLocaleString()}
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3">
              <MapPin className="mt-0.5 h-5 w-5 text-neutral-400" />
              <div>
                <p className="text-sm text-neutral-600">Property</p>
                <p className="font-medium text-neutral-900">
                  {listing.beds} bed, {listing.baths} bath, {listing.sqft?.toLocaleString()} sqft
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Agent Info */}
        <div className="rounded-lg border border-neutral-200 bg-white p-6">
          <h2 className="mb-4 font-semibold text-neutral-900">Client</h2>

          {listing.agent ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-neutral-400" />
                <span className="font-medium text-neutral-900">
                  {listing.agent.name}
                </span>
              </div>
              {listing.agent.email && (
                <p className="text-sm text-neutral-600">{listing.agent.email}</p>
              )}
              {listing.agent.phone && (
                <p className="text-sm text-neutral-600">{listing.agent.phone}</p>
              )}
            </div>
          ) : (
            <p className="text-neutral-500">No agent assigned</p>
          )}
        </div>
      </div>

      {/* Media Assets */}
      {listing.media_assets && listing.media_assets.length > 0 && (
        <div className="rounded-lg border border-neutral-200 bg-white p-6">
          <h2 className="mb-4 font-semibold text-neutral-900">
            Media Assets ({listing.media_assets.length})
          </h2>

          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-8">
            {listing.media_assets
              .filter((m: { type: string }) => m.type === 'photo')
              .slice(0, 16)
              .map((asset: { id: string; media_url: string | null; aryeo_url: string | null; qc_status: string }) => (
                <div
                  key={asset.id}
                  className={`relative aspect-square overflow-hidden rounded-lg ${
                    asset.qc_status === 'rejected'
                      ? 'ring-2 ring-red-500'
                      : asset.qc_status === 'approved'
                        ? 'ring-2 ring-green-500'
                        : ''
                  }`}
                >
                  <img
                    src={asset.media_url || asset.aryeo_url || ''}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Tasks and Notes */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Tasks */}
        <JobTasksClient listingId={listing.id} />

        {/* Notes */}
        <JobNotesClient listingId={listing.id} />
      </div>

      {/* Event History */}
      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        <h2 className="mb-4 font-semibold text-neutral-900">Activity Log</h2>

        {events && events.length > 0 ? (
          <div className="space-y-3">
            {events.map((event) => (
              <div key={event.id} className="flex items-start gap-3">
                <div className="mt-1 h-2 w-2 rounded-full bg-neutral-300" />
                <div>
                  <p className="text-sm text-neutral-900">
                    {event.event_type.replace('_', ' ')}
                    {event.new_value && (
                      <span className="text-neutral-500">
                        {' '}
                        - {JSON.stringify(event.new_value)}
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {new Date(event.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-neutral-500">No activity recorded</p>
        )}
      </div>
    </div>
  )
}
