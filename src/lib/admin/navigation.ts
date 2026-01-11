import {
  Camera,
  ClipboardCheck,
  HeartHandshake,
  Bot,
  Layers,
  Settings,
  Code2,
  BarChart3,
  Globe,
  Users,
  Home,
  Map,
  Megaphone,
  UserCircle,
  CreditCard,
  Gift,
  Bell,
  Mail,
  FileText,
  Instagram,
  Send,
  Plane,
  ListTodo,
  Pencil,
  MapPin,
  Link2,
  Calendar,
  UsersRound,
  Sparkles,
  Shield,
  Clock,
  type LucideIcon,
} from 'lucide-react'

export type BadgeType = 'count' | 'dot' | 'new'

export interface NavItem {
  name: string
  href: string
  icon: LucideIcon
  description?: string
  badge?: BadgeType
  badgeKey?: string // Key for fetching dynamic count
  shortcut?: string // Keyboard shortcut (e.g., "G O" for go to operations)
  children?: NavItem[]
}

export interface NavGroup {
  label: string
  items: NavItem[]
}

export const navigationGroups: NavGroup[] = [
  {
    label: 'Workflows',
    items: [
      {
        name: 'Operations',
        href: '/admin/ops',
        icon: Camera,
        description: 'Job scheduling and workflow management',
        badge: 'count',
        badgeKey: 'pending_jobs',
        shortcut: 'G O',
      },
      {
        name: 'StashDR',
        href: '/admin/ops/processing',
        icon: Sparkles,
        description: 'AI HDR photo processing pipeline',
        shortcut: 'G H',
      },
      {
        name: 'QC Live',
        href: '/admin/qc/live',
        icon: ClipboardCheck,
        description: 'Quality control review queue',
        badge: 'count',
        badgeKey: 'ready_for_qc',
        shortcut: 'G Q',
      },
      {
        name: 'Customer Care',
        href: '/admin/care',
        icon: HeartHandshake,
        description: 'Follow-up tasks and support',
        badge: 'count',
        badgeKey: 'care_tasks',
        shortcut: 'G C',
      },
      {
        name: 'Task Board',
        href: '/admin/ops/tasks',
        icon: ListTodo,
        description: 'Job tasks and team assignments',
        badge: 'new',
        shortcut: 'G T',
      },
      {
        name: 'Edit Requests',
        href: '/admin/ops/edit-requests',
        icon: Pencil,
        description: 'Post-delivery edit requests',
        badge: 'count',
        badgeKey: 'pending_edits',
        shortcut: 'G W',
      },
      {
        name: 'Calendar Map',
        href: '/admin/ops/calendar-map',
        icon: MapPin,
        description: 'Geographic view of assignments',
        badge: 'new',
      },
      {
        name: 'Zillow Showcase',
        href: '/admin/ops/aryeo-lite',
        icon: Globe,
        description: 'Upload photos via Aryeo Lite',
      },
    ],
  },
  {
    label: 'Team',
    items: [
      {
        name: 'My Roles',
        href: '/admin/team/roles',
        icon: UsersRound,
        description: 'Configure your active work roles',
        badge: 'new',
      },
      {
        name: 'Team Settings',
        href: '/admin/settings/team',
        icon: UsersRound,
        description: 'Manage team members and roles',
      },
      {
        name: 'Territories',
        href: '/admin/team/territories',
        icon: Map,
        description: 'Service area management',
        badge: 'new',
      },
      {
        name: 'Capacity',
        href: '/admin/team/capacity',
        icon: Calendar,
        description: 'Team capacity planning',
        badge: 'new',
      },
      {
        name: 'Availability',
        href: '/admin/team/availability',
        icon: Calendar,
        description: 'Team availability windows',
        badge: 'new',
      },
      {
        name: 'Time Off',
        href: '/admin/team/time-off',
        icon: Clock,
        description: 'Review time off requests',
        badge: 'count',
        badgeKey: 'pending_time_off',
      },
    ],
  },
  {
    label: 'Content Hub',
    items: [
      {
        name: 'Content Manager',
        href: '/admin/content',
        icon: FileText,
        description: 'Overview of all content',
        badge: 'new',
        shortcut: 'G X',
      },
      {
        name: 'Property Sites',
        href: '/admin/properties',
        icon: Home,
        description: 'Manage listing property websites',
        shortcut: 'G P',
      },
      {
        name: 'Communities',
        href: '/admin/content/communities',
        icon: Map,
        description: 'Neighborhood and community pages',
        shortcut: 'G M',
      },
      {
        name: 'Campaigns',
        href: '/admin/content/campaigns',
        icon: Megaphone,
        description: 'Listing launch and marketing campaigns',
        badge: 'new',
        shortcut: 'G K',
      },
      {
        name: 'Curation',
        href: '/admin/curation',
        icon: Layers,
        description: 'Curated location content',
        shortcut: 'G U',
      },
    ],
  },
  {
    label: 'Marketing',
    items: [
      {
        name: 'Email Campaigns',
        href: '/admin/marketing',
        icon: Send,
        description: 'Bulk email marketing to agents',
        badge: 'new',
        shortcut: 'G E',
      },
      {
        name: 'Agent Portfolios',
        href: '/admin/portfolios',
        icon: UserCircle,
        description: 'Manage agent profiles and Instagram',
        badge: 'new',
        shortcut: 'G F',
      },
      {
        name: 'Email Templates',
        href: '/admin/templates',
        icon: Mail,
        description: 'Customizable email templates',
        badge: 'new',
        shortcut: 'G T',
      },
      {
        name: 'Social Media',
        href: '/admin/social',
        icon: Instagram,
        description: 'Instagram connections and scheduled posts',
        badge: 'new',
        shortcut: 'G I',
      },
    ],
  },
  {
    label: 'Finance',
    items: [
      {
        name: 'Payments',
        href: '/admin/payments',
        icon: CreditCard,
        description: 'Invoice and payment management',
        badge: 'new',
        shortcut: 'G $',
      },
      {
        name: 'Referrals',
        href: '/admin/referrals',
        icon: Gift,
        description: 'Referral tracking and commissions',
        badge: 'new',
        shortcut: 'G R',
      },
      {
        name: 'Notifications',
        href: '/admin/notifications',
        icon: Bell,
        description: 'Automated notification rules',
        badge: 'new',
        shortcut: 'G B',
      },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      {
        name: 'AI Agents',
        href: '/admin/agents',
        icon: Bot,
        description: 'AI workflow agents',
        shortcut: 'G A',
      },
    ],
  },
  {
    label: 'Platform',
    items: [
      {
        name: 'Clients',
        href: '/admin/clients',
        icon: Users,
        description: 'Agent and client accounts',
        badge: 'count',
        badgeKey: 'active_clients',
        shortcut: 'G L',
      },
      {
        name: 'Developers',
        href: '/admin/developers',
        icon: Code2,
        description: 'API keys and developer access',
        badge: 'new',
        shortcut: 'G D',
      },
      {
        name: 'Analytics',
        href: '/admin/analytics',
        icon: BarChart3,
        description: 'Business KPIs and metrics',
        badge: 'new',
        shortcut: 'G N',
      },
    ],
  },
  {
    label: 'Configuration',
    items: [
      {
        name: 'Settings',
        href: '/admin/settings',
        icon: Settings,
        description: 'Team and system settings',
        shortcut: 'G S',
      },
      {
        name: 'Auth Status',
        href: '/admin/settings/auth',
        icon: Shield,
        description: 'Authentication and session diagnostics',
        badge: 'new',
      },
      {
        name: 'Integrations',
        href: '/admin/settings/integrations',
        icon: Link2,
        description: 'Third-party integrations',
        badge: 'new',
      },
    ],
  },
]

