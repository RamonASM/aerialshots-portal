'use client'

import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import {
  Gift,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
  Users,
  DollarSign,
  TrendingUp,
  Award,
  Link2,
  ExternalLink,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { SkeletonTable } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'

interface ReferralTier {
  id: string
  name: string
  min_referrals: number
  commission_percent: number
  color: string
}

interface AgentWithReferrals {
  id: string
  name: string
  email: string
  headshot_url: string | null
  referral_code: string | null
  referral_count: number
  referral_tier: string
  referral_earnings_cents: number
  tier_info: ReferralTier
}

interface ReferralsData {
  agents: AgentWithReferrals[]
  tiers: ReferralTier[]
  stats: {
    totalAgents: number
    agentsWithCodes: number
    totalReferrals: number
    totalEarnings: number
    byTier: Record<string, number>
  }
  total: number
  page: number
  limit: number
  totalPages: number
}

const TIER_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  bronze: {
    bg: 'bg-orange-100 dark:bg-orange-900/30',
    text: 'text-orange-700 dark:text-orange-400',
    border: 'border-orange-300 dark:border-orange-700',
  },
  silver: {
    bg: 'bg-neutral-100 dark:bg-neutral-700',
    text: 'text-neutral-700 dark:text-neutral-300',
    border: 'border-neutral-300 dark:border-neutral-600',
  },
  gold: {
    bg: 'bg-yellow-100 dark:bg-yellow-900/30',
    text: 'text-yellow-700 dark:text-yellow-400',
    border: 'border-yellow-300 dark:border-yellow-700',
  },
  platinum: {
    bg: 'bg-purple-100 dark:bg-purple-900/30',
    text: 'text-purple-700 dark:text-purple-400',
    border: 'border-purple-300 dark:border-purple-700',
  },
}

