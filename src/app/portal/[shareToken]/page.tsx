import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PortalContent } from './PortalContent'

interface PageProps {
  params: Promise<{ shareToken: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { shareToken } = await params
  const supabase = await createClient()

  const { data: shareLink } = await supabase
    .from('share_links')
    .select(`
      listing:listings(address, city, state),
      agent:agents(name)
    `)
    .eq('share_token', shareToken)
    .single()

  if (!shareLink?.listing) {
    return { title: 'Media Portal' }
  }

  const listing = shareLink.listing as { address: string; city: string; state: string }
  const agent = shareLink.agent as { name: string } | null

  return {
    title: `Your Photos - ${listing.address}`,
    description: `View and download your property photos for ${listing.address}, ${listing.city}, ${listing.state}${agent ? ` from ${agent.name}` : ''}.`,
    robots: { index: false, follow: false },
  }
}

export default async function PortalPage({ params }: PageProps) {
  const { shareToken } = await params
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
      access_count,
      listing:listings(
        id, address, city, state, zip,
        beds, baths, sqft, price,
        ops_status, scheduled_at, delivered_at
      ),
      agent:agents(
        id, name, email, phone,
        logo_url, headshot_url, brand_color, bio
      )
    `)
    .eq('share_token', shareToken)
    .single()

  if (error || !shareLink) {
    notFound()
  }

  // Check if link is active and not expired
  if (!shareLink.is_active) {
    return <ExpiredLinkPage message="This link is no longer active." />
  }

  if (shareLink.expires_at && new Date(shareLink.expires_at) < new Date()) {
    return <ExpiredLinkPage message="This link has expired." />
  }

  // Update access count
  await supabase
    .from('share_links')
    .update({
      access_count: (shareLink.access_count || 0) + 1,
      last_accessed_at: new Date().toISOString(),
    })
    .eq('id', shareLink.id)

  const listing = shareLink.listing as {
    id: string
    address: string
    city: string
    state: string
    zip: string
    beds: number | null
    baths: number | null
    sqft: number | null
    price: number | null
    ops_status: string
    scheduled_at: string | null
    delivered_at: string | null
  }

  const agent = shareLink.agent as {
    id: string
    name: string
    email: string
    phone: string | null
    logo_url: string | null
    headshot_url: string | null
    brand_color: string
    bio: string | null
  } | null

  // Fetch portal settings for branding
  let portalSettings = null
  if (agent) {
    const { data: settings } = await supabase
      .from('portal_settings')
      .select('*')
      .eq('agent_id', agent.id)
      .single()
    portalSettings = settings
  }

  // Fetch media assets
  const { data: mediaAssets } = await supabase
    .from('media_assets')
    .select('*')
    .eq('listing_id', listing.id)
    .order('sort_order', { ascending: true })

  // Get status history for timeline
  const { data: statusHistory } = await supabase
    .from('job_events')
    .select('*')
    .eq('listing_id', listing.id)
    .order('created_at', { ascending: true })

  const brandColor = portalSettings?.primary_color || agent?.brand_color || '#0066FF'
  const showPoweredBy = portalSettings?.show_powered_by ?? true

  return (
    <PortalContent
      listing={listing}
      agent={agent}
      mediaAssets={mediaAssets || []}
      statusHistory={statusHistory || []}
      portalSettings={portalSettings}
      brandColor={brandColor}
      showPoweredBy={showPoweredBy}
      clientName={shareLink.client_name}
      clientEmail={shareLink.client_email}
      shareLinkId={shareLink.id}
      welcomeMessage={portalSettings?.welcome_message ?? null}
    />
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
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
        </div>
        <h1 className="text-xl font-semibold text-neutral-900 mb-2">
          Link Unavailable
        </h1>
        <p className="text-neutral-500 mb-6">{message}</p>
        <p className="text-sm text-neutral-400">
          Please contact your real estate agent for a new link.
        </p>
      </div>
    </div>
  )
}
