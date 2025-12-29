import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ScheduleForm } from './ScheduleForm'

interface PageProps {
  params: Promise<{ token: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { token } = await params
  const supabase = await createClient()

  const { data: shareLink } = await supabase
    .from('share_links')
    .select(`
      listing:listings(address, city, state),
      agent:agents(name)
    `)
    .eq('share_token', token)
    .eq('link_type', 'schedule')
    .single()

  if (!shareLink?.listing) {
    return { title: 'Schedule Photo Shoot' }
  }

  const listing = shareLink.listing as { address: string; city: string; state: string }
  const agent = shareLink.agent as { name: string } | null

  return {
    title: `Schedule Photo Shoot - ${listing.address}`,
    description: `Select your available times for the property photo shoot at ${listing.address}, ${listing.city}, ${listing.state}${agent ? ` with ${agent.name}` : ''}.`,
    robots: { index: false, follow: false },
  }
}

export default async function SchedulePage({ params }: PageProps) {
  const { token } = await params
  const supabase = await createClient()

  // Validate the share link
  const { data: shareLink, error } = await supabase
    .from('share_links')
    .select(`
      id,
      share_token,
      link_type,
      client_name,
      client_email,
      expires_at,
      is_active,
      listing:listings(
        id, address, city, state, zip,
        beds, baths, sqft,
        scheduled_at
      ),
      agent:agents(
        id, name, email, phone,
        logo_url, headshot_url, brand_color
      )
    `)
    .eq('share_token', token)
    .eq('link_type', 'schedule')
    .single()

  if (error || !shareLink) {
    notFound()
  }

  // Check if link is active and not expired
  if (!shareLink.is_active) {
    return <ExpiredLinkPage message="This scheduling link is no longer active." />
  }

  if (shareLink.expires_at && new Date(shareLink.expires_at) < new Date()) {
    return <ExpiredLinkPage message="This scheduling link has expired." />
  }

  // Fetch portal settings for branding
  let portalSettings = null
  if (shareLink.agent) {
    const agent = shareLink.agent as { id: string }
    const { data: settings } = await supabase
      .from('portal_settings')
      .select('*')
      .eq('agent_id', agent.id)
      .single()
    portalSettings = settings
  }

  // Check if schedule already submitted
  const { data: existingSchedule } = await supabase
    .from('seller_schedules')
    .select('*')
    .eq('share_link_id', shareLink.id)
    .single()

  const listing = shareLink.listing as {
    id: string
    address: string
    city: string
    state: string
    zip: string
    beds: number | null
    baths: number | null
    sqft: number | null
    scheduled_at: string | null
  }

  const agent = shareLink.agent as {
    id: string
    name: string
    email: string
    phone: string | null
    logo_url: string | null
    headshot_url: string | null
    brand_color: string
  } | null

  const brandColor = portalSettings?.primary_color || agent?.brand_color || '#0066FF'

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <header
        className="bg-white border-b border-neutral-200 px-4 py-4"
        style={{ borderBottomColor: brandColor }}
      >
        <div className="max-w-lg mx-auto flex items-center gap-4">
          {agent?.logo_url ? (
            <img
              src={agent.logo_url}
              alt={agent.name}
              className="h-10 w-auto object-contain"
            />
          ) : agent?.headshot_url ? (
            <img
              src={agent.headshot_url}
              alt={agent.name}
              className="h-10 w-10 rounded-full object-cover"
            />
          ) : null}
          <div>
            <h1 className="text-lg font-semibold text-neutral-900">
              Schedule Your Photo Shoot
            </h1>
            {agent && (
              <p className="text-sm text-neutral-500">with {agent.name}</p>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-lg mx-auto px-4 py-6">
        {/* Property Info Card */}
        <div className="bg-white rounded-xl border border-neutral-200 p-4 mb-6">
          <h2 className="font-medium text-neutral-900 mb-1">{listing.address}</h2>
          <p className="text-sm text-neutral-500">
            {listing.city}, {listing.state} {listing.zip}
          </p>
          {(listing.beds || listing.baths || listing.sqft) && (
            <div className="flex gap-4 mt-2 text-sm text-neutral-600">
              {listing.beds && <span>{listing.beds} beds</span>}
              {listing.baths && <span>{listing.baths} baths</span>}
              {listing.sqft && <span>{listing.sqft.toLocaleString()} sqft</span>}
            </div>
          )}
        </div>

        {/* Already Scheduled Notice */}
        {listing.scheduled_at && (
          <div
            className="rounded-xl p-4 mb-6"
            style={{ backgroundColor: `${brandColor}10` }}
          >
            <p className="font-medium text-neutral-900">Photo Shoot Scheduled</p>
            <p className="text-sm text-neutral-600 mt-1">
              Your photo shoot is scheduled for{' '}
              <strong>
                {new Date(listing.scheduled_at).toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </strong>
            </p>
          </div>
        )}

        {/* Schedule Form or Confirmation */}
        {existingSchedule?.status === 'confirmed' ? (
          <ScheduleConfirmed schedule={existingSchedule} brandColor={brandColor} />
        ) : existingSchedule?.status === 'submitted' ? (
          <SchedulePending schedule={existingSchedule} brandColor={brandColor} />
        ) : (
          <ScheduleForm
            shareLinkId={shareLink.id}
            listingId={listing.id}
            defaultName={shareLink.client_name || ''}
            defaultEmail={shareLink.client_email || ''}
            brandColor={brandColor}
            existingSchedule={existingSchedule}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-200 bg-white py-4 mt-auto">
        <div className="max-w-lg mx-auto px-4 text-center">
          <p className="text-xs text-neutral-400">
            Powered by Aerial Shots Media
          </p>
        </div>
      </footer>
    </div>
  )
}

function ExpiredLinkPage({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center px-4">
      <div className="max-w-md text-center">
        <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8 text-neutral-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h1 className="text-xl font-semibold text-neutral-900 mb-2">
          Link Expired
        </h1>
        <p className="text-neutral-500 mb-6">{message}</p>
        <p className="text-sm text-neutral-400">
          Please contact your real estate agent for a new scheduling link.
        </p>
      </div>
    </div>
  )
}

function ScheduleConfirmed({
  schedule,
  brandColor,
}: {
  schedule: {
    selected_slot: { date: string; start_time: string; end_time: string } | null
    confirmed_at: string | null
  }
  brandColor: string
}) {
  const slot = schedule.selected_slot

  return (
    <div className="bg-white rounded-xl border border-neutral-200 p-6 text-center">
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
        style={{ backgroundColor: `${brandColor}20` }}
      >
        <svg
          className="w-8 h-8"
          style={{ color: brandColor }}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
      </div>
      <h2 className="text-xl font-semibold text-neutral-900 mb-2">
        Photo Shoot Confirmed!
      </h2>
      {slot && (
        <p className="text-neutral-600 mb-4">
          Your photo shoot is scheduled for{' '}
          <strong>
            {new Date(slot.date).toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}{' '}
            at {slot.start_time}
          </strong>
        </p>
      )}
      <p className="text-sm text-neutral-500">
        You will receive a confirmation email with all the details.
        Please ensure the property is ready for photography.
      </p>
    </div>
  )
}

function SchedulePending({
  schedule,
  brandColor,
}: {
  schedule: {
    available_slots: unknown[]
    submitted_at: string | null
  }
  brandColor: string
}) {
  const slotsCount = schedule.available_slots?.length || 0

  return (
    <div className="bg-white rounded-xl border border-neutral-200 p-6 text-center">
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
        style={{ backgroundColor: `${brandColor}20` }}
      >
        <svg
          className="w-8 h-8"
          style={{ color: brandColor }}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>
      <h2 className="text-xl font-semibold text-neutral-900 mb-2">
        Availability Submitted
      </h2>
      <p className="text-neutral-600 mb-4">
        You've selected <strong>{slotsCount} time slot{slotsCount !== 1 ? 's' : ''}</strong>.
        We're working on confirming your photo shoot.
      </p>
      <p className="text-sm text-neutral-500">
        You will receive a confirmation email once the final time is set.
      </p>
    </div>
  )
}
