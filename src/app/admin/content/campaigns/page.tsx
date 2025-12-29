'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Search,
  Filter,
  Megaphone,
  Image as ImageIcon,
  Clock,
  CheckCircle,
  AlertCircle,
  HelpCircle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  MoreHorizontal,
  FileQuestion,
  Sparkles,
  Eye,
  Loader2,
  Edit,
  MapPin,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SkeletonGrid } from '@/components/ui/skeleton'

interface Campaign {
  id: string
  name: string
  status: string
  carousel_types: string[]
  credits_used: number
  created_at: string
  updated_at: string
  carouselCount: number
  listing: {
    id: string
    address: string
    city: string
    state: string
    price: number | null
  } | null
  agent: {
    id: string
    name: string
    email: string
    headshot_url: string | null
  } | null
}

interface CampaignsData {
  campaigns: Campaign[]
  total: number
  page: number
  limit: number
  totalPages: number
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  draft: {
    label: 'Draft',
    color: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300',
    icon: Edit,
  },
  researching: {
    label: 'Researching',
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    icon: Loader2,
  },
  questions: {
    label: 'Awaiting Input',
    color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    icon: HelpCircle,
  },
  generating: {
    label: 'Generating',
    color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    icon: Sparkles,
  },
  completed: {
    label: 'Completed',
    color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    icon: CheckCircle,
  },
  published: {
    label: 'Published',
    color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    icon: Megaphone,
  },
}

const CAROUSEL_TYPE_LABELS: Record<string, string> = {
  property_highlights: 'Property Highlights',
  neighborhood_guide: 'Neighborhood Guide',
  local_favorites: 'Local Favorites',
  schools_families: 'Schools & Families',
  lifestyle: 'Lifestyle',
  market_update: 'Market Update',
  open_house: 'Open House',
}

