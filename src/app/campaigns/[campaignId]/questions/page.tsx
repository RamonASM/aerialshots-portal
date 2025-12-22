import { notFound, redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { QuestionsFlow } from './QuestionsFlow'
import type { Metadata } from 'next'

interface PageProps {
  params: Promise<{ campaignId: string }>
}

async function getCampaign(campaignId: string) {
  const supabase = createAdminClient()

  const { data: campaign, error } = await supabase
    .from('listing_campaigns')
    .select(`
      id,
      name,
      status,
      generated_questions,
      agent_answers,
      neighborhood_data,
      listing:listings(
        id,
        address,
        city,
        state
      ),
      agent:agents(
        id,
        name,
        headshot_url
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
  const campaign = await getCampaign(campaignId)

  if (!campaign) {
    return {
      title: 'Campaign Not Found | Aerial Shots Media',
    }
  }

  return {
    title: `Questions | ${campaign.name} | ListingLaunch`,
    description: 'Answer personalized questions to create engaging content',
  }
}

export default async function QuestionsPage({ params }: PageProps) {
  const { campaignId } = await params
  const campaign = await getCampaign(campaignId)

  if (!campaign) {
    notFound()
  }

  // Redirect if not in questions status
  if (campaign.status !== 'questions') {
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
    headshot_url: string | null
  }

  // Fetch credit balance
  const supabase = createAdminClient()
  const { data: agentData } = await supabase
    .from('agents')
    .select('credit_balance')
    .eq('id', agent.id)
    .single()

  const creditBalance = agentData?.credit_balance || 0

  return (
    <QuestionsFlow
      campaignId={campaign.id}
      campaignName={campaign.name || 'Campaign'}
      listingAddress={`${listing.address}, ${listing.city || ''}, ${listing.state || ''}`}
      agentName={agent.name}
      agentHeadshotUrl={agent.headshot_url}
      initialQuestions={(campaign.generated_questions as unknown as Array<{ id: string; question: string; context?: string; category?: string; suggestedFollowUp?: string }>) || []}
      previousAnswers={(campaign.agent_answers as unknown as Record<string, string>) || {}}
      creditBalance={creditBalance}
    />
  )
}
