'use client'

/**
 * Reviews Page Client Component
 *
 * Interactive review requests management
 */

import { useState } from 'react'
import { ReviewRequestSettings, ReviewRequestTemplate } from '@/lib/marketing/reviews/service'

interface ReviewRequest {
  id: string
  platform: string
  status: string
  scheduled_for: string
  sent_at?: string
  clicked_at?: string
  agent?: {
    name: string
    email: string
  }
}

interface ReviewsPageClientProps {
  stats: {
    total: number
    sent: number
    clicked: number
    completed: number
    clickRate: number
    completionRate: number
  }
  settings: ReviewRequestSettings | null
  recentRequests: ReviewRequest[]
  templates: ReviewRequestTemplate[]
}

export function ReviewsPageClient({
  stats,
  settings,
  recentRequests,
  templates,
}: ReviewsPageClientProps) {
  const [activeTab, setActiveTab] = useState<'requests' | 'settings' | 'templates'>('requests')
  const [isEnabled, setIsEnabled] = useState(settings?.is_enabled ?? false)
  const [isSaving, setIsSaving] = useState(false)

  const handleToggleEnabled = async () => {
    setIsSaving(true)
    try {
      const response = await fetch('/api/admin/marketing/reviews/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_enabled: !isEnabled }),
      })

      if (response.ok) {
        setIsEnabled(!isEnabled)
      }
    } catch (error) {
      console.error('Error updating settings:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-500/10 text-yellow-400',
    sent: 'bg-blue-500/10 text-blue-400',
    clicked: 'bg-purple-500/10 text-purple-400',
    completed: 'bg-green-500/10 text-green-400',
    cancelled: 'bg-gray-500/10 text-gray-400',
    bounced: 'bg-red-500/10 text-red-400',
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard label="Total Requests" value={stats.total} />
        <StatCard label="Sent" value={stats.sent} />
        <StatCard label="Click Rate" value={`${stats.clickRate}%`} />
        <StatCard label="Completion Rate" value={`${stats.completionRate}%`} />
      </div>

      {/* Enabled Toggle */}
      <div className="rounded-xl border border-white/[0.08] bg-[#1c1c1e] p-4 flex items-center justify-between">
        <div>
          <h3 className="text-white font-medium">Review Request Automation</h3>
          <p className="text-sm text-[#8e8e93]">
            Automatically request reviews after media delivery
          </p>
        </div>
        <button
          onClick={handleToggleEnabled}
          disabled={isSaving}
          className={`relative w-12 h-7 rounded-full transition-colors ${
            isEnabled ? 'bg-[#0077ff]' : 'bg-[#2c2c2e]'
          }`}
        >
          <span
            className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-transform ${
              isEnabled ? 'left-6' : 'left-1'
            }`}
          />
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2">
        {(['requests', 'settings', 'templates'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'bg-[#0077ff] text-white'
                : 'bg-[#1c1c1e] text-[#8e8e93] hover:text-white'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'requests' && (
        <div className="rounded-xl border border-white/[0.08] bg-[#1c1c1e] overflow-hidden">
          <div className="p-4 border-b border-white/[0.08]">
            <h3 className="text-lg font-medium text-white">Recent Requests</h3>
          </div>

          {recentRequests.length > 0 ? (
            <div className="divide-y divide-white/[0.08]">
              {recentRequests.map((request) => (
                <div key={request.id} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium">
                      {request.agent?.name || 'Unknown Agent'}
                    </p>
                    <p className="text-sm text-[#8e8e93]">
                      {request.agent?.email}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-[#8e8e93] capitalize">
                      {request.platform}
                    </span>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        statusColors[request.status] || 'bg-gray-500/10 text-gray-400'
                      }`}
                    >
                      {request.status}
                    </span>
                    <span className="text-xs text-[#8e8e93]">
                      {formatDate(request.sent_at || request.scheduled_for)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center">
              <p className="text-[#8e8e93]">No review requests yet</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'settings' && (
        <SettingsPanel settings={settings} />
      )}

      {activeTab === 'templates' && (
        <TemplatesPanel templates={templates} />
      )}
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#1c1c1e] p-4">
      <p className="text-sm text-[#8e8e93] mb-1">{label}</p>
      <p className="text-2xl font-semibold text-white">{value}</p>
    </div>
  )
}

