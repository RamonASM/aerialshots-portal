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
  Server,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

// Force dynamic rendering - admin routes require authentication
export const dynamic = 'force-dynamic'

// Allowed partner emails - same list as in Clerk webhook and admin layout
const ALLOWED_PARTNER_EMAILS = [
  'ramon@aerialshots.media',
  'alex@aerialshots.media',
  'test@aerialshots.media', // TEMPORARY: For testing without auth
]

export default async function TeamOverviewPage() {
  let user
  try {
    user = await currentUser()
  } catch (error) {
    console.error('Clerk currentUser() error:', error)
    // TEMPORARY: Don't redirect, allow testing without auth
  }

  // TEMPORARY: Allow access without authentication for testing
  const userEmail = user?.emailAddresses?.[0]?.emailAddress?.toLowerCase() || 'test@aerialshots.media'

  let supabase
  try {
    supabase = createAdminClient()
  } catch (error) {
    console.error('Supabase client error:', error)
    redirect('/sign-in/partner?error=db_error')
  }

  // Check if user is a partner - wrap in try-catch for robustness
  let partner = null
  let partnerError = null
  try {
    const result = await supabase
      .from('partners')
      .select('*')
      .eq('email', userEmail)
      .maybeSingle()
    partner = result.data
    partnerError = result.error
  } catch (error) {
    console.error('Partner query exception in team page:', error)
  }

  if (partnerError) {
    console.error('Partner query error in team page:', {
      error: partnerError,
      code: partnerError?.code,
      message: partnerError?.message,
      details: partnerError?.details,
      hint: partnerError?.hint,
      userEmail,
    })
  }

  // Generate fallback name for use in fallbacks
  const userName = user?.firstName && user?.lastName
    ? `${user.firstName} ${user.lastName}`
    : user?.firstName || userEmail.split('@')[0]

  // Handle case where partner record doesn't exist
  let partnerData = partner
  if (!partner) {
    // Check if this email is an allowed partner email
    const isAllowedPartner = ALLOWED_PARTNER_EMAILS.includes(userEmail)

    if (isAllowedPartner) {
      // Partner record doesn't exist but email is allowed - create it
      console.log(`[Team Page] Creating partner record for allowed email: ${userEmail}`)

      try {
        const { data: newPartner, error: createError } = await supabase
          .from('partners')
          .insert({
            name: userName,
            email: userEmail,
            clerk_user_id: user?.id || 'test-user',
            is_active: true,
          })
          .select('*')
          .single()

        if (createError) {
          console.error('[Team Page] Failed to create partner:', createError)
          // Use fallback partner data so page can still render
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          partnerData = { name: userName, email: userEmail } as any
        } else if (newPartner) {
          console.log(`[Team Page] Created partner record: ${newPartner.id}`)
          partnerData = newPartner
        }
      } catch (error) {
        console.error('[Team Page] Partner insert exception:', error)
        // Use fallback partner data so page can still render
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        partnerData = { name: userName, email: userEmail } as any
      }
    } else {
      // Not an allowed partner email - redirect to sign-in
      console.log(`[Team Page] User ${userEmail} is not a partner, redirecting to sign-in`)
      redirect('/sign-in')
    }
  }

  // Get team stats (wrapped in try-catch to prevent page crashes)
  let staffCount = 0
  try {
    const { count } = await supabase
      .from('staff')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)
    staffCount = count || 0
  } catch (error) {
    console.error('Error fetching staff count:', error)
  }

  const quickLinks = [
    {
      title: 'StashDR Processing',
      description: 'HDR photo processing pipeline and queue',
      href: '/admin/team/processing',
      icon: Server,
      color: 'bg-gradient-to-br from-violet-500 to-purple-600',
    },
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
          Welcome, {partnerData?.name?.split(' ')[0] || 'Partner'}
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