// Flatten navigation for command palette search
export function getAllNavItems(): NavItem[] {
  return navigationGroups.flatMap((group) => group.items)
}

// Get nav item by href
export function getNavItemByHref(href: string): NavItem | undefined {
  return getAllNavItems().find((item) =>
    href === item.href || href.startsWith(item.href + '/')
  )
}

// Get breadcrumb label from path segment
export function getPathLabel(segment: string): string {
  const labels: Record<string, string> = {
    admin: 'Admin',
    ops: 'Operations',
    qc: 'QC',
    live: 'Live Queue',
    care: 'Customer Care',
    agents: 'AI Agents',
    curation: 'Curation',
    settings: 'Settings',
    team: 'Team',
    developers: 'Developers',
    analytics: 'Analytics',
    properties: 'Property Sites',
    communities: 'Communities',
    clients: 'Clients',
    jobs: 'Jobs',
    assign: 'Assign',
    photographer: 'Photographer',
    editor: 'Editor',
    new: 'New',
    edit: 'Edit',
    // New pages from Sprint 1
    campaigns: 'Campaigns',
    portfolios: 'Agent Portfolios',
    templates: 'Email Templates',
    payments: 'Payments',
    referrals: 'Referrals',
    notifications: 'Notifications',
    // Sprint 2
    content: 'Content Hub',
    // Sprint 4
    social: 'Social Media',
    // Phase 7
    marketing: 'Email Marketing',
    airspace: 'Drone Airspace',
    // Phase 8
    tasks: 'Task Board',
    notes: 'Team Notes',
    // Phase 9
    'edit-requests': 'Edit Requests',
    // Tier 5 - Team Operations
    territories: 'Territories',
    capacity: 'Capacity',
    availability: 'Availability',
    // Tier 7 - Integrations
    integrations: 'Integrations',
    auth: 'Auth Status',
    // Tier 8 - Advanced Features
    'calendar-map': 'Calendar Map',
    'aryeo-lite': 'Zillow Showcase',
    merge: 'Merge Orders',
    preview: 'Video Preview',
    customers: 'Customers',
    // StashDR Processing
    processing: 'StashDR',
    stashdr: 'StashDR',
    // Partner Roles
    roles: 'My Roles',
    // Time Off Management
    'time-off': 'Time Off',
  }
  return labels[segment] || segment.charAt(0).toUpperCase() + segment.slice(1)
}
