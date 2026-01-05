import { redirect } from 'next/navigation'
import Link from 'next/link'
import { currentUser } from '@clerk/nextjs/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  Users,
  DollarSign,
  Calendar,
  MapPin,
  TrendingUp,
  ArrowRight,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export default async function TeamOverviewPage() {
  const user = await currentUser()

  if (!user?.emailAddresses?.[0]?.emailAddress) {
    redirect('/sign-in/partner')
  }

  const userEmail = user.emailAddresses[0].emailAddress.toLowerCase()
  const supabase = createAdminClient()

  // Check if user is a partner
  const { data: partner } = await supabase
    .from('partners')
    .select('*')
    .eq('email', userEmail)
    .single()

  if (!partner) {
    // Not a partner, redirect to appropriate portal
    redirect('/sign-in')
  }

  // Get team stats
  const { count: staffCount } = await supabase
    .from('staff')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)

  const quickLinks = [
    {
      title: 'Team Payouts',
      description: 'Configure payout splits and view earnings',
      href: '/admin/team/payouts',
      icon: DollarSign,
      color: 'bg-green-500',
    },
    {
      title: 'Availability',
      description: 'Manage team schedules and availability',
      href: '/admin/team/availability',
      icon: Calendar,
      color: 'bg-blue-500',
    },
    {
      title: 'Territories',
      description: 'Assign service areas to team members',
      href: '/admin/team/territories',
      icon: MapPin,
      color: 'bg-purple-500',
    },
    {
      title: 'Capacity',
      description: 'View team workload and capacity',
      href: '/admin/team/capacity',
      icon: TrendingUp,
      color: 'bg-amber-500',
    },
  ]

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div>
        <h1 className="text-[28px] font-semibold tracking-tight text-white">
          Welcome, {partner.name?.split(' ')[0] || 'Partner'}
        </h1>
        <p className="mt-1 text-[15px] text-[#a1a1a6]">
          Manage your team, payouts, and operations.
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card variant="glass">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500">
                <Users className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-[28px] font-semibold text-white">{staffCount ?? 0}</p>
                <p className="text-[13px] text-[#a1a1a6]">Active Team Members</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Links */}
      <div>
        <h2 className="text-[17px] font-semibold text-white mb-4">Quick Actions</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {quickLinks.map((link) => (
            <Link key={link.href} href={link.href}>
              <Card variant="interactive" className="h-full">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${link.color}`}>
                      <link.icon className="h-5 w-5 text-white" />
                    </div>
                    <ArrowRight className="h-5 w-5 text-[#636366]" />
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <CardTitle className="text-[15px] mb-1">{link.title}</CardTitle>
                  <CardDescription>{link.description}</CardDescription>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
