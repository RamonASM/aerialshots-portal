import { redirect } from 'next/navigation'
import Link from 'next/link'
import { currentUser } from '@clerk/nextjs/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  Home,
  User,
  Building,
  Lightbulb,
  Users,
  Gift,
  Award,
  Sparkles,
  BookOpen,
  LogOut,
  Settings,
  Camera,
  ChevronRight,
  ShoppingCart,
  Plus,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DashboardNav } from '@/components/dashboard/DashboardNav'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Orders', href: '/dashboard/orders', icon: ShoppingCart },
  { name: 'Listings', href: '/dashboard/listings', icon: Building },
  { name: 'Leads', href: '/dashboard/leads', icon: Users, badge: 'leads' },
  { name: 'AI Tools', href: '/dashboard/ai-tools', icon: Sparkles },
  { name: 'Storywork', href: '/dashboard/storywork', icon: BookOpen },
  { name: 'Referrals', href: '/dashboard/referrals', icon: Gift },
  { name: 'Rewards', href: '/dashboard/rewards', icon: Award },
]

const secondaryNav = [
  { name: 'Profile', href: '/dashboard/profile', icon: User },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
]

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  let user
  try {
    user = await currentUser()
  } catch (error) {
    console.error('Clerk currentUser() error in layout:', error)
    redirect('/sign-in?error=clerk_error')
  }

  if (!user?.emailAddresses?.[0]?.emailAddress) {
    redirect('/sign-in')
  }

  const userEmail = user.emailAddresses[0].emailAddress.toLowerCase()

  let supabase
  try {
    supabase = createAdminClient()
  } catch (error) {
    console.error('Supabase client error in layout:', error)
    redirect('/sign-in?error=db_error')
  }

  // Get agent info
  const { data: agent, error: agentError } = await supabase
    .from('agents')
    .select('*')
    .eq('email', userEmail)
    .maybeSingle()

  if (agentError) {
    console.error('Agent query error in layout:', agentError)
  }

  // Get new leads count for badge
  const { count: newLeadsCount } = agent?.id
    ? await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('agent_id', agent.id)
        .eq('status', 'new')
    : { count: 0 }

  const badges = {
    leads: newLeadsCount ?? 0,
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.08] bg-black/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-[1400px] items-center justify-between px-6">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg bg-[#0077ff] flex items-center justify-center">
              <Camera className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-[15px] font-semibold text-white">
              Agent Portal
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/book"
              className="flex items-center gap-1.5 rounded-lg bg-blue-500 px-3 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-blue-600"
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Book</span>
            </Link>
            {agent?.name && (
              <span className="hidden text-[13px] text-[#a1a1a6] md:block">
                {agent.name}
              </span>
            )}
            <form action="/api/auth/signout" method="POST">
              <Button variant="ghost" size="sm" type="submit">
                <LogOut className="h-4 w-4" />
                <span className="ml-2 hidden sm:inline">Sign out</span>
              </Button>
            </form>
          </div>
        </div>
      </header>

      <div className="flex pt-14">
        {/* Sidebar Navigation - Desktop */}
        <DashboardNav
          navigation={navigation}
          secondaryNav={secondaryNav}
          badges={badges}
        />

        {/* Mobile Navigation */}
        <nav className="fixed top-14 left-0 right-0 z-40 border-b border-white/[0.08] bg-[#0a0a0a] lg:hidden overflow-x-auto scrollbar-hide">
          <div className="flex gap-1 px-4 py-3">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="relative flex flex-shrink-0 items-center gap-2 rounded-lg glass-light px-3 py-2 text-[13px] text-[#a1a1a6] hover:text-white transition-colors"
              >
                <item.icon className="h-4 w-4" />
                {item.name}
                {item.badge && badges[item.badge as keyof typeof badges] > 0 && (
                  <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-black">
                    {badges[item.badge as keyof typeof badges]}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1 lg:ml-[240px] pt-[52px] lg:pt-0">
          <div className="mx-auto max-w-[1100px] px-6 py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
