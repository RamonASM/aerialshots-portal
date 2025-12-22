import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { CampaignDashboard } from './CampaignDashboard'
import type { Metadata } from 'next'

interface PageProps {
  params: Promise<{ campaignId: string }>
}

async function getCampaign(campaignId: string) {
  const supabase = createAdminClient()

  const { data: campaign, error } = await supabase
    .from('listing_campaigns')
    .select(`
      *,
      listing:listings(
        id,
        address,
        city,
        state,
        zip,
        beds,
        baths,
        sqft,
        price,
        lat,
        lng,
        media_assets(*)
      ),
      agent:agents(
        id,
        name,
        email,
        headshot_url,
        logo_url,
        brand_color,
        instagram_url
      ),
      carousels:listing_carousels(*)
    `)
    .eq('id', campaignId)
    .single()

  if (error) {
    console.error('Error fetching campaign:', error)
    return null
  }

  return campaign
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { campaignId } = await params
  const campaign = await getCampaign(campaignId)

  if (!campaign) {
    return {
      title: 'Campaign Not Found | Aerial Shots Media',
    }
  }

  return {
    title: `${campaign.name || 'Campaign'} | ListingLaunch | Aerial Shots Media`,
    description: `Create marketing campaign for ${campaign.name}`,
  }
}

export default async function CampaignPage({ params }: PageProps) {
  const { campaignId } = await params
  const campaign = await getCampaign(campaignId)

  if (!campaign || !campaign.listing || !campaign.agent) {
    notFound()
  }

  // Fetch agent's credit balance
  const supabase = createAdminClient()
  const { data: agentData } = await supabase
    .from('agents')
    .select('credit_balance')
    .eq('id', campaign.agent.id)
    .single()

  const creditBalance = agentData?.credit_balance || 0

  // Type assertion since we've verified above that listing and agent exist
  return (
    <CampaignDashboard
      campaign={campaign as Parameters<typeof CampaignDashboard>[0]['campaign']}
      creditBalance={creditBalance}
    />
  )
}
