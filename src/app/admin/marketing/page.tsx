'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Mail,
  Send,
  Users,
  BarChart3,
  Plus,
  Eye,
  MousePointer,
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Calendar,
} from 'lucide-react'

interface CampaignStats {
  totalCampaigns: number
  totalSent: number
  totalOpened: number
  totalClicked: number
  avgOpenRate: number
  avgClickRate: number
}

interface Campaign {
  id: string
  name: string
  subject: string
  status: 'draft' | 'scheduled' | 'sending' | 'sent'
  recipientCount: number
  sentAt?: string
  scheduledAt?: string
  openRate?: number
  clickRate?: number
  createdAt: string
}

// Mock data for now - will be replaced with API
const MOCK_CAMPAIGNS: Campaign[] = [
  {
    id: '1',
    name: 'Holiday Promotion 2024',
    subject: 'Special Holiday Rates for Real Estate Photography',
    status: 'sent',
    recipientCount: 245,
    sentAt: '2024-12-20T10:00:00Z',
    openRate: 42.5,
    clickRate: 12.3,
    createdAt: '2024-12-18T09:00:00Z',
  },
  {
    id: '2',
    name: 'New Year Announcement',
    subject: 'Exciting Updates for 2025 - New Services Available',
    status: 'scheduled',
    recipientCount: 312,
    scheduledAt: '2025-01-02T09:00:00Z',
    createdAt: '2024-12-27T14:00:00Z',
  },
  {
    id: '3',
    name: 'Drone Services Launch',
    subject: 'Introducing Our New FAA-Certified Drone Photography',
    status: 'draft',
    recipientCount: 0,
    createdAt: '2024-12-28T08:00:00Z',
  },
]

const MOCK_STATS: CampaignStats = {
  totalCampaigns: 24,
  totalSent: 5832,
  totalOpened: 2478,
  totalClicked: 643,
  avgOpenRate: 42.5,
  avgClickRate: 11.0,
}

export default function MarketingDashboard() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [stats, setStats] = useState<CampaignStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // TODO: Replace with API call
    setTimeout(() => {
      setCampaigns(MOCK_CAMPAIGNS)
      setStats(MOCK_STATS)
      setLoading(false)
    }, 500)
  }, [])

  const getStatusColor = (status: Campaign['status']) => {
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

  const getStatusIcon = (status: Campaign['status']) => {
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

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-neutral-200 rounded" />
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-neutral-200 rounded-lg" />
            ))}
          </div>
          <div className="h-64 bg-neutral-200 rounded-lg" />
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Email Marketing</h1>
          <p className="text-neutral-600">
            Create and manage email campaigns to your agents
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

      {/* Stats Grid */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border border-neutral-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Mail className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-neutral-600">Total Campaigns</p>
                <p className="text-2xl font-bold text-neutral-900">{stats.totalCampaigns}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-neutral-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Send className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-neutral-600">Emails Sent</p>
                <p className="text-2xl font-bold text-neutral-900">{stats.totalSent.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-neutral-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Eye className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-neutral-600">Avg Open Rate</p>
                <p className="text-2xl font-bold text-neutral-900">{stats.avgOpenRate}%</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-neutral-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <MousePointer className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-neutral-600">Avg Click Rate</p>
                <p className="text-2xl font-bold text-neutral-900">{stats.avgClickRate}%</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href="/admin/marketing/campaigns"
          className="bg-white rounded-lg border border-neutral-200 p-4 hover:border-blue-300 hover:shadow-sm transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
              <Mail className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="font-medium text-neutral-900">All Campaigns</p>
              <p className="text-sm text-neutral-500">View and manage campaigns</p>
            </div>
          </div>
        </Link>

        <Link
          href="/admin/marketing/campaigns/new"
          className="bg-white rounded-lg border border-neutral-200 p-4 hover:border-green-300 hover:shadow-sm transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg group-hover:bg-green-200 transition-colors">
              <Plus className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="font-medium text-neutral-900">Create Campaign</p>
              <p className="text-sm text-neutral-500">Send a new email blast</p>
            </div>
          </div>
        </Link>

        <Link
          href="/admin/templates"
          className="bg-white rounded-lg border border-neutral-200 p-4 hover:border-purple-300 hover:shadow-sm transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors">
              <BarChart3 className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="font-medium text-neutral-900">Email Templates</p>
              <p className="text-sm text-neutral-500">Manage reusable templates</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Recent Campaigns */}
      <div className="bg-white rounded-lg border border-neutral-200">
        <div className="px-4 py-3 border-b border-neutral-200">
          <h2 className="font-semibold text-neutral-900">Recent Campaigns</h2>
        </div>
        <div className="divide-y divide-neutral-100">
          {campaigns.map((campaign) => (
            <Link
              key={campaign.id}
              href={`/admin/marketing/campaigns/${campaign.id}`}
              className="flex items-center justify-between p-4 hover:bg-neutral-50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="p-2 bg-neutral-100 rounded-lg">
                  <Mail className="h-5 w-5 text-neutral-600" />
                </div>
                <div>
                  <p className="font-medium text-neutral-900">{campaign.name}</p>
                  <p className="text-sm text-neutral-500">{campaign.subject}</p>
                </div>
              </div>

              <div className="flex items-center gap-6">
                {/* Recipients */}
                <div className="text-right">
                  <div className="flex items-center gap-1 text-sm text-neutral-600">
                    <Users className="h-4 w-4" />
                    {campaign.recipientCount.toLocaleString()}
                  </div>
                </div>

                {/* Performance */}
                {campaign.status === 'sent' && campaign.openRate !== undefined && (
                  <div className="text-right min-w-[80px]">
                    <div className="flex items-center gap-1 text-sm text-green-600">
                      <TrendingUp className="h-4 w-4" />
                      {campaign.openRate}% open
                    </div>
                  </div>
                )}

                {/* Status */}
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(
                    campaign.status
                  )}`}
                >
                  {getStatusIcon(campaign.status)}
                  {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                </span>

                {/* Date */}
                <div className="text-right text-sm text-neutral-500 min-w-[100px]">
                  {campaign.status === 'scheduled' && campaign.scheduledAt && (
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {new Date(campaign.scheduledAt).toLocaleDateString()}
                    </div>
                  )}
                  {campaign.status === 'sent' && campaign.sentAt && (
                    <span>{new Date(campaign.sentAt).toLocaleDateString()}</span>
                  )}
                  {campaign.status === 'draft' && (
                    <span>{new Date(campaign.createdAt).toLocaleDateString()}</span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>

        {campaigns.length === 0 && (
          <div className="p-8 text-center">
            <Mail className="h-12 w-12 text-neutral-300 mx-auto mb-3" />
            <p className="text-neutral-600">No campaigns yet</p>
            <p className="text-sm text-neutral-500">Create your first email campaign</p>
          </div>
        )}

        {campaigns.length > 0 && (
          <div className="px-4 py-3 border-t border-neutral-200">
            <Link
              href="/admin/marketing/campaigns"
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              View all campaigns →
            </Link>
          </div>
        )}
      </div>

      {/* Tips Section */}
      <div className="bg-blue-50 rounded-lg border border-blue-100 p-4">
        <h3 className="font-medium text-blue-900 mb-2">Email Marketing Tips</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Best time to send: Tuesday-Thursday, 10 AM - 2 PM EST</li>
          <li>• Keep subject lines under 50 characters for better open rates</li>
          <li>• Personalize emails with agent names for higher engagement</li>
          <li>• Include a clear call-to-action in every campaign</li>
        </ul>
      </div>
    </div>
  )
}