function SettingsPanel({ settings }: { settings: ReviewRequestSettings | null }) {
  if (!settings) {
    return (
      <div className="rounded-xl border border-white/[0.08] bg-[#1c1c1e] p-8 text-center">
        <p className="text-[#8e8e93]">Settings not configured</p>
      </div>
    )
  }

  const delayHours = Math.round(settings.delay_after_delivery_ms / 3600000)

  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#1c1c1e] p-6 space-y-6">
      <h3 className="text-lg font-medium text-white">Configuration</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SettingRow
          label="Delay After Delivery"
          value={`${delayHours} hours`}
          description="Wait time before sending review request"
        />
        <SettingRow
          label="Send Window"
          value={`${settings.send_time_start} - ${settings.send_time_end}`}
          description="Only send during these hours"
        />
        <SettingRow
          label="Max Per Agent/Month"
          value={settings.max_requests_per_agent_per_month.toString()}
          description="Maximum requests per agent per month"
        />
        <SettingRow
          label="Min Days Between"
          value={`${settings.min_days_between_requests} days`}
          description="Minimum days between requests to same agent"
        />
        <SettingRow
          label="Default Channel"
          value={settings.default_channel}
          description="Primary communication channel"
        />
        <SettingRow
          label="Primary Platform"
          value={settings.primary_platform}
          description="Default review platform"
        />
      </div>

      <div className="pt-4 border-t border-white/[0.08]">
        <h4 className="text-sm font-medium text-white mb-4">Review URLs</h4>
        <div className="space-y-3">
          <URLRow platform="Google" url={settings.google_review_url} />
          <URLRow platform="Facebook" url={settings.facebook_review_url} />
          <URLRow platform="Yelp" url={settings.yelp_review_url} />
          <URLRow platform="Trustpilot" url={settings.trustpilot_review_url} />
        </div>
      </div>
    </div>
  )
}

function SettingRow({
  label,
  value,
  description,
}: {
  label: string
  value: string
  description: string
}) {
  return (
    <div>
      <p className="text-sm text-[#8e8e93]">{label}</p>
      <p className="text-white font-medium">{value}</p>
      <p className="text-xs text-[#8e8e93] mt-1">{description}</p>
    </div>
  )
}

function URLRow({ platform, url }: { platform: string; url?: string }) {
  return (
    <div className="flex items-center justify-between bg-[#0a0a0a] rounded-lg p-3">
      <span className="text-sm text-white">{platform}</span>
      {url ? (
        <span className="text-xs text-[#0077ff] truncate max-w-[300px]">{url}</span>
      ) : (
        <span className="text-xs text-[#8e8e93]">Not configured</span>
      )}
    </div>
  )
}

function TemplatesPanel({ templates }: { templates: ReviewRequestTemplate[] }) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#1c1c1e] overflow-hidden">
      <div className="p-4 border-b border-white/[0.08]">
        <h3 className="text-lg font-medium text-white">Email/SMS Templates</h3>
      </div>

      {templates.length > 0 ? (
        <div className="divide-y divide-white/[0.08]">
          {templates.map((template) => (
            <div key={template.id} className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <h4 className="text-white font-medium">{template.name}</h4>
                  {template.is_default && (
                    <span className="text-xs bg-[#0077ff]/20 text-[#0077ff] px-2 py-0.5 rounded">
                      Default
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#8e8e93] capitalize">{template.platform}</span>
                  <span className="text-xs text-[#8e8e93] capitalize">{template.channel}</span>
                  <span
                    className={`w-2 h-2 rounded-full ${
                      template.is_active ? 'bg-green-500' : 'bg-gray-500'
                    }`}
                  />
                </div>
              </div>
              {template.subject && (
                <p className="text-sm text-[#8e8e93]">Subject: {template.subject}</p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="p-8 text-center">
          <p className="text-[#8e8e93]">No templates configured</p>
        </div>
      )}
    </div>
  )
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}
