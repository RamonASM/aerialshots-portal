import { notFound, redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { BlogEditor } from './BlogEditor'
import type { Metadata } from 'next'

interface PageProps {
  params: Promise<{ campaignId: string }>
}

async function getCampaignWithBlog(campaignId: string) {
  const supabase = createAdminClient()

  const { data: campaign, error } = await supabase
    .from('listing_campaigns')
    .select(`
      id,
      name,
      status,
      blog_post_content,
      listing:listings(
        id,
        address,
        city,
        state
      ),
      agent:agents(
        id,
        name,
        email,
        phone
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

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { campaignId } = await params
  const campaign = await getCampaignWithBlog(campaignId)

  if (!campaign) {
    return {
      title: 'Campaign Not Found | Aerial Shots Media',
    }
  }

  return {
    title: `Blog Post | ${campaign.name} | ListingLaunch`,
    description: 'Generate and edit SEO blog content for your listing',
  }
}

export default async function BlogPage({ params }: PageProps) {
  const { campaignId } = await params
  const campaign = await getCampaignWithBlog(campaignId)

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
  }

  const agent = campaign.agent as {
    id: string
    name: string
    email: string | null
    phone: string | null
  }

  // Parse blog content if it exists
  const blogContent = campaign.blog_post_content as {
    title?: string
    metaDescription?: string
    slug?: string
    sections?: Array<{ title: string; content: string; keywords?: string[] }>
    seoKeywords?: string[]
    estimatedReadTime?: number
  } | null

  // Fetch credit balance
  const supabase = createAdminClient()
  const { data: agentData } = await supabase
    .from('agents')
    .select('credit_balance')
    .eq('id', agent.id)
    .single()

  const creditBalance = agentData?.credit_balance || 0

  return (
    <BlogEditor
      campaignId={campaign.id}
      campaignName={campaign.name || 'Campaign'}
      listingAddress={`${listing.address}, ${listing.city || ''}, ${listing.state || ''}`}
      agentName={agent.name}
      initialBlog={blogContent}
      creditBalance={creditBalance}
    />
  )
}
