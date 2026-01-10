import { redirect } from 'next/navigation'
import Link from 'next/link'
import { currentUser } from '@clerk/nextjs/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  Building,
  Users,
  Gift,
  Star,
  ArrowRight,
  Copy,
  ExternalLink,
  CheckCircle,
  Circle,
  TrendingUp,
  TrendingDown,
  Minus,
  MessageSquare,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

// Check if auth bypass is enabled
const authBypassEnabled =
  process.env.NEXT_PUBLIC_AUTH_BYPASS === 'true' ||
  process.env.AUTH_BYPASS === 'true'

export default async function DashboardPage() {
  let userEmail: string
  let clerkUserId: string | null = null
  let firstName: string | null = null
  let lastName: string | null = null

  if (authBypassEnabled) {
    // Use bypass identity
    userEmail = process.env.AUTH_BYPASS_EMAIL || 'bypass@aerialshots.media'
    clerkUserId = process.env.AUTH_BYPASS_ID || 'bypass-user'
    firstName = 'Bypass'
    lastName = 'User'
  } else {
    let user
    try {
      user = await currentUser()
    } catch (error) {
      console.error('Clerk currentUser() error:', error)
      redirect('/sign-in?error=clerk_error')
    }

    if (!user?.emailAddresses?.[0]?.emailAddress) {
      redirect('/sign-in')
    }

    userEmail = user.emailAddresses[0].emailAddress.toLowerCase()
    clerkUserId = user.id
    firstName = user.firstName
    lastName = user.lastName
  }

  let supabase
  try {
    supabase = createAdminClient()
  } catch (error) {
    console.error('Supabase client error:', error)
    redirect('/sign-in?error=db_error')
  }

  // Get agent with stats
  const { data: agent, error: agentError } = await supabase
    .from('agents')
    .select('*')
    .eq('email', userEmail)
    .maybeSingle()

  if (agentError) {
    console.error('Agent query error:', agentError)
    redirect('/sign-in?error=query_error')
  }

  if (!agent) {
    // Create agent record if it doesn't exist
    const slug = userEmail.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '-')
    const { data: newAgent, error } = await supabase
      .from('agents')
      .insert({
        email: userEmail,
        name: `${firstName || ''} ${lastName || ''}`.trim() || userEmail.split('@')[0],
        slug: `${slug}-${Date.now().toString(36)}`,
        clerk_user_id: clerkUserId,
      })
      .select()
      .single()

    if (error || !newAgent) {
      console.error('Agent creation failed:', error)
      redirect('/sign-in?error=agent_creation_failed')
    }

    // Use the newly created agent
    redirect('/dashboard')
  }

  // Get current month date range
  const now = new Date()
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString()

  // Get listings count (current)
  const { count: listingsCount } = await supabase
    .from('listings')
    .select('*', { count: 'exact', head: true })
    .eq('agent_id', agent.id)

  // Get new leads count (current)
  const { count: leadsCount } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .eq('agent_id', agent.id)
    .eq('status', 'new')

  // Get this month's leads
  const { count: thisMonthLeads } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .eq('agent_id', agent.id)
    .gte('created_at', thisMonthStart)

  // Get last month's leads
  const { count: lastMonthLeads } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .eq('agent_id', agent.id)
    .gte('created_at', lastMonthStart)
    .lte('created_at', lastMonthEnd)

  // Get referrals count
  const { count: referralsCount } = await supabase
    .from('referrals')
    .select('*', { count: 'exact', head: true })
    .eq('referrer_id', agent.id)

  // Get this month's referrals
  const { count: thisMonthReferrals } = await supabase
    .from('referrals')
    .select('*', { count: 'exact', head: true })
    .eq('referrer_id', agent.id)
    .gte('created_at', thisMonthStart)

  // Get unread messages count (messages on agent's listings that are from sellers)
  const { data: agentListings } = await supabase
    .from('listings')
    .select('id')
    .eq('agent_id', agent.id)

  const listingIds = agentListings?.map(l => l.id) || []

  let unreadMessagesCount = 0
  if (listingIds.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { count } = await (supabase as any)
      .from('client_messages')
      .select('*', { count: 'exact', head: true })
      .in('listing_id', listingIds)
      .eq('sender_type', 'seller')
      .is('read_at', null) as { count: number | null }
    unreadMessagesCount = count ?? 0
  }

  // Calculate trends
  const calculateTrend = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0
    return Math.round(((current - previous) / previous) * 100)
  }

  const leadsTrend = calculateTrend(thisMonthLeads ?? 0, lastMonthLeads ?? 0)

  const stats = [
    {
      name: 'Active Listings',
      value: listingsCount ?? 0,
      icon: Building,
      href: '/dashboard/listings',
      trend: null, // No trend for listings
    },
    {
      name: 'New Leads',
      value: leadsCount ?? 0,
      icon: Users,
      href: '/dashboard/leads',
      trend: leadsTrend,
      trendLabel: 'vs last month',
    },
    {
      name: 'Referrals',
      value: referralsCount ?? 0,
      icon: Gift,
      href: '/dashboard/referrals',
      trend: thisMonthReferrals ?? 0,
      trendLabel: 'this month',
      trendType: 'count',
    },
    {
      name: 'Credits',
      value: agent.credit_balance ?? 0,
      icon: Star,
      href: '/dashboard/rewards',
      trend: null,
    },
    {
      name: 'Messages',
      value: unreadMessagesCount,
      icon: MessageSquare,
      href: '/dashboard/orders',
      trend: null,
      highlight: unreadMessagesCount > 0,
    },
  ]

  const profileItems = [
    { label: 'Headshot', completed: !!agent.headshot_url },
    { label: 'Bio', completed: !!agent.bio },
    { label: 'Logo', completed: !!agent.logo_url },
    { label: 'Instagram', completed: !!agent.instagram_url },
  ]

  const completedCount = profileItems.filter((item) => item.completed).length
  const completionPercent = Math.round((completedCount / profileItems.length) * 100)

  const referralUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.aerialshots.media'}/ref/${agent.referral_code || agent.id.slice(0, 8)}`

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div>
        <h1 className="text-[28px] font-semibold tracking-tight text-white">
          Welcome back, {agent.name?.split(' ')[0] || 'Agent'}
        </h1>
        <p className="mt-1 text-[15px] text-[#a1a1a6]">
          Here's what's happening with your listings and leads.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {stats.map((stat) => (
          <Link key={stat.name} href={stat.href}>
            <Card variant="interactive" className={`h-full ${stat.highlight ? 'ring-1 ring-blue-500/50' : ''}`}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${stat.highlight ? 'bg-blue-500' : 'bg-[#0077ff]/10'}`}>
                    <stat.icon className={`h-5 w-5 ${stat.highlight ? 'text-white' : 'text-[#0077ff]'}`} />
                  </div>
                  {stat.highlight && (
                    <span className="px-2 py-0.5 text-[11px] font-medium bg-blue-500 text-white rounded-full">
                      New
                    </span>
                  )}
                  {!stat.highlight && (
                    <ArrowRight className="h-5 w-5 text-[#636366] group-hover:text-white transition-colors" />
                  )}
                </div>
                <p className="mt-4 text-[32px] font-semibold tracking-tight text-white">
                  {stat.value}
                </p>
                <div className="flex items-center justify-between">
                  <p className="text-[13px] text-[#a1a1a6]">{stat.name}</p>

                  {/* Trend Indicator */}
                  {stat.trend !== null && stat.trendType !== 'count' && (
                    <div
                      className={`flex items-center gap-1 text-[11px] font-medium ${
                        stat.trend > 0
                          ? 'text-green-400'
                          : stat.trend < 0
                            ? 'text-red-400'
                            : 'text-[#636366]'
                      }`}
                    >
                      {stat.trend > 0 ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : stat.trend < 0 ? (
                        <TrendingDown className="h-3 w-3" />
                      ) : (
                        <Minus className="h-3 w-3" />
                      )}
                      {stat.trend > 0 ? '+' : ''}
                      {stat.trend}%
                    </div>
                  )}

                  {stat.trend !== null && stat.trendType === 'count' && (
                    <div className="flex items-center gap-1 text-[11px] font-medium text-[#0077ff]">
                      +{stat.trend} {stat.trendLabel}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Referral Program Card */}
        <Card variant="glass">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0077ff]">
                <Gift className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-[17px]">Referral Program</CardTitle>
                <CardDescription>Earn credits by referring new clients</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl bg-white/5 p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[13px] text-[#636366]">Your referral link</p>
                <Button variant="ghost" size="sm" className="h-7 px-2">
                  <Copy className="h-3.5 w-3.5 mr-1.5" />
                  Copy
                </Button>
              </div>
              <code className="block text-[13px] text-[#a1a1a6] truncate">
                {referralUrl}
              </code>
            </div>

            <div className="flex items-center justify-between pt-2">
              <div>
                <p className="text-[28px] font-semibold text-white">{agent.credit_balance ?? 0}</p>
                <p className="text-[13px] text-[#636366]">Available credits</p>
              </div>
              <Button asChild>
                <Link href="/dashboard/referrals">
                  View Details
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Profile Completion Card */}
        <Card variant="glass">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-[17px]">Complete Your Profile</CardTitle>
                <CardDescription>Stand out on property pages</CardDescription>
              </div>
              <div className="text-right">
                <p className="text-[22px] font-semibold text-white">{completionPercent}%</p>
                <p className="text-[11px] text-[#636366] uppercase tracking-wide">Complete</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {profileItems.map((item) => (
              <Link
                key={item.label}
                href="/dashboard/profile"
                className="flex items-center justify-between rounded-lg p-3 transition-colors hover:bg-white/5"
              >
                <div className="flex items-center gap-3">
                  {item.completed ? (
                    <CheckCircle className="h-5 w-5 text-green-400" />
                  ) : (
                    <Circle className="h-5 w-5 text-[#636366]" />
                  )}
                  <span className={item.completed ? 'text-[#636366]' : 'text-white'}>
                    {item.label}
                  </span>
                </div>
                {item.completed ? (
                  <span className="text-[11px] text-green-400 uppercase tracking-wide">Done</span>
                ) : (
                  <span className="text-[11px] text-[#0077ff] uppercase tracking-wide">Add</span>
                )}
              </Link>
            ))}

            <Button variant="outline" className="w-full mt-4" asChild>
              <Link href="/dashboard/profile">Edit Profile</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Portfolio Link */}
      <Card variant="glass" className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-[#0077ff]/10 to-transparent pointer-events-none" />
        <CardContent className="relative py-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-[17px] font-semibold text-white">Your Public Portfolio</h2>
              <p className="mt-1 text-[15px] text-[#a1a1a6]">
                Share your portfolio page with potential clients
              </p>
            </div>
            <Button asChild>
              <a
                href={`/agents/${agent.slug}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                View Portfolio
                <ExternalLink className="ml-2 h-4 w-4" />
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
