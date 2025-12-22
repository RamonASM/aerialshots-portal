import { notFound, redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { CarouselsGallery } from './CarouselsGallery'
import type { Metadata } from 'next'

interface PageProps {
  params: Promise<{ campaignId: string }>
}

async function getCampaignWithCarousels(campaignId: string) {
  const supabase = createAdminClient()

  const { data: campaign, error } = await supabase
    .from('listing_campaigns')
    .select(`
      id,
      name,
      status,
      carousel_types,
      listing:listings(
        id,
        address,
        city,
        state,
        media_assets(*)
      ),
      agent:agents(
        id,
        name,
        headshot_url,
        logo_url,
        brand_color
      ),
      carousels:listing_carousels(
        id,
        carousel_type,
        slides,
        caption,
        hashtags,
        render_status,
        rendered_image_urls
      )
    `)
    .eq('id', campaignId)
    .single()

  if (error) {
    console.error('Error fetching campaign:', error)
    return null
  }

  return campaign
}

async function checkInstagramConnection(agentId: string) {
  const supabase = createAdminClient()

  const { data } = await supabase
    .from('instagram_connections')
    .select('id, status, token_expires_at')
    .eq('agent_id', agentId)
    .eq('status', 'active')
    .single()

  if (!data) return false

  // Check if token is expired
  if (data.token_expires_at && new Date(data.token_expires_at) < new Date()) {
    return false
  }

  return true
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { campaignId } = await params
  const campaign = await getCampaignWithCarousels(campaignId)

  if (!campaign) {
    return {
      title: 'Campaign Not Found | Aerial Shots Media',
    }
  }

  return {
    title: `Carousels | ${campaign.name} | ListingLaunch`,
    description: 'Review and download your generated carousel content',
  }
}

export default async function CarouselsPage({ params }: PageProps) {
  const { campaignId } = await params
  const campaign = await getCampaignWithCarousels(campaignId)

  if (!campaign) {
    notFound()
  }

  // Redirect if not completed
  if (campaign.status !== 'completed' && campaign.status !== 'published') {
    redirect(`/campaigns/${campaignId}`)
  }

  const listing = campaign.listing as {
    id: string
    address: string
    city: string | null
    state: string | null
    media_assets: Array<{
      id: string
      type: string
      category: string | null
      aryeo_url: string
    }>
  }

  const agent = campaign.agent as {
    id: string
    name: string
    headshot_url: string | null
    logo_url: string | null
    brand_color: string | null
  }

  // Check if agent has active Instagram connection
  const hasInstagramConnection = await checkInstagramConnection(agent.id)

  // Fetch credit balance
  const supabase = createAdminClient()
  const { data: agentData } = await supabase
    .from('agents')
    .select('credit_balance')
    .eq('id', agent.id)
    .single()

  const creditBalance = agentData?.credit_balance || 0

  return (
    <CarouselsGallery
      campaignId={campaign.id}
      campaignName={campaign.name || 'Campaign'}
      listingAddress={`${listing.address}, ${listing.city || ''}, ${listing.state || ''}`}
      carousels={campaign.carousels || []}
      mediaAssets={listing.media_assets}
      agent={agent}
      hasInstagramConnection={hasInstagramConnection}
      creditBalance={creditBalance}
    />
  )
}