export default function CampaignsPage() {
  const [data, setData] = useState<CampaignsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [page, setPage] = useState(1)

  const fetchCampaigns = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      params.set('page', page.toString())
      params.set('limit', '20')
      if (search) params.set('search', search)
      if (status !== 'all') params.set('status', status)

      const res = await fetch(`/api/admin/content/campaigns?${params}`)
      if (!res.ok) throw new Error('Failed to fetch')
      const result = await res.json()
      setData(result)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }, [page, search, status])

  useEffect(() => {
    fetchCampaigns()
  }, [fetchCampaigns])

  useEffect(() => {
    setPage(1)
  }, [search, status])

  const getStatusStats = () => {
    if (!data?.campaigns) return { total: 0, active: 0, completed: 0, awaiting: 0 }
    const total = data.total
    const active = data.campaigns.filter(c => ['researching', 'generating'].includes(c.status)).length
    const completed = data.campaigns.filter(c => ['completed', 'published'].includes(c.status)).length
    const awaiting = data.campaigns.filter(c => c.status === 'questions').length
    return { total, active, completed, awaiting }
  }

  const stats = getStatusStats()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Campaigns</h1>
          <p className="mt-1 text-neutral-600 dark:text-neutral-400">
            Manage ListingLaunch marketing campaigns
          </p>
        </div>
        <Button onClick={fetchCampaigns} variant="outline" disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 pt-4">
            <div className="rounded-full bg-blue-100 p-2 dark:bg-blue-900/30">
              <Megaphone className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">{stats.total}</p>
              <p className="text-xs text-neutral-500">Total Campaigns</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-4">
            <div className="rounded-full bg-purple-100 p-2 dark:bg-purple-900/30">
              <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">{stats.active}</p>
              <p className="text-xs text-neutral-500">In Progress</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-4">
            <div className="rounded-full bg-amber-100 p-2 dark:bg-amber-900/30">
              <HelpCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">{stats.awaiting}</p>
              <p className="text-xs text-neutral-500">Awaiting Input</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-4">
            <div className="rounded-full bg-green-100 p-2 dark:bg-green-900/30">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">{stats.completed}</p>
              <p className="text-xs text-neutral-500">Completed</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 md:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <Input
            placeholder="Search campaigns..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-neutral-400" />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
          >
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="researching">Researching</option>
            <option value="questions">Awaiting Input</option>
            <option value="generating">Generating</option>
            <option value="completed">Completed</option>
            <option value="published">Published</option>
          </select>
        </div>

        {data && (
          <div className="text-sm text-neutral-500">
            {data.total} {data.total === 1 ? 'campaign' : 'campaigns'}
          </div>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <SkeletonGrid items={6} />
      ) : !data || data.campaigns.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Megaphone className="mb-4 h-12 w-12 text-neutral-300" />
            <p className="text-lg font-medium text-neutral-900 dark:text-white">No campaigns found</p>
            <p className="mt-1 text-sm text-neutral-500">
              Campaigns are created automatically when media is delivered to agents
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Campaign Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.campaigns.map((campaign) => {
              const statusConfig = STATUS_CONFIG[campaign.status] || STATUS_CONFIG.draft
              const StatusIcon = statusConfig.icon

              return (
                <Card
                  key={campaign.id}
                  className="group overflow-hidden transition-all hover:-translate-y-1 hover:shadow-lg"
                >
                  <CardContent className="p-0">
                    {/* Header */}
                    <div className="border-b border-neutral-100 p-4 dark:border-neutral-800">
                      <div className="flex items-start justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-neutral-900 dark:text-white">
                            {campaign.listing?.address || campaign.name || 'Untitled Campaign'}
                          </p>
                          {campaign.listing && (
                            <p className="mt-0.5 flex items-center gap-1 text-sm text-neutral-500">
                              <MapPin className="h-3 w-3" />
                              {campaign.listing.city}, {campaign.listing.state}
                            </p>
                          )}
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/campaigns/${campaign.id}`}>
                                <Eye className="mr-2 h-4 w-4" />
                                View Campaign
                              </Link>
                            </DropdownMenuItem>
                            {campaign.listing && (
                              <DropdownMenuItem asChild>
                                <Link href={`/admin/content/properties/${campaign.listing.id}`}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit Property
                                </Link>
                              </DropdownMenuItem>
                            )}
                            {campaign.status === 'questions' && (
                              <DropdownMenuItem asChild>
                                <Link href={`/campaigns/${campaign.id}/questions`}>
                                  <FileQuestion className="mr-2 h-4 w-4" />
                                  Answer Questions
                                </Link>
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {/* Status Badge */}
                      <div className="mt-3">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${statusConfig.color}`}
                        >
                          <StatusIcon className={`h-3 w-3 ${campaign.status === 'researching' || campaign.status === 'generating' ? 'animate-spin' : ''}`} />
                          {statusConfig.label}
                        </span>
                      </div>
                    </div>

                    {/* Body */}
                    <div className="p-4">
                      {/* Agent */}
                      {campaign.agent && (
                        <div className="flex items-center gap-2">
                          {campaign.agent.headshot_url ? (
                            <img
                              src={campaign.agent.headshot_url}
                              alt={campaign.agent.name}
                              className="h-8 w-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-200 dark:bg-neutral-700">
                              <span className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                                {campaign.agent.name.charAt(0)}
                              </span>
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-neutral-900 dark:text-white">
                              {campaign.agent.name}
                            </p>
                            <p className="truncate text-xs text-neutral-500">{campaign.agent.email}</p>
                          </div>
                        </div>
                      )}

                      {/* Carousel Types */}
                      {campaign.carousel_types && campaign.carousel_types.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1">
                          {campaign.carousel_types.slice(0, 3).map((type) => (
                            <span
                              key={type}
                              className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
                            >
                              {CAROUSEL_TYPE_LABELS[type] || type}
                            </span>
                          ))}
                          {campaign.carousel_types.length > 3 && (
                            <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
                              +{campaign.carousel_types.length - 3}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Stats */}
                      <div className="mt-4 flex items-center justify-between text-xs text-neutral-500">
                        <div className="flex items-center gap-1">
                          <ImageIcon className="h-3 w-3" />
                          {campaign.carouselCount} carousels
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(campaign.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Pagination */}
          {data.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-neutral-500">
                Showing {(page - 1) * data.limit + 1} to{' '}
                {Math.min(page * data.limit, data.total)} of {data.total}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                  disabled={page === data.totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
