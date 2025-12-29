'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  Megaphone,
  Search,
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  MoreVertical,
  Eye,
  Trash2,
  CheckCircle,
  Clock,
  AlertCircle,
  Instagram,
  Home,
  Calendar,
} from 'lucide-react'
import { SkeletonList } from '@/components/ui/skeleton'
import { EmptyCampaignsState } from '@/components/ui/empty-state'

interface Campaign {
  id: string
  listing_id: string
  agent_id: string
  status: 'draft' | 'researching' | 'questions' | 'generating' | 'completed' | 'published'
  carousel_type: string
  slides_data: unknown[] | null
  instagram_post_id: string | null
  created_at: string
  updated_at: string
  listing?: {
    address: string
    city: string
    state: string
  }
  agent?: {
    name: string
    company: string
  }
}

interface CampaignsData {
  campaigns: Campaign[]
  total: number
  page: number
  limit: number
  totalPages: number
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  draft: {
    label: 'Draft',
    color: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400',
    icon: <Clock className="h-3.5 w-3.5" />,
  },
  researching: {
    label: 'Researching',
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    icon: <Search className="h-3.5 w-3.5" />,
  },
  questions: {
    label: 'Questions',
    color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    icon: <AlertCircle className="h-3.5 w-3.5" />,
  },
  generating: {
    label: 'Generating',
    color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    icon: <RefreshCw className="h-3.5 w-3.5 animate-spin" />,
  },
  completed: {
    label: 'Completed',
    color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    icon: <CheckCircle className="h-3.5 w-3.5" />,
  },
  published: {
    label: 'Published',
    color: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
    icon: <Instagram className="h-3.5 w-3.5" />,
  },
}

const CAROUSEL_TYPES: Record<string, string> = {
  property_highlights: 'Property Highlights',
  neighborhood_guide: 'Neighborhood Guide',
  local_favorites: 'Local Favorites',
  schools_families: 'Schools & Families',
  lifestyle: 'Lifestyle',
  listing_launch: 'Listing Launch',
  open_house: 'Open House',
  just_sold: 'Just Sold',
  price_drop: 'Price Drop',
}

export default function CampaignsPage() {
  const [data, setData] = useState<CampaignsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [carouselType, setCarouselType] = useState('all')
  const [page, setPage] = useState(1)

  const fetchCampaigns = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      params.set('page', page.toString())
      params.set('limit', '20')
      if (search) params.set('search', search)
      if (status !== 'all') params.set('status', status)
      if (carouselType !== 'all') params.set('carousel_type', carouselType)

      const response = await fetch(`/api/admin/campaigns?${params}`)
      if (!response.ok) throw new Error('Failed to fetch')
      const result = await response.json()
      setData(result)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }, [page, search, status, carouselType])

  useEffect(() => {
    fetchCampaigns()
  }, [fetchCampaigns])

  useEffect(() => {
    setPage(1)
  }, [search, status, carouselType])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Campaigns</h1>
          <p className="text-neutral-500 dark:text-neutral-400">
            Manage listing launch and marketing campaigns
          </p>
        </div>
      </div>

      {/* Stats */}
      {data && (
        <div className="grid gap-4 sm:grid-cols-4">
          <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-blue-100 p-2 dark:bg-blue-900/30">
                <Megaphone className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-neutral-900 dark:text-white">{data.total}</p>
                <p className="text-sm text-neutral-500">Total Campaigns</p>
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-purple-100 p-2 dark:bg-purple-900/30">
                <RefreshCw className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                  {data.campaigns.filter((c) => c.status === 'generating').length}
                </p>
                <p className="text-sm text-neutral-500">In Progress</p>
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-green-100 p-2 dark:bg-green-900/30">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                  {data.campaigns.filter((c) => c.status === 'completed').length}
                </p>
                <p className="text-sm text-neutral-500">Ready to Post</p>
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-pink-100 p-2 dark:bg-pink-900/30">
                <Instagram className="h-5 w-5 text-pink-600 dark:text-pink-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                  {data.campaigns.filter((c) => c.status === 'published').length}
                </p>
                <p className="text-sm text-neutral-500">Published</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Search by address or agent..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-neutral-200 bg-white py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
          >
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="researching">Researching</option>
            <option value="questions">Questions</option>
            <option value="generating">Generating</option>
            <option value="completed">Completed</option>
            <option value="published">Published</option>
          </select>
          <select
            value={carouselType}
            onChange={(e) => setCarouselType(e.target.value)}
            className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
          >
            <option value="all">All Types</option>
            {Object.entries(CAROUSEL_TYPES).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
          <button
            onClick={fetchCampaigns}
            className="rounded-lg border border-neutral-200 bg-white p-2 text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Campaigns List */}
      {loading ? (
        <SkeletonList items={5} />
      ) : data?.campaigns.length === 0 ? (
        <EmptyCampaignsState />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800">
                <th className="px-4 py-3 text-left text-sm font-medium text-neutral-600 dark:text-neutral-400">
                  Property
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-neutral-600 dark:text-neutral-400">
                  Agent
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-neutral-600 dark:text-neutral-400">
                  Type
                </th>
                <th className="px-4 py-3 text-center text-sm font-medium text-neutral-600 dark:text-neutral-400">
                  Status
                </th>
                <th className="px-4 py-3 text-center text-sm font-medium text-neutral-600 dark:text-neutral-400">
                  Slides
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-neutral-600 dark:text-neutral-400">
                  Created
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-neutral-600 dark:text-neutral-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
              {data?.campaigns.map((campaign) => {
                const statusConfig = STATUS_CONFIG[campaign.status]
                return (
                  <tr key={campaign.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-100 dark:bg-neutral-800">
                          <Home className="h-5 w-5 text-neutral-400" />
                        </div>
                        <div>
                          <p className="font-medium text-neutral-900 dark:text-white">
                            {campaign.listing?.address || 'Unknown Address'}
                          </p>
                          <p className="text-sm text-neutral-500">
                            {campaign.listing?.city}, {campaign.listing?.state}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-neutral-900 dark:text-white">
                        {campaign.agent?.name || 'Unknown'}
                      </p>
                      <p className="text-xs text-neutral-500">
                        {campaign.agent?.company}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-neutral-600 dark:text-neutral-400">
                        {CAROUSEL_TYPES[campaign.carousel_type] || campaign.carousel_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${statusConfig?.color}`}
                      >
                        {statusConfig?.icon}
                        {statusConfig?.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-sm text-neutral-600 dark:text-neutral-400">
                        {campaign.slides_data?.length || 0}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
                        <Calendar className="h-4 w-4" />
                        {formatDate(campaign.created_at)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/campaigns/${campaign.id}`}
                          className="rounded-lg border border-neutral-200 p-2 text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800"
                          title="View Campaign"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        {campaign.instagram_post_id && (
                          <a
                            href={`https://instagram.com/p/${campaign.instagram_post_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-lg border border-pink-200 p-2 text-pink-600 hover:bg-pink-50 dark:border-pink-800 dark:text-pink-400 dark:hover:bg-pink-900/30"
                            title="View on Instagram"
                          >
                            <Instagram className="h-4 w-4" />
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-neutral-500">
            Showing {(page - 1) * data.limit + 1} to{' '}
            {Math.min(page * data.limit, data.total)} of {data.total}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-lg border border-neutral-200 p-2 text-neutral-600 hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-400"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
              disabled={page === data.totalPages}
              className="rounded-lg border border-neutral-200 p-2 text-neutral-600 hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-400"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
