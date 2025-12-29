'use client'

import { useState, useEffect } from 'react'
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
} from 'lucide-react'

type CampaignStatus = 'draft' | 'scheduled' | 'sending' | 'sent'

interface Campaign {
  id: string
  name: string
  subject: string
  status: CampaignStatus
  recipientCount: number
  sentCount?: number
  openCount?: number
  clickCount?: number
  sentAt?: string
  scheduledAt?: string
  openRate?: number
  clickRate?: number
  createdAt: string
  createdBy?: string
}

// Mock data - will be replaced with API
const MOCK_CAMPAIGNS: Campaign[] = [
  {
    id: '1',
    name: 'Holiday Promotion 2024',
    subject: 'Special Holiday Rates for Real Estate Photography',
    status: 'sent',
    recipientCount: 245,
    sentCount: 245,
    openCount: 104,
    clickCount: 30,
    sentAt: '2024-12-20T10:00:00Z',
    openRate: 42.5,
    clickRate: 12.3,
    createdAt: '2024-12-18T09:00:00Z',
    createdBy: 'John Smith',
  },
  {
    id: '2',
    name: 'Winter Service Update',
    subject: 'New Twilight Photography Package Available',
    status: 'sent',
    recipientCount: 312,
    sentCount: 310,
    openCount: 145,
    clickCount: 52,
    sentAt: '2024-12-15T14:00:00Z',
    openRate: 46.8,
    clickRate: 16.8,
    createdAt: '2024-12-13T11:00:00Z',
    createdBy: 'Jane Doe',
  },
  {
    id: '3',
    name: 'New Year Announcement',
    subject: 'Exciting Updates for 2025 - New Services Available',
    status: 'scheduled',
    recipientCount: 312,
    scheduledAt: '2025-01-02T09:00:00Z',
    createdAt: '2024-12-27T14:00:00Z',
    createdBy: 'John Smith',
  },
  {
    id: '4',
    name: 'Drone Services Launch',
    subject: 'Introducing Our New FAA-Certified Drone Photography',
    status: 'draft',
    recipientCount: 0,
    createdAt: '2024-12-28T08:00:00Z',
    createdBy: 'John Smith',
  },
  {
    id: '5',
    name: 'Q1 Pricing Update',
    subject: 'Important: Updated Pricing for 2025',
    status: 'draft',
    recipientCount: 0,
    createdAt: '2024-12-27T16:00:00Z',
    createdBy: 'Jane Doe',
  },
]

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<CampaignStatus | 'all'>('all')
  const [sortBy, setSortBy] = useState<'createdAt' | 'sentAt' | 'name'>('createdAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([])

  useEffect(() => {
    // TODO: Replace with API call
    setTimeout(() => {
      setCampaigns(MOCK_CAMPAIGNS)
      setLoading(false)
    }, 500)
  }, [])

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
    }
  }

  const filteredCampaigns = campaigns
    .filter((campaign) => {
      if (statusFilter !== 'all' && campaign.status !== statusFilter) return false
      if (
        searchQuery &&
        !campaign.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !campaign.subject.toLowerCase().includes(searchQuery.toLowerCase())
      )
        return false
      return true
    })
    .sort((a, b) => {
      let aVal: string | number = ''
      let bVal: string | number = ''

      switch (sortBy) {
        case 'createdAt':
          aVal = a.createdAt
          bVal = b.createdAt
          break
        case 'sentAt':
          aVal = a.sentAt || a.scheduledAt || a.createdAt
          bVal = b.sentAt || b.scheduledAt || b.createdAt
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
    if (selectedCampaigns.length === filteredCampaigns.length) {
      setSelectedCampaigns([])
    } else {
      setSelectedCampaigns(filteredCampaigns.map((c) => c.id))
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

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Email Campaigns</h1>
          <p className="text-neutral-600">
            {campaigns.length} campaigns • {campaigns.filter((c) => c.status === 'sent').length}{' '}
            sent
          </p>
        </div>
        <Link
          href="/admin/marketing/campaigns/new"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Campaign
        </Link>
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
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-white rounded border border-blue-200 text-blue-700 hover:bg-blue-100">
            <Copy className="h-4 w-4" />
            Duplicate
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-white rounded border border-red-200 text-red-700 hover:bg-red-50">
            <Trash2 className="h-4 w-4" />
            Delete
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
                    selectedCampaigns.length === filteredCampaigns.length &&
                    filteredCampaigns.length > 0
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
                  onClick={() => toggleSort('createdAt')}
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
            {filteredCampaigns.map((campaign) => (
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
                    {campaign.recipientCount > 0
                      ? campaign.recipientCount.toLocaleString()
                      : '-'}
                  </div>
                </td>
                <td className="px-4 py-3">
                  {campaign.status === 'sent' && campaign.openRate !== undefined ? (
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1 text-purple-600">
                        <Eye className="h-4 w-4" />
                        {campaign.openRate}%
                      </div>
                      <div className="flex items-center gap-1 text-amber-600">
                        <MousePointer className="h-4 w-4" />
                        {campaign.clickRate}%
                      </div>
                    </div>
                  ) : (
                    <span className="text-sm text-neutral-400">-</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-neutral-600">
                  {campaign.status === 'scheduled' && campaign.scheduledAt && (
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {new Date(campaign.scheduledAt).toLocaleDateString()}
                    </div>
                  )}
                  {campaign.status === 'sent' && campaign.sentAt && (
                    <span>{new Date(campaign.sentAt).toLocaleDateString()}</span>
                  )}
                  {(campaign.status === 'draft' || campaign.status === 'sending') && (
                    <span>{new Date(campaign.createdAt).toLocaleDateString()}</span>
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

        {filteredCampaigns.length === 0 && (
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
