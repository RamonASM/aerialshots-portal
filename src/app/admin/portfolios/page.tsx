'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  UserCircle,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Instagram,
  Eye,
  Home,
  Star,
  ExternalLink,
  Image as ImageIcon,
  AlertCircle,
  CheckCircle,
  XCircle,
} from 'lucide-react'
import { SkeletonGrid } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'

interface Agent {
  id: string
  name: string
  email: string
  phone: string | null
  headshot_url: string | null
  logo_url: string | null
  brand_color: string | null
  bio: string | null
  slug: string
  referral_code: string | null
  referral_tier: string
  instagram_url: string | null
  credit_balance: number
  lifetime_credits: number
  created_at: string
  listingsCount: number
  campaignsCount: number
  portfolioViews: number
  instagramConnected: boolean
}

interface PortfoliosData {
  agents: Agent[]
  total: number
  page: number
  limit: number
  totalPages: number
}

const TIER_COLORS: Record<string, string> = {
  bronze: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  silver: 'bg-neutral-200 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-300',
  gold: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  platinum: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
}

export default function PortfoliosPage() {
  const [data, setData] = useState<PortfoliosData | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [instagramFilter, setInstagramFilter] = useState('all')
  const [tierFilter, setTierFilter] = useState('all')
  const [page, setPage] = useState(1)

  const fetchPortfolios = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      params.set('page', page.toString())
      params.set('limit', '12')
      if (search) params.set('search', search)
      if (instagramFilter !== 'all') params.set('instagram', instagramFilter)
      if (tierFilter !== 'all') params.set('tier', tierFilter)

      const response = await fetch(`/api/admin/portfolios?${params}`)
      if (!response.ok) throw new Error('Failed to fetch')
      const result = await response.json()
      setData(result)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }, [page, search, instagramFilter, tierFilter])

  useEffect(() => {
    fetchPortfolios()
  }, [fetchPortfolios])

  useEffect(() => {
    setPage(1)
  }, [search, instagramFilter, tierFilter])

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Agent Portfolios</h1>
          <p className="text-neutral-500 dark:text-neutral-400">
            Manage agent profiles, Instagram connections, and credits
          </p>
        </div>
      </div>

      {/* Stats */}
      {data && (
        <div className="grid gap-4 sm:grid-cols-4">
          <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-blue-100 p-2 dark:bg-blue-900/30">
                <UserCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-neutral-900 dark:text-white">{data.total}</p>
                <p className="text-sm text-neutral-500">Total Agents</p>
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
                  {data.agents.filter((a) => a.instagramConnected).length}
                </p>
                <p className="text-sm text-neutral-500">Instagram Connected</p>
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-yellow-100 p-2 dark:bg-yellow-900/30">
                <Star className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                  {data.agents.filter((a) => a.referral_tier === 'gold' || a.referral_tier === 'platinum').length}
                </p>
                <p className="text-sm text-neutral-500">Top Tier Agents</p>
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-green-100 p-2 dark:bg-green-900/30">
                <Eye className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                  {data.agents.reduce((sum, a) => sum + (a.portfolioViews || 0), 0).toLocaleString()}
                </p>
                <p className="text-sm text-neutral-500">Total Views</p>
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
            placeholder="Search by name, email, or company..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-neutral-200 bg-white py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={instagramFilter}
            onChange={(e) => setInstagramFilter(e.target.value)}
            className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
          >
            <option value="all">All Instagram</option>
            <option value="connected">Connected</option>
            <option value="not_connected">Not Connected</option>
          </select>
          <select
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value)}
            className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
          >
            <option value="all">All Tiers</option>
            <option value="platinum">Platinum</option>
            <option value="gold">Gold</option>
            <option value="silver">Silver</option>
            <option value="bronze">Bronze</option>
          </select>
          <button
            onClick={fetchPortfolios}
            className="rounded-lg border border-neutral-200 bg-white p-2 text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Agents Grid */}
      {loading ? (
        <SkeletonGrid items={6} cols={3} />
      ) : data?.agents.length === 0 ? (
        <EmptyState
          icon={UserCircle}
          title="No agents found"
          description="Adjust your filters or search to find agents."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data?.agents.map((agent) => (
            <div
              key={agent.id}
              className="group overflow-hidden rounded-lg border border-neutral-200 bg-white transition-shadow hover:shadow-lg dark:border-neutral-800 dark:bg-neutral-900"
            >
              {/* Header with Brand Color */}
              <div
                className="h-16 bg-gradient-to-r from-blue-500 to-blue-600"
                style={
                  agent.brand_color
                    ? {
                        background: `linear-gradient(135deg, ${agent.brand_color}, ${agent.brand_color}dd)`,
                      }
                    : undefined
                }
              />

              {/* Profile Section */}
              <div className="relative px-4 pb-4">
                {/* Avatar */}
                <div className="-mt-10 mb-3 flex items-end justify-between">
                  <div className="relative">
                    {agent.headshot_url ? (
                      <img
                        src={agent.headshot_url}
                        alt={agent.name}
                        className="h-20 w-20 rounded-full border-4 border-white object-cover dark:border-neutral-900"
                      />
                    ) : (
                      <div className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-white bg-neutral-200 dark:border-neutral-900 dark:bg-neutral-700">
                        <UserCircle className="h-12 w-12 text-neutral-400" />
                      </div>
                    )}
                    {agent.instagramConnected && (
                      <div className="absolute -bottom-1 -right-1 rounded-full border-2 border-white bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 p-1 dark:border-neutral-900">
                        <Instagram className="h-3 w-3 text-white" />
                      </div>
                    )}
                  </div>

                  {/* Tier Badge */}
                  {agent.referral_tier && (
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${
                        TIER_COLORS[agent.referral_tier] || TIER_COLORS.bronze
                      }`}
                    >
                      {agent.referral_tier}
                    </span>
                  )}
                </div>

                {/* Info */}
                <h3 className="font-semibold text-neutral-900 dark:text-white">{agent.name}</h3>
                <p className="text-sm text-neutral-500">{agent.email}</p>

                {/* Stats */}
                <div className="mt-3 flex items-center gap-4 text-sm text-neutral-600 dark:text-neutral-400">
                  <div className="flex items-center gap-1">
                    <Home className="h-4 w-4" />
                    <span>{agent.listingsCount}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <ImageIcon className="h-4 w-4" />
                    <span>{agent.campaignsCount}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Eye className="h-4 w-4" />
                    <span>{agent.portfolioViews?.toLocaleString() || 0}</span>
                  </div>
                </div>

                {/* Instagram Status */}
                <div className="mt-3 flex items-center justify-between rounded-lg bg-neutral-50 p-2 dark:bg-neutral-800">
                  <div className="flex items-center gap-2">
                    <Instagram
                      className={`h-4 w-4 ${
                        agent.instagramConnected ? 'text-pink-500' : 'text-neutral-400'
                      }`}
                    />
                    {agent.instagramConnected && agent.instagram_url ? (
                      <span className="text-sm text-neutral-700 dark:text-neutral-300">
                        {agent.instagram_url.replace(/^https?:\/\/(www\.)?instagram\.com\//, '@').replace(/\/$/, '')}
                      </span>
                    ) : (
                      <span className="text-sm text-neutral-500">Not connected</span>
                    )}
                  </div>
                  {agent.instagramConnected ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-neutral-400" />
                  )}
                </div>

                {/* Actions */}
                <div className="mt-4 flex gap-2">
                  <Link
                    href={`/admin/portfolios/${agent.slug || agent.id}`}
                    className="flex-1 rounded-lg border border-neutral-200 px-3 py-2 text-center text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
                  >
                    Edit Profile
                  </Link>
                  {agent.slug && (
                    <a
                      href={`/agents/${agent.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg border border-neutral-200 p-2 text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800"
                      title="View Public Profile"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
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
