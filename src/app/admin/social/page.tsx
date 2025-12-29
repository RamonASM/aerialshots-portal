'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Instagram,
  Search,
  RefreshCw,
  Filter,
  ExternalLink,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  Calendar,
  Users,
  Send,
  RotateCcw,
  Eye,
  Loader2,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SkeletonGrid } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'

interface InstagramConnection {
  id: string
  instagram_user_id: string
  instagram_username: string
  account_type: string
  status: string
  profile_picture_url: string | null
  followers_count: number | null
  last_synced_at: string | null
  created_at: string
  agent: {
    id: string
    name: string
    email: string
    headshot_url: string | null
  } | null
}

interface ScheduledPost {
  id: string
  media_urls: string[]
  caption: string
  hashtags: string[] | null
  scheduled_for: string
  timezone: string
  status: string
  instagram_media_id: string | null
  instagram_permalink: string | null
  published_at: string | null
  error_message: string | null
  retry_count: number
  created_at: string
  agent: {
    id: string
    name: string
    email: string
    headshot_url: string | null
  } | null
  carousel: {
    id: string
    carousel_type: string
    title: string | null
  } | null
}

interface SocialData {
  connections: InstagramConnection[]
  posts: ScheduledPost[]
  stats: {
    totalConnections: number
    activeConnections: number
    scheduled: number
    published: number
    failed: number
  }
  total: number
  page: number
  limit: number
  totalPages: number
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  draft: {
    label: 'Draft',
    color: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300',
    icon: Clock,
  },
  scheduled: {
    label: 'Scheduled',
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    icon: Calendar,
  },
  publishing: {
    label: 'Publishing',
    color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    icon: Loader2,
  },
  published: {
    label: 'Published',
    color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    icon: CheckCircle,
  },
  failed: {
    label: 'Failed',
    color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    icon: XCircle,
  },
  cancelled: {
    label: 'Cancelled',
    color: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300',
    icon: XCircle,
  },
}

const CONNECTION_STATUS: Record<string, { color: string; label: string }> = {
  active: { color: 'bg-green-500', label: 'Active' },
  expired: { color: 'bg-red-500', label: 'Expired' },
  revoked: { color: 'bg-neutral-500', label: 'Revoked' },
  pending: { color: 'bg-yellow-500', label: 'Pending' },
}

