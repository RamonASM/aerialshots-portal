import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
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
  Menu,
  Settings,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Profile', href: '/dashboard/profile', icon: User },
  { name: 'Listings', href: '/dashboard/listings', icon: Building },
  { name: 'Tips', href: '/dashboard/tips', icon: Lightbulb },
  { name: 'Leads', href: '/dashboard/leads', icon: Users },
  { name: 'AI Tools', href: '/dashboard/ai-tools', icon: Sparkles },
  { name: 'Storywork', href: '/dashboard/storywork', icon: BookOpen },
  { name: 'Referrals', href: '/dashboard/referrals', icon: Gift },
  { name: 'Rewards', href: '/dashboard/rewards', icon: Award },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
]

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get agent info
  const { data: agent } = await supabase
    .from('agents')
    .select('*')
    .eq('email', user.email!)
    .single()

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="text-xl font-bold text-neutral-900">
              ASM <span className="text-[#ff4533]">Portal</span>
            </span>
          </Link>

          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-neutral-600 sm:block">
              {agent?.name || user.email}
            </span>
            <form action="/api/auth/signout" method="POST">
              <Button variant="ghost" size="sm" type="submit">
                <LogOut className="h-4 w-4" />
                <span className="ml-2 hidden sm:inline">Sign out</span>
              </Button>
            </form>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
          {/* Sidebar Navigation */}
          <nav className="hidden lg:block">
            <div className="sticky top-8 space-y-1">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-neutral-700 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </Link>
              ))}
            </div>
          </nav>

          {/* Mobile Navigation */}
          <nav className="flex gap-2 overflow-x-auto pb-4 lg:hidden">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="flex flex-shrink-0 items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-700"
              >
                <item.icon className="h-4 w-4" />
                {item.name}
              </Link>
            ))}
          </nav>

          {/* Main Content */}
          <main>{children}</main>
        </div>
      </div>
    </div>
  )
}