export default function ReferralsPage() {
  const [data, setData] = useState<ReferralsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [tier, setTier] = useState('')
  const [page, setPage] = useState(1)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  const fetchReferrals = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      params.set('page', page.toString())
      params.set('limit', '20')
      if (search) params.set('search', search)
      if (tier) params.set('tier', tier)

      const response = await fetch(`/api/admin/referrals?${params}`)
      if (!response.ok) throw new Error('Failed to fetch')
      const result = await response.json()
      setData(result)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }, [page, search, tier])

  useEffect(() => {
    fetchReferrals()
  }, [fetchReferrals])

  useEffect(() => {
    setPage(1)
  }, [search, tier])

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100)
  }

  const copyReferralLink = async (code: string) => {
    const link = `${window.location.origin}/ref/${code}`
    await navigator.clipboard.writeText(link)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const generateCode = async (agentId: string) => {
    try {
      const response = await fetch('/api/admin/referrals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent_id: agentId }),
      })
      if (!response.ok) throw new Error('Failed to generate code')
      fetchReferrals()
    } catch (error) {
      console.error('Error:', error)
      toast.error('Failed to generate referral code')
    }
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Referral Program</h1>
          <p className="text-neutral-500 dark:text-neutral-400">
            Track agent referrals and manage commission tiers
          </p>
        </div>
      </div>

      {/* Stats */}
      {data && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-blue-100 p-2 dark:bg-blue-900/30">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                  {data.stats.agentsWithCodes}
                </p>
                <p className="text-sm text-neutral-500">Agents with Codes</p>
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-emerald-100 p-2 dark:bg-emerald-900/30">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-600">{data.stats.totalReferrals}</p>
                <p className="text-sm text-neutral-500">Total Referrals</p>
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-purple-100 p-2 dark:bg-purple-900/30">
                <DollarSign className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-600">
                  {formatCurrency(data.stats.totalEarnings)}
                </p>
                <p className="text-sm text-neutral-500">Total Earnings</p>
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-yellow-100 p-2 dark:bg-yellow-900/30">
                <Award className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-yellow-600">{data.stats.byTier.gold || 0}</p>
                <p className="text-sm text-neutral-500">Gold+ Agents</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tier Legend */}
      {data && (
        <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
          <h3 className="mb-3 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
            Commission Tiers
          </h3>
          <div className="flex flex-wrap gap-4">
            {data.tiers.map((t) => {
              const colors = TIER_COLORS[t.id]
              return (
                <div
                  key={t.id}
                  className={cn(
                    'flex items-center gap-2 rounded-full border px-3 py-1',
                    colors?.bg,
                    colors?.border
                  )}
                >
                  <span className={cn('text-sm font-medium', colors?.text)}>{t.name}</span>
                  <span className="text-xs text-neutral-500">
                    {t.min_referrals}+ refs = {t.commission_percent}%
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Search by name, email, or code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-neutral-200 bg-white py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={tier}
            onChange={(e) => setTier(e.target.value)}
            className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
          >
            <option value="">All Tiers</option>
            <option value="bronze">Bronze</option>
            <option value="silver">Silver</option>
            <option value="gold">Gold</option>
            <option value="platinum">Platinum</option>
          </select>
          <button
            onClick={fetchReferrals}
            className="rounded-lg border border-neutral-200 bg-white p-2 text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Agents Table */}
      {loading ? (
        <SkeletonTable rows={5} cols={6} />
      ) : data?.agents.length === 0 ? (
        <EmptyState
          icon={Gift}
          title="No referral agents found"
          description={search || tier ? 'Try adjusting your filters' : 'Agents will appear here once they have referral codes'}
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800">
                <th className="px-4 py-3 text-left text-sm font-medium text-neutral-600 dark:text-neutral-400">
                  Agent
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-neutral-600 dark:text-neutral-400">
                  Referral Code
                </th>
                <th className="px-4 py-3 text-center text-sm font-medium text-neutral-600 dark:text-neutral-400">
                  Tier
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-neutral-600 dark:text-neutral-400">
                  Referrals
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-neutral-600 dark:text-neutral-400">
                  Earnings
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-neutral-600 dark:text-neutral-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
              {data?.agents.map((agent) => {
                const tierColors = TIER_COLORS[agent.referral_tier]
                return (
                  <tr key={agent.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {agent.headshot_url ? (
                          <img
                            src={agent.headshot_url}
                            alt={agent.name}
                            className="h-10 w-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-200 dark:bg-neutral-700">
                            <span className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                              {agent.name.charAt(0)}
                            </span>
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-neutral-900 dark:text-white">{agent.name}</p>
                          <p className="text-sm text-neutral-500">{agent.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {agent.referral_code ? (
                        <div className="flex items-center gap-2">
                          <code className="rounded bg-neutral-100 px-2 py-1 font-mono text-sm dark:bg-neutral-800">
                            {agent.referral_code}
                          </code>
                          <button
                            onClick={() => copyReferralLink(agent.referral_code!)}
                            className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800"
                            title="Copy referral link"
                          >
                            {copiedCode === agent.referral_code ? (
                              <Check className="h-4 w-4 text-green-500" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => generateCode(agent.id)}
                          className="text-sm text-blue-600 hover:underline dark:text-blue-400"
                        >
                          Generate Code
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium',
                          tierColors?.bg,
                          tierColors?.text,
                          tierColors?.border
                        )}
                      >
                        {agent.tier_info.name}
                        <span className="text-[10px] opacity-75">{agent.tier_info.commission_percent}%</span>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-medium text-neutral-900 dark:text-white">{agent.referral_count}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-medium text-emerald-600">
                        {formatCurrency(agent.referral_earnings_cents)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {agent.referral_code && (
                          <a
                            href={`/ref/${agent.referral_code}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-lg p-2 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800"
                            title="View referral page"
                          >
                            <ExternalLink className="h-4 w-4" />
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
            Showing {(page - 1) * data.limit + 1} to {Math.min(page * data.limit, data.total)} of{' '}
            {data.total}
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
