import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import {
  Building,
  Users,
  Gift,
  TrendingUp,
  ArrowRight,
  Star,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get agent with stats
  const { data: agent } = await supabase
    .from('agents')
    .select('*')
    .eq('email', user.email!)
    .single()

  if (!agent) {
    redirect('/login')
  }

  // Get listings count
  const { count: listingsCount } = await supabase
    .from('listings')
    .select('*', { count: 'exact', head: true })
    .eq('agent_id', agent.id)

  // Get leads count
  const { count: leadsCount } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .eq('agent_id', agent.id)
    .eq('status', 'new')

  // Get referrals count
  const { count: referralsCount } = await supabase
    .from('referrals')
    .select('*', { count: 'exact', head: true })
    .eq('referrer_id', agent.id)

  const stats = [
    {
      name: 'Active Listings',
      value: listingsCount ?? 0,
      icon: Building,
      href: '/dashboard/listings',
      color: 'bg-blue-500',
    },
    {
      name: 'New Leads',
      value: leadsCount ?? 0,
      icon: Users,
      href: '/dashboard/leads',
      color: 'bg-green-500',
    },
    {
      name: 'Referrals',
      value: referralsCount ?? 0,
      icon: Gift,
      href: '/dashboard/referrals',
      color: 'bg-purple-500',
    },
    {
      name: 'Credits',
      value: agent.credit_balance ?? 0,
      icon: Star,
      href: '/dashboard/rewards',
      color: 'bg-amber-500',
    },
  ]

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">
          Welcome back, {agent.name?.split(' ')[0] || 'Agent'}!
        </h1>
        <p className="mt-1 text-neutral-600">
          Here's what's happening with your listings and leads.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link
            key={stat.name}
            href={stat.href}
            className="group rounded-lg border border-neutral-200 bg-white p-6 transition-shadow hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-lg ${stat.color}`}
              >
                <stat.icon className="h-5 w-5 text-white" />
              </div>
              <ArrowRight className="h-5 w-5 text-neutral-400 transition-transform group-hover:translate-x-1" />
            </div>
            <p className="mt-4 text-3xl font-bold text-neutral-900">{stat.value}</p>
            <p className="text-sm text-neutral-600">{stat.name}</p>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Referral Program Card */}
        <div className="rounded-lg border border-neutral-200 bg-white p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#ff4533]">
              <Gift className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-neutral-900">Referral Program</h2>
              <p className="text-sm text-neutral-600">Earn credits by referring new clients</p>
            </div>
          </div>

          <div className="mt-4 rounded-lg bg-neutral-50 p-4">
            <p className="text-sm text-neutral-600">Your referral link:</p>
            <code className="mt-1 block overflow-x-auto rounded bg-neutral-100 p-2 text-sm">
              {`${process.env.NEXT_PUBLIC_APP_URL || 'https://app.aerialshots.media'}/ref/${agent.referral_code || agent.id.slice(0, 8)}`}
            </code>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-neutral-900">{agent.credit_balance ?? 0}</p>
              <p className="text-sm text-neutral-600">Available credits</p>
            </div>
            <Button asChild>
              <Link href="/dashboard/referrals">View Details</Link>
            </Button>
          </div>
        </div>

        {/* Profile Completion Card */}
        <div className="rounded-lg border border-neutral-200 bg-white p-6">
          <h2 className="font-semibold text-neutral-900">Complete Your Profile</h2>
          <p className="mt-1 text-sm text-neutral-600">
            A complete profile helps you stand out on property pages.
          </p>

          <div className="mt-4 space-y-3">
            <ProfileItem
              label="Headshot"
              completed={!!agent.headshot_url}
              href="/dashboard/profile"
            />
            <ProfileItem
              label="Bio"
              completed={!!agent.bio}
              href="/dashboard/profile"
            />
            <ProfileItem
              label="Logo"
              completed={!!agent.logo_url}
              href="/dashboard/profile"
            />
            <ProfileItem
              label="Instagram"
              completed={!!agent.instagram_url}
              href="/dashboard/profile"
            />
          </div>

          <Button variant="outline" className="mt-4 w-full" asChild>
            <Link href="/dashboard/profile">Edit Profile</Link>
          </Button>
        </div>
      </div>

      {/* Portfolio Link */}
      <div className="rounded-lg border border-neutral-200 bg-gradient-to-r from-neutral-900 to-neutral-800 p-6 text-white">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold">Your Public Portfolio</h2>
            <p className="mt-1 text-sm text-neutral-300">
              Share your portfolio page with potential clients
            </p>
          </div>
          <Button variant="secondary" asChild>
            <a
              href={`/agents/${agent.slug}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              View Portfolio
              <ArrowRight className="ml-2 h-4 w-4" />
            </a>
          </Button>
        </div>
      </div>
    </div>
  )
}

function ProfileItem({
  label,
  completed,
  href,
}: {
  label: string
  completed: boolean
  href: string
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between rounded-lg p-2 transition-colors hover:bg-neutral-50"
    >
      <div className="flex items-center gap-3">
        <div
          className={`h-2 w-2 rounded-full ${
            completed ? 'bg-green-500' : 'bg-neutral-300'
          }`}
        />
        <span className={completed ? 'text-neutral-600' : 'text-neutral-900'}>
          {label}
        </span>
      </div>
      {completed ? (
        <span className="text-xs text-green-600">Complete</span>
      ) : (
        <span className="text-xs text-neutral-400">Add</span>
      )}
    </Link>
  )
}