export default function SocialMediaHubPage() {
  const [data, setData] = useState<SocialData | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [page, setPage] = useState(1)
  const [activeTab, setActiveTab] = useState<'posts' | 'connections'>('posts')

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      params.set('page', page.toString())
      params.set('limit', '20')
      if (status !== 'all') params.set('status', status)

      const res = await fetch(`/api/admin/social?${params}`)
      if (!res.ok) throw new Error('Failed to fetch')
      const result = await res.json()
      setData(result)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }, [page, status])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    setPage(1)
  }, [status])

  const filteredConnections = data?.connections.filter(
    (conn) =>
      !search ||
      conn.instagram_username.toLowerCase().includes(search.toLowerCase()) ||
      conn.agent?.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Social Media Hub</h1>
          <p className="mt-1 text-neutral-600 dark:text-neutral-400">
            Manage Instagram connections and scheduled posts
          </p>
        </div>
        <Button onClick={fetchData} variant="outline" disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      {data && (
        <div className="grid gap-4 sm:grid-cols-5">
          <Card>
            <CardContent className="flex items-center gap-3 pt-4">
              <div className="rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 p-2">
                <Instagram className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                  {data.stats.totalConnections}
                </p>
                <p className="text-xs text-neutral-500">Connections</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 pt-4">
              <div className="rounded-full bg-green-100 p-2 dark:bg-green-900/30">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                  {data.stats.activeConnections}
                </p>
                <p className="text-xs text-neutral-500">Active</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 pt-4">
              <div className="rounded-full bg-blue-100 p-2 dark:bg-blue-900/30">
                <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                  {data.stats.scheduled}
                </p>
                <p className="text-xs text-neutral-500">Scheduled</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 pt-4">
              <div className="rounded-full bg-green-100 p-2 dark:bg-green-900/30">
                <Send className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                  {data.stats.published}
                </p>
                <p className="text-xs text-neutral-500">Published</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 pt-4">
              <div className="rounded-full bg-red-100 p-2 dark:bg-red-900/30">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                  {data.stats.failed}
                </p>
                <p className="text-xs text-neutral-500">Failed</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-neutral-200 dark:border-neutral-700">
        <button
          onClick={() => setActiveTab('posts')}
          className={`px-4 py-2 text-sm font-medium ${
            activeTab === 'posts'
              ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
              : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
          }`}
        >
          <Calendar className="mr-2 inline-block h-4 w-4" />
          Scheduled Posts ({data?.total || 0})
        </button>
        <button
          onClick={() => setActiveTab('connections')}
          className={`px-4 py-2 text-sm font-medium ${
            activeTab === 'connections'
              ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
              : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
          }`}
        >
          <Users className="mr-2 inline-block h-4 w-4" />
          Connections ({data?.connections.length || 0})
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        {activeTab === 'connections' && (
          <div className="relative flex-1 md:max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <Input
              placeholder="Search connections..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        )}
        {activeTab === 'posts' && (
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-neutral-400" />
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
            >
              <option value="all">All Status</option>
              <option value="scheduled">Scheduled</option>
              <option value="publishing">Publishing</option>
              <option value="published">Published</option>
              <option value="failed">Failed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <SkeletonGrid items={6} />
      ) : activeTab === 'connections' ? (
        /* Connections Grid */
        !filteredConnections || filteredConnections.length === 0 ? (
          <EmptyState
            icon={Instagram}
            title="No Instagram connections"
            description="Agents can connect their Instagram accounts from their dashboard."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredConnections.map((conn) => {
              const statusInfo = CONNECTION_STATUS[conn.status] || CONNECTION_STATUS.pending

              return (
                <Card key={conn.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      {/* Profile Picture */}
                      <div className="relative">
                        {conn.profile_picture_url ? (
                          <img
                            src={conn.profile_picture_url}
                            alt={conn.instagram_username}
                            className="h-14 w-14 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500">
                            <Instagram className="h-7 w-7 text-white" />
                          </div>
                        )}
                        <div
                          className={`absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-white dark:border-neutral-900 ${statusInfo.color}`}
                          title={statusInfo.label}
                        />
                      </div>

                      {/* Info */}
                      <div className="min-w-0 flex-1">
                        <a
                          href={`https://instagram.com/${conn.instagram_username}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 font-semibold text-neutral-900 hover:text-blue-600 dark:text-white"
                        >
                          @{conn.instagram_username}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                        {conn.agent && (
                          <p className="mt-0.5 truncate text-sm text-neutral-500">
                            {conn.agent.name}
                          </p>
                        )}
                        <div className="mt-2 flex items-center gap-3 text-xs text-neutral-500">
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs ${
                              statusInfo.color === 'bg-green-500'
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                : statusInfo.color === 'bg-red-500'
                                  ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                  : 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800'
                            }`}
                          >
                            {statusInfo.label}
                          </span>
                          {conn.followers_count && (
                            <span>{conn.followers_count.toLocaleString()} followers</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Agent Info */}
                    {conn.agent && (
                      <div className="mt-4 flex items-center gap-2 rounded-lg bg-neutral-50 p-2 dark:bg-neutral-800">
                        {conn.agent.headshot_url ? (
                          <img
                            src={conn.agent.headshot_url}
                            alt={conn.agent.name}
                            className="h-8 w-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-200 dark:bg-neutral-700">
                            <span className="text-sm font-medium">
                              {conn.agent.name.charAt(0)}
                            </span>
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-neutral-900 dark:text-white">
                            {conn.agent.name}
                          </p>
                          <p className="truncate text-xs text-neutral-500">{conn.agent.email}</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )
      ) : /* Posts List */
      !data?.posts || data.posts.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="No scheduled posts"
          description="Posts will appear here when agents schedule content from their campaigns."
        />
      ) : (
        <>
          <div className="space-y-4">
            {data.posts.map((post) => {
              const statusConfig = STATUS_CONFIG[post.status] || STATUS_CONFIG.draft
              const StatusIcon = statusConfig.icon

              return (
                <Card key={post.id} className="overflow-hidden">
                  <div className="flex flex-col sm:flex-row">
                    {/* Media Preview */}
                    <div className="relative h-40 w-full sm:h-auto sm:w-48">
                      {post.media_urls && post.media_urls[0] ? (
                        <img
                          src={post.media_urls[0]}
                          alt="Post media"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center bg-neutral-100 dark:bg-neutral-800">
                          <ImageIcon className="h-8 w-8 text-neutral-400" />
                        </div>
                      )}
                      {post.media_urls && post.media_urls.length > 1 && (
                        <div className="absolute bottom-2 right-2 rounded bg-black/60 px-2 py-1 text-xs text-white">
                          +{post.media_urls.length - 1} more
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          {/* Status Badge */}
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${statusConfig.color}`}
                          >
                            <StatusIcon
                              className={`h-3 w-3 ${post.status === 'publishing' ? 'animate-spin' : ''}`}
                            />
                            {statusConfig.label}
                          </span>

                          {/* Caption Preview */}
                          <p className="mt-2 line-clamp-2 text-sm text-neutral-700 dark:text-neutral-300">
                            {post.caption}
                          </p>

                          {/* Hashtags */}
                          {post.hashtags && post.hashtags.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {post.hashtags.slice(0, 5).map((tag) => (
                                <span
                                  key={tag}
                                  className="rounded bg-neutral-100 px-1.5 py-0.5 text-xs text-blue-600 dark:bg-neutral-800 dark:text-blue-400"
                                >
                                  #{tag}
                                </span>
                              ))}
                              {post.hashtags.length > 5 && (
                                <span className="text-xs text-neutral-500">
                                  +{post.hashtags.length - 5}
                                </span>
                              )}
                            </div>
                          )}

                          {/* Error Message */}
                          {post.status === 'failed' && post.error_message && (
                            <div className="mt-2 flex items-start gap-2 rounded-lg bg-red-50 p-2 text-xs text-red-700 dark:bg-red-900/20 dark:text-red-400">
                              <AlertTriangle className="mt-0.5 h-3 w-3 flex-shrink-0" />
                              <span>{post.error_message}</span>
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          {post.instagram_permalink && (
                            <a
                              href={post.instagram_permalink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="rounded p-2 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800"
                              title="View on Instagram"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          )}
                          {post.status === 'failed' && (
                            <button
                              className="rounded p-2 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800"
                              title="Retry"
                            >
                              <RotateCcw className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Meta Info */}
                      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-neutral-500">
                        {/* Agent */}
                        {post.agent && (
                          <div className="flex items-center gap-1.5">
                            {post.agent.headshot_url ? (
                              <img
                                src={post.agent.headshot_url}
                                alt={post.agent.name}
                                className="h-5 w-5 rounded-full object-cover"
                              />
                            ) : (
                              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-neutral-200 dark:bg-neutral-700">
                                <span className="text-[10px] font-medium">
                                  {post.agent.name.charAt(0)}
                                </span>
                              </div>
                            )}
                            {post.agent.name}
                          </div>
                        )}

                        {/* Schedule Time */}
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {post.status === 'published' && post.published_at
                            ? `Published ${new Date(post.published_at).toLocaleString()}`
                            : `Scheduled for ${new Date(post.scheduled_for).toLocaleString()}`}
                        </div>

                        {/* Carousel Type */}
                        {post.carousel && (
                          <div className="flex items-center gap-1">
                            <ImageIcon className="h-3 w-3" />
                            {post.carousel.carousel_type.replace(/_/g, ' ')}
                          </div>
                        )}

                        {/* Retry Count */}
                        {post.retry_count > 0 && (
                          <span className="text-orange-600 dark:text-orange-400">
                            {post.retry_count} retries
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
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
