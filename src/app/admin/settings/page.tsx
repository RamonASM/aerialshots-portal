import Link from 'next/link'
import {
  Users,
  Link2,
  FileText,
  Package,
  Settings,
  Shield,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export const dynamic = 'force-dynamic'

const settingsLinks = [
  {
    title: 'Team Management',
    description: 'Manage staff members, roles, and permissions',
    href: '/admin/settings/team',
    icon: Users,
    color: 'bg-blue-500',
  },
  {
    title: 'Integrations',
    description: 'Connect third-party services and APIs',
    href: '/admin/settings/integrations',
    icon: Link2,
    color: 'bg-purple-500',
  },
  {
    title: 'Auth Status',
    description: 'Authentication and session diagnostics',
    href: '/admin/settings/auth',
    icon: Shield,
    color: 'bg-emerald-500',
  },
  {
    title: 'Invoice Template',
    description: 'Customize invoice branding and layout',
    href: '/admin/settings/invoice-template',
    icon: FileText,
    color: 'bg-green-500',
  },
  {
    title: 'Packages & Pricing',
    description: 'Configure service packages and pricing tiers',
    href: '/admin/settings/packages',
    icon: Package,
    color: 'bg-amber-500',
  },
]

export default function AdminSettingsPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#636366]">
          <Settings className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight text-white">Settings</h1>
          <p className="text-[15px] text-[#a1a1a6]">Configure your portal and integrations</p>
        </div>
      </div>

      {/* Settings Grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        {settingsLinks.map((link) => (
          <Link key={link.href} href={link.href}>
            <Card variant="interactive" className="h-full">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${link.color}`}>
                    <link.icon className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-[15px]">{link.title}</CardTitle>
                    <CardDescription>{link.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
