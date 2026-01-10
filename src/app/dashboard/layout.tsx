import { redirect } from 'next/navigation'
import Link from 'next/link'
import { currentUser } from '@clerk/nextjs/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { LogOut, Camera, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DashboardNav } from '@/components/dashboard/DashboardNav'
import { MobileNav } from '@/components/dashboard/MobileNav'

// Force dynamic rendering - dashboard requires auth checks at runtime
export const dynamic = 'force-dynamic'

// Check if auth bypass is enabled
const authBypassEnabled =
  process.env.NEXT_PUBLIC_AUTH_BYPASS === 'true' ||
  process.env.AUTH_BYPASS === 'true'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Get user - either from bypass or Clerk
  let userEmail: string
  let userName: string | null = null

  if (authBypassEnabled) {
    // Use bypass identity
    userEmail = process.env.AUTH_BYPASS_EMAIL || 'bypass@aerialshots.media'
    userName = 'Bypass User'
  } else {
    // Use Clerk authentication
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

    userEmail = user.emailAddresses[0].emailAddress.toLowerCase()
    userName = [user.firstName, user.lastName].filter(Boolean).join(' ') || null
  }

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

  const displayName = agent?.name || userName || 'Agent'

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
            <span className="hidden text-[13px] text-[#a1a1a6] md:block">
              {displayName}
            </span>
            {!authBypassEnabled && (
              <form action="/api/auth/signout" method="POST">
                <Button variant="ghost" size="sm" type="submit">
                  <LogOut className="h-4 w-4" />
                  <span className="ml-2 hidden sm:inline">Sign out</span>
                </Button>
              </form>
            )}
          </div>
        </div>
      </header>

      <div className="flex pt-14">
        {/* Sidebar Navigation - Desktop */}
        <DashboardNav badges={badges} />

        {/* Mobile Navigation */}
        <MobileNav badges={badges} />

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
