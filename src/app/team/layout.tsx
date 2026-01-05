import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import {
  Camera,
  Video,
  CheckCircle,
  Palette,
  Home,
  Calendar,
  Settings,
  LogOut
} from 'lucide-react'
import { AdminThemeProvider } from '@/components/admin/theme/ThemeProvider'

// Team role navigation items
const roleNavItems = {
  photographer: [
    { href: '/team/photographer', label: 'Dashboard', icon: Home },
    { href: '/team/photographer/schedule', label: 'Schedule', icon: Calendar },
    { href: '/team/photographer/settings', label: 'Settings', icon: Settings },
  ],
  videographer: [
    { href: '/team/videographer', label: 'Dashboard', icon: Home },
    { href: '/team/videographer/schedule', label: 'Schedule', icon: Calendar },
    { href: '/team/videographer/settings', label: 'Settings', icon: Settings },
  ],
  editor: [
    { href: '/team/editor', label: 'Dashboard', icon: Home },
    { href: '/team/editor/queue', label: 'Edit Queue', icon: Palette },
    { href: '/team/editor/settings', label: 'Settings', icon: Settings },
  ],
  qc_specialist: [
    { href: '/team/qc', label: 'Dashboard', icon: Home },
    { href: '/team/qc/queue', label: 'QC Queue', icon: CheckCircle },
    { href: '/team/qc/settings', label: 'Settings', icon: Settings },
  ],
}

const roleIcons = {
  photographer: Camera,
  videographer: Video,
  editor: Palette,
  qc_specialist: CheckCircle,
}

const roleLabels = {
  photographer: 'Photographer',
  videographer: 'Videographer',
  editor: 'Editor',
  qc_specialist: 'QC Specialist',
}

export default async function TeamLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/staff-login')
  }

  // Get staff member with role
  const { data: staff } = await supabase
    .from('staff')
    .select('id, name, email, role')
    .eq('email', user.email!)
    .eq('is_active', true)
    .single()

  if (!staff) {
    redirect('/staff-login')
  }

  const teamRole = (staff.role as keyof typeof roleNavItems) || 'photographer'
  const navItems = roleNavItems[teamRole] || roleNavItems.photographer
  const RoleIcon = roleIcons[teamRole] || Camera
  const roleLabel = roleLabels[teamRole] || 'Team Member'

  return (
    <AdminThemeProvider>
      <div className="min-h-screen bg-background">
        {/* Mobile Header */}
        <header className="sticky top-0 z-50 bg-card border-b border-border lg:hidden">
          <div className="flex items-center justify-between px-4 h-14">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <RoleIcon className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-semibold text-foreground">ASM {roleLabel}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">{staff.name}</span>
            </div>
          </div>
        </header>

        <div className="flex">
          {/* Desktop Sidebar */}
          <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-card border-r border-border">
            {/* Logo */}
            <div className="flex items-center gap-3 px-6 h-16 border-b border-border">
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
                <RoleIcon className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <p className="font-semibold text-foreground">ASM Portal</p>
                <p className="text-xs text-muted-foreground">{roleLabel}</p>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 py-4 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-sm font-medium">{item.label}</span>
                  </Link>
                )
              })}
            </nav>

            {/* User Info */}
            <div className="p-4 border-t border-border">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                  <span className="text-sm font-semibold text-muted-foreground">
                    {staff.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{staff.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{staff.email}</p>
                </div>
              </div>
              <form action="/api/auth/signout" method="POST">
                <button
                  type="submit"
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </form>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 lg:ml-64">
            <div className="p-4 lg:p-6">
              {children}
            </div>
          </main>
        </div>

        {/* Mobile Bottom Navigation */}
        <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border lg:hidden z-50">
          <div className="flex items-center justify-around h-16">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex flex-col items-center gap-1 px-4 py-2 text-muted-foreground"
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-xs">{item.label}</span>
                </Link>
              )
            })}
          </div>
        </nav>
      </div>
    </AdminThemeProvider>
  )
}
