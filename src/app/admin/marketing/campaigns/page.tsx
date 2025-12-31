'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Mail,
  Send,
  Users,
  Plus,
  Search,
  Filter,
  Eye,
  MousePointer,
  Clock,
  CheckCircle2,
  AlertCircle,
  MoreHorizontal,
  Trash2,
  Copy,
  Calendar,
  ArrowUpDown,
  RefreshCw,
} from 'lucide-react'

type CampaignStatus = 'draft' | 'scheduled' | 'sending' | 'sent' | 'cancelled'

interface Campaign {
  id: string
  name: string
  subject: string
  status: CampaignStatus
  recipient_count: number
  sent_count?: number
  open_count?: number
  click_count?: number
  sent_at?: string
  scheduled_at?: string
  open_rate?: number
  click_rate?: number
  created_at: string
  created_by?: string
}

interface CampaignStats {
  totalCampaigns: number
  drafts: number
  scheduled: number
  sent: number
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [stats, setStats] = useState<CampaignStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<CampaignStatus | 'all'>('all')
  const [sortBy, setSortBy] = useState<'created_at' | 'sent_at' | 'name'>('created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([])
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const fetchCampaigns = useCallback(async () => {
    try {
      setError(null)
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (searchQuery) params.set('search', searchQuery)

      const response = await fetch(`/api/admin/marketing/campaigns?${params}`)
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Please log in to view campaigns')
        }
        throw new Error('Failed to fetch campaigns')
      }

      const data = await response.json()
      setCampaigns(data.campaigns || [])
      setStats(data.stats || null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load campaigns')
    } finally {
      setLoading(false)
    }
  }, [statusFilter, searchQuery])

  useEffect(() => {
    fetchCampaigns()
  }, [fetchCampaigns])

  const handleDelete = async (ids: string[]) => {
    if (!confirm(`Delete ${ids.length} campaign(s)?`)) return

    setActionLoading('delete')
    try {
      await Promise.all(
        ids.map(id =>
          fetch(`/api/admin/marketing/campaigns/${id}`, { method: 'DELETE' })
        )
      )
      setSelectedCampaigns([])
      await fetchCampaigns()
    } catch {
      setError('Failed to delete campaigns')
    } finally {
      setActionLoading(null)
    }
  }

