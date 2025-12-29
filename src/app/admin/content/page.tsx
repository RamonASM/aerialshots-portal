'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Home,
  Map,
  Megaphone,
  FileText,
  Eye,
  Calendar,
  Clock,
  ArrowRight,
  Plus,
  TrendingUp,
  AlertCircle,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { SkeletonCard, SkeletonList } from '@/components/ui/skeleton'

interface ContentStats {
  properties: { total: number; published: number; draft: number }
  communities: { total: number; published: number; draft: number }
  campaigns: { total: number; active: number; completed: number }
}

interface RecentActivity {
  id: string
  type: 'property' | 'community' | 'campaign'
  title: string
  action: string
  timestamp: string
  link: string
}

export default function ContentHubPage() {
  const [stats, setStats] = useState<ContentStats | null>(null)
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [drafts, setDrafts] = useState<RecentActivity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch stats from multiple endpoints
        const [propertiesRes, communitiesRes, campaignsRes] = await Promise.all([
          fetch('/api/admin/properties?limit=1'),
          fetch('/api/admin/communities?limit=1'),
          fetch('/api/admin/campaigns?limit=1'),
        ])

        const [propertiesData, communitiesData, campaignsData] = await Promise.all([
          propertiesRes.json(),
          communitiesRes.json(),
          campaignsRes.json(),
        ])

        setStats({
          properties: {
            total: propertiesData.total || 0,
            published: propertiesData.total || 0,
            draft: 0,
          },
          communities: {
            total: communitiesData.total || 0,
            published: communitiesData.communities?.filter((c: { is_published: boolean }) => c.is_published).length || 0,
            draft: communitiesData.communities?.filter((c: { is_published: boolean }) => !c.is_published).length || 0,
          },
          campaigns: {
            total: campaignsData.total || 0,
            active: campaignsData.campaigns?.filter((c: { status: string }) =>
              ['researching', 'generating', 'questions'].includes(c.status)
            ).length || 0,
            completed: campaignsData.campaigns?.filter((c: { status: string }) =>
              c.status === 'completed' || c.status === 'published'
            ).length || 0,
          },
        })

        // Build recent activity from campaigns
        const activity: RecentActivity[] = (campaignsData.campaigns || [])
          .slice(0, 5)
          .map((c: { id: string; listing?: { address?: string }; status: string; created_at: string }) => ({
            id: c.id,
            type: 'campaign' as const,
            title: c.listing?.address || 'Untitled Campaign',
            action: `Status: ${c.status}`,
            timestamp: c.created_at,
            link: `/admin/campaigns`,
          }))

        setRecentActivity(activity)

        // Build drafts from unpublished communities
        const draftItems: RecentActivity[] = (communitiesData.communities || [])
          .filter((c: { is_published: boolean }) => !c.is_published)
          .slice(0, 5)
          .map((c: { id: string; name: string; created_at: string; slug: string }) => ({
            id: c.id,
            type: 'community' as const,
            title: c.name,
            action: 'Draft',
            timestamp: c.created_at,
            link: `/admin/content/communities/${c.slug}`,
          }))

        setDrafts(draftItems)
      } catch (error) {
        console.error('Error fetching content hub data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const contentTypes = [
    {
      title: 'Properties',
      description: 'Property websites and media',
      icon: Home,
      href: '/admin/properties',
      color: 'bg-blue-500',
      stats: stats?.properties,
    },
    {
      title: 'Communities',
      description: 'Neighborhood guides and pages',
      icon: Map,
      href: '/admin/content/communities',
      color: 'bg-green-500',
      stats: stats?.communities,
    },
    {
      title: 'Campaigns',
      description: 'Social media campaigns',
      icon: Megaphone,
      href: '/admin/campaigns',
      color: 'bg-purple-500',
      stats: stats?.campaigns,
    },
  ]

  const quickActions = [
    { label: 'New Property Site', href: '/admin/properties', icon: Home },
    { label: 'New Community', href: '/admin/content/communities/new', icon: Map },
    { label: 'New Campaign', href: '/admin/campaigns', icon: Megaphone },
  ]

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Content Hub</h1>
          <p className="mt-1 text-neutral-600 dark:text-neutral-400">
            Manage all your content in one place
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <SkeletonList items={5} />
          <SkeletonList items={5} />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Content Hub</h1>
          <p className="mt-1 text-neutral-600 dark:text-neutral-400">
            Manage all your content in one place
          </p>
        </div>
        <div className="flex gap-2">
          {quickActions.map((action) => (
            <Link key={action.label} href={action.href}>
              <Button variant="outline" size="sm">
                <Plus className="mr-1 h-4 w-4" />
                {action.label}
              </Button>
            </Link>
          ))}
        </div>
      </div>

      {/* Content Type Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        {contentTypes.map((type) => (
          <Link key={type.title} href={type.href}>
            <Card className="group cursor-pointer transition-all hover:-translate-y-1 hover:shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className={`rounded-lg p-2 ${type.color}`}>
                  <type.icon className="h-5 w-5 text-white" />
                </div>
                <ArrowRight className="h-5 w-5 text-neutral-400 transition-transform group-hover:translate-x-1" />
              </CardHeader>
              <CardContent>
                <CardTitle className="text-lg">{type.title}</CardTitle>
                <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                  {type.description}
                </p>
                {type.stats && (
                  <div className="mt-4 flex items-center gap-4 text-sm">
                    <span className="font-semibold text-neutral-900 dark:text-white">
                      {type.stats.total} total
                    </span>
                    {'published' in type.stats && (
                      <span className="text-green-600 dark:text-green-400">
                        {type.stats.published} published
                      </span>
                    )}
                    {'active' in type.stats && (
                      <span className="text-blue-600 dark:text-blue-400">
                        {type.stats.active} active
                      </span>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Two Column Layout */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Activity */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-neutral-500" />
              Recent Activity
            </CardTitle>
            <Link href="/admin/campaigns">
              <Button variant="ghost" size="sm">
                View All
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <FileText className="mb-2 h-8 w-8 text-neutral-300" />
                <p className="text-sm text-neutral-500">No recent activity</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentActivity.map((item) => (
                  <Link key={item.id} href={item.link}>
                    <div className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800">
                      <div className="flex-shrink-0">
                        {item.type === 'property' && <Home className="h-5 w-5 text-blue-500" />}
                        {item.type === 'community' && <Map className="h-5 w-5 text-green-500" />}
                        {item.type === 'campaign' && <Megaphone className="h-5 w-5 text-purple-500" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-neutral-900 dark:text-white">
                          {item.title}
                        </p>
                        <p className="text-sm text-neutral-500">{item.action}</p>
                      </div>
                      <span className="flex-shrink-0 text-xs text-neutral-400">
                        {new Date(item.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Drafts Needing Review */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              Drafts Needing Review
            </CardTitle>
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900 dark:text-amber-300">
              {drafts.length} pending
            </span>
          </CardHeader>
          <CardContent>
            {drafts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <TrendingUp className="mb-2 h-8 w-8 text-green-400" />
                <p className="text-sm text-neutral-500">All content is published!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {drafts.map((item) => (
                  <Link key={item.id} href={item.link}>
                    <div className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800">
                      <div className="flex-shrink-0">
                        {item.type === 'property' && <Home className="h-5 w-5 text-blue-500" />}
                        {item.type === 'community' && <Map className="h-5 w-5 text-green-500" />}
                        {item.type === 'campaign' && <Megaphone className="h-5 w-5 text-purple-500" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-neutral-900 dark:text-white">
                          {item.title}
                        </p>
                        <p className="text-sm text-amber-600 dark:text-amber-400">Draft</p>
                      </div>
                      <Button variant="outline" size="sm">
                        Review
                      </Button>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-blue-100 p-2 dark:bg-blue-900">
                <Eye className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                  {stats?.properties.total || 0}
                </p>
                <p className="text-sm text-neutral-500">Total Properties</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-green-100 p-2 dark:bg-green-900">
                <Map className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                  {stats?.communities.published || 0}
                </p>
                <p className="text-sm text-neutral-500">Live Communities</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-purple-100 p-2 dark:bg-purple-900">
                <Megaphone className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                  {stats?.campaigns.active || 0}
                </p>
                <p className="text-sm text-neutral-500">Active Campaigns</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-amber-100 p-2 dark:bg-amber-900">
                <Calendar className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                  {(stats?.communities.draft || 0) + (stats?.campaigns.total || 0) - (stats?.campaigns.completed || 0)}
                </p>
                <p className="text-sm text-neutral-500">Pending Review</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