  const handleDuplicate = async (ids: string[]) => {
    setActionLoading('duplicate')
    try {
      for (const id of ids) {
        const campaign = campaigns.find(c => c.id === id)
        if (campaign) {
          await fetch('/api/admin/marketing/campaigns', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: `${campaign.name} (Copy)`,
              subject: campaign.subject,
              body: '', // Would need to fetch full campaign to get body
            }),
          })
        }
      }
      setSelectedCampaigns([])
      await fetchCampaigns()
    } catch {
      setError('Failed to duplicate campaigns')
    } finally {
      setActionLoading(null)
    }
  }

  const getStatusColor = (status: CampaignStatus) => {
    switch (status) {
      case 'draft':
        return 'bg-neutral-100 text-neutral-700'
      case 'scheduled':
        return 'bg-blue-100 text-blue-700'
      case 'sending':
        return 'bg-amber-100 text-amber-700'
      case 'sent':
        return 'bg-green-100 text-green-700'
      case 'cancelled':
        return 'bg-red-100 text-red-700'
    }
  }

  const getStatusIcon = (status: CampaignStatus) => {
    switch (status) {
      case 'draft':
        return <AlertCircle className="h-3.5 w-3.5" />
      case 'scheduled':
        return <Clock className="h-3.5 w-3.5" />
      case 'sending':
        return <Send className="h-3.5 w-3.5" />
      case 'sent':
        return <CheckCircle2 className="h-3.5 w-3.5" />
      case 'cancelled':
        return <Trash2 className="h-3.5 w-3.5" />
    }
  }

  // Sort campaigns client-side (filtering is done server-side)
  const sortedCampaigns = [...campaigns].sort((a, b) => {
    let aVal: string | number = ''
    let bVal: string | number = ''

    switch (sortBy) {
      case 'created_at':
        aVal = a.created_at
        bVal = b.created_at
        break
      case 'sent_at':
        aVal = a.sent_at || a.scheduled_at || a.created_at
        bVal = b.sent_at || b.scheduled_at || b.created_at
        break
      case 'name':
        aVal = a.name.toLowerCase()
        bVal = b.name.toLowerCase()
        break
    }

    if (sortOrder === 'asc') {
      return aVal > bVal ? 1 : -1
    }
    return aVal < bVal ? 1 : -1
  })

  const toggleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('desc')
    }
  }

  const toggleSelectAll = () => {
    if (selectedCampaigns.length === sortedCampaigns.length) {
      setSelectedCampaigns([])
    } else {
      setSelectedCampaigns(sortedCampaigns.map((c) => c.id))
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedCampaigns((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    )
  }

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-neutral-200 rounded" />
          <div className="h-12 bg-neutral-200 rounded-lg" />
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-neutral-200 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 space-y-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">{error}</p>
          <button
            onClick={() => {
              setLoading(true)
              fetchCampaigns()
            }}
            className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
          >
            Try again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Email Campaigns</h1>
          <p className="text-neutral-600">
            {stats?.totalCampaigns || campaigns.length} campaigns • {stats?.sent || campaigns.filter((c) => c.status === 'sent').length}{' '}
            sent
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setLoading(true)
              fetchCampaigns()
            }}
            className="flex items-center gap-2 px-3 py-2 border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <Link
            href="/admin/marketing/campaigns/new"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            New Campaign
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
          <input
            type="text"
            placeholder="Search campaigns..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-neutral-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as CampaignStatus | 'all')}
            className="px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="scheduled">Scheduled</option>
            <option value="sending">Sending</option>
            <option value="sent">Sent</option>
          </select>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedCampaigns.length > 0 && (
        <div className="flex items-center gap-4 p-3 bg-blue-50 rounded-lg">
          <span className="text-sm text-blue-700">
            {selectedCampaigns.length} selected
          </span>
          <button
            onClick={() => handleDuplicate(selectedCampaigns)}
            disabled={actionLoading === 'duplicate'}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-white rounded border border-blue-200 text-blue-700 hover:bg-blue-100 disabled:opacity-50"
          >
            <Copy className="h-4 w-4" />
            {actionLoading === 'duplicate' ? 'Duplicating...' : 'Duplicate'}
          </button>
          <button
            onClick={() => handleDelete(selectedCampaigns)}
            disabled={actionLoading === 'delete'}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-white rounded border border-red-200 text-red-700 hover:bg-red-50 disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
            {actionLoading === 'delete' ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      )}

      {/* Campaigns Table */}
      <div className="bg-white rounded-lg border border-neutral-200 overflow-x-auto">
        <table className="w-full min-w-[900px]">
          <thead className="bg-neutral-50 border-b border-neutral-200">
            <tr>
              <th className="px-4 py-3 text-left">
                <input
                  type="checkbox"
                  checked={
                    selectedCampaigns.length === sortedCampaigns.length &&
                    sortedCampaigns.length > 0
                  }
                  onChange={toggleSelectAll}
                  className="rounded border-neutral-300"
                />
              </th>
              <th className="px-4 py-3 text-left">
                <button
                  onClick={() => toggleSort('name')}
                  className="flex items-center gap-1 text-xs font-medium text-neutral-600 uppercase tracking-wider hover:text-neutral-900"
                >
                  Campaign
                  <ArrowUpDown className="h-3.5 w-3.5" />
                </button>
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">
                Recipients
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">
                Performance
              </th>
              <th className="px-4 py-3 text-left">
                <button
                  onClick={() => toggleSort('created_at')}
                  className="flex items-center gap-1 text-xs font-medium text-neutral-600 uppercase tracking-wider hover:text-neutral-900"
                >
                  Date
                  <ArrowUpDown className="h-3.5 w-3.5" />
                </button>
              </th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {sortedCampaigns.map((campaign) => (
              <tr
                key={campaign.id}
                className="hover:bg-neutral-50 transition-colors"
              >
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedCampaigns.includes(campaign.id)}
                    onChange={() => toggleSelect(campaign.id)}
                    className="rounded border-neutral-300"
                  />
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/marketing/campaigns/${campaign.id}`}
                    className="block group"
                  >
                    <p className="font-medium text-neutral-900 group-hover:text-blue-600">
                      {campaign.name}
                    </p>
                    <p className="text-sm text-neutral-500 truncate max-w-xs">
                      {campaign.subject}
                    </p>
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(
                      campaign.status
                    )}`}
                  >
                    {getStatusIcon(campaign.status)}
                    {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5 text-sm text-neutral-600">
                    <Users className="h-4 w-4" />
                    {campaign.recipient_count > 0
                      ? campaign.recipient_count.toLocaleString()
                      : '-'}
                  </div>
                </td>
                <td className="px-4 py-3">
                  {campaign.status === 'sent' && campaign.open_rate !== undefined ? (
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1 text-purple-600">
                        <Eye className="h-4 w-4" />
                        {campaign.open_rate}%
                      </div>
                      <div className="flex items-center gap-1 text-amber-600">
                        <MousePointer className="h-4 w-4" />
                        {campaign.click_rate}%
                      </div>
                    </div>
                  ) : (
                    <span className="text-sm text-neutral-400">-</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-neutral-600">
                  {campaign.status === 'scheduled' && campaign.scheduled_at && (
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {new Date(campaign.scheduled_at).toLocaleDateString()}
                    </div>
                  )}
                  {campaign.status === 'sent' && campaign.sent_at && (
                    <span>{new Date(campaign.sent_at).toLocaleDateString()}</span>
                  )}
                  {(campaign.status === 'draft' || campaign.status === 'sending' || campaign.status === 'cancelled') && (
                    <span>{new Date(campaign.created_at).toLocaleDateString()}</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <button className="p-1 hover:bg-neutral-100 rounded">
                    <MoreHorizontal className="h-4 w-4 text-neutral-400" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {sortedCampaigns.length === 0 && (
          <div className="p-8 text-center">
            <Mail className="h-12 w-12 text-neutral-300 mx-auto mb-3" />
            <p className="text-neutral-600">No campaigns found</p>
            <p className="text-sm text-neutral-500">
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Create your first campaign to get started'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
