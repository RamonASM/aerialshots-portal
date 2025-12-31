'use client'

import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import {
  Calendar,
  Zap,
  Camera,
  FileText,
  Home,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Plus,
  Trash2,
  ExternalLink,
  Settings2,
  Play,
  Pause,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'

interface CalendarConnection {
  connected: boolean
  calendarName?: string
  syncEnabled?: boolean
  lastSyncAt?: string
}

interface ZapierWebhook {
  id: string
  name: string
  description: string | null
  webhook_url: string
  trigger_event: string
  is_active: boolean
  trigger_count: number
  last_triggered_at: string | null
  created_at: string
}

interface IntegrationStatus {
  service: string
  status: 'active' | 'pending_setup' | 'manual_only'
  configured: boolean
}

const EVENT_TYPE_LABELS: Record<string, string> = {
  order_created: 'Order Created',
  order_delivered: 'Order Delivered',
  order_cancelled: 'Order Cancelled',
  status_changed: 'Status Changed',
  payment_received: 'Payment Received',
  payment_failed: 'Payment Failed',
  assignment_created: 'Assignment Created',
  qc_approved: 'QC Approved',
  qc_rejected: 'QC Rejected',
  media_uploaded: 'Media Uploaded',
  feedback_received: 'Feedback Received',
}

export default function IntegrationsSettingsPage() {
  const [calendarStatus, setCalendarStatus] = useState<CalendarConnection | null>(null)
  const [webhooks, setWebhooks] = useState<ZapierWebhook[]>([])
  const [thirdPartyStatus, setThirdPartyStatus] = useState<Record<string, IntegrationStatus>>({})
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [showWebhookModal, setShowWebhookModal] = useState(false)
  const [newWebhook, setNewWebhook] = useState({
    name: '',
    webhook_url: '',
    trigger_event: 'order_created',
    description: '',
  })

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)

      // Fetch all data in parallel
      const [calendarRes, webhooksRes, cubicasaRes, zillowRes] = await Promise.all([
        fetch('/api/integrations/google-calendar/sync').then((r) => r.json()).catch(() => ({ connected: false })),
        fetch('/api/admin/integrations/zapier').then((r) => r.json()).catch(() => ({ webhooks: [] })),
        fetch('/api/webhooks/cubicasa').then((r) => r.json()).catch(() => ({ status: 'pending_setup' })),
        fetch('/api/webhooks/zillow-3d').then((r) => r.json()).catch(() => ({ status: 'pending_setup' })),
      ])

      setCalendarStatus(calendarRes)
      setWebhooks(webhooksRes.webhooks || [])
      setThirdPartyStatus({
        cubicasa: cubicasaRes,
        zillow_3d: zillowRes,
      })
    } catch (error) {
      console.error('Error fetching integrations:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()

    // Check for URL params (success/error from OAuth)
    const params = new URLSearchParams(window.location.search)
    if (params.get('success') === 'google_connected') {
      // Could show a toast notification here
      window.history.replaceState({}, '', window.location.pathname)
    }
    if (params.get('error')) {
      // Could show error toast
      console.error('Integration error:', params.get('error'))
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [fetchData])

  const connectGoogleCalendar = async () => {
    try {
      const response = await fetch('/api/integrations/google-calendar/connect')
      const data = await response.json()
      if (data.authUrl) {
        window.location.href = data.authUrl
      }
    } catch (error) {
      console.error('Error connecting Google Calendar:', error)
    }
  }

  const disconnectGoogleCalendar = async () => {
    if (!confirm('Are you sure you want to disconnect Google Calendar?')) return

    try {
      await fetch('/api/integrations/google-calendar/disconnect', { method: 'POST' })
      await fetchData()
    } catch (error) {
      console.error('Error disconnecting Google Calendar:', error)
    }
  }

  const syncCalendar = async () => {
    try {
      setSyncing(true)
      const response = await fetch('/api/integrations/google-calendar/sync', { method: 'POST' })
      const result = await response.json()
      console.log('Sync result:', result)
      await fetchData()
    } catch (error) {
      console.error('Error syncing calendar:', error)
    } finally {
      setSyncing(false)
    }
  }

  const createWebhook = async () => {
    if (!newWebhook.name || !newWebhook.webhook_url) return

    try {
      await fetch('/api/admin/integrations/zapier', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newWebhook),
      })
      setShowWebhookModal(false)
      setNewWebhook({ name: '', webhook_url: '', trigger_event: 'order_created', description: '' })
      await fetchData()
    } catch (error) {
      console.error('Error creating webhook:', error)
    }
  }

  const toggleWebhook = async (id: string, isActive: boolean) => {
    try {
      await fetch(`/api/admin/integrations/zapier/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !isActive }),
      })
      await fetchData()
    } catch (error) {
      console.error('Error toggling webhook:', error)
    }
  }

  const deleteWebhook = async (id: string) => {
    if (!confirm('Are you sure you want to delete this webhook?')) return

    try {
      await fetch(`/api/admin/integrations/zapier/${id}`, { method: 'DELETE' })
      await fetchData()
    } catch (error) {
      console.error('Error deleting webhook:', error)
    }
  }

  const testWebhook = async (id: string) => {
    try {
      const response = await fetch('/api/admin/integrations/zapier/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhook_id: id }),
      })
      const result = await response.json()
      if (result.success) {
        toast.success(`Test successful! Status: ${result.status}`)
      } else {
        toast.error(`Test failed: ${result.error}`)
      }
    } catch (error) {
      console.error('Error testing webhook:', error)
    }
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Integrations</h1>
          <p className="text-neutral-500 dark:text-neutral-400">
            Manage third-party connections and webhooks
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
        </div>
      ) : (
        <>
          {/* Google Calendar */}
          <div className="rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
            <div className="border-b border-neutral-200 px-5 py-4 dark:border-neutral-800">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900/30">
                  <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h2 className="font-semibold text-neutral-900 dark:text-white">Google Calendar</h2>
                  <p className="text-sm text-neutral-500">Sync photographer assignments to calendar</p>
                </div>
              </div>
            </div>
            <div className="p-5">
              {calendarStatus?.connected ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span className="text-green-600 dark:text-green-400">Connected</span>
                    <span className="text-neutral-500">to {calendarStatus.calendarName}</span>
                  </div>
                  {calendarStatus.lastSyncAt && (
                    <p className="text-sm text-neutral-500">
                      Last synced: {new Date(calendarStatus.lastSyncAt).toLocaleString()}
                    </p>
                  )}
                  <div className="flex gap-2">
                    <Button size="sm" onClick={syncCalendar} disabled={syncing}>
                      {syncing ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="mr-2 h-4 w-4" />
                      )}
                      Sync Now
                    </Button>
                    <Button size="sm" variant="outline" onClick={disconnectGoogleCalendar}>
                      Disconnect
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-5 w-5 text-neutral-400" />
                    <span className="text-neutral-500">Not connected</span>
                  </div>
                  <Button onClick={connectGoogleCalendar}>
                    <Calendar className="mr-2 h-4 w-4" />
                    Connect Google Calendar
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Zapier Webhooks */}
          <div className="rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
            <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4 dark:border-neutral-800">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-orange-100 p-2 dark:bg-orange-900/30">
                  <Zap className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <h2 className="font-semibold text-neutral-900 dark:text-white">Zapier Webhooks</h2>
                  <p className="text-sm text-neutral-500">Automate workflows with webhook triggers</p>
                </div>
              </div>
              <Button size="sm" onClick={() => setShowWebhookModal(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Webhook
              </Button>
            </div>
            <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {webhooks.length === 0 ? (
                <div className="p-8 text-center text-neutral-500">
                  No webhooks configured yet
                </div>
              ) : (
                webhooks.map((webhook) => (
                  <div key={webhook.id} className="flex items-center justify-between px-5 py-4">
                    <div className="flex items-center gap-4">
                      <div
                        className={`h-3 w-3 rounded-full ${webhook.is_active ? 'bg-green-500' : 'bg-neutral-300'}`}
                      />
                      <div>
                        <div className="font-medium text-neutral-900 dark:text-white">
                          {webhook.name}
                        </div>
                        <div className="text-sm text-neutral-500">
                          Trigger: {EVENT_TYPE_LABELS[webhook.trigger_event] || webhook.trigger_event}
                        </div>
                        <div className="text-xs text-neutral-400">
                          {webhook.trigger_count} triggers
                          {webhook.last_triggered_at &&
                            ` • Last: ${new Date(webhook.last_triggered_at).toLocaleDateString()}`}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => testWebhook(webhook.id)}
                        title="Test webhook"
                      >
                        <Play className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => toggleWebhook(webhook.id, webhook.is_active)}
                        title={webhook.is_active ? 'Pause' : 'Activate'}
                      >
                        {webhook.is_active ? (
                          <Pause className="h-4 w-4" />
                        ) : (
                          <Play className="h-4 w-4 text-green-500" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteWebhook(webhook.id)}
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Third-Party Services */}
          <div className="rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
            <div className="border-b border-neutral-200 px-5 py-4 dark:border-neutral-800">
              <h2 className="font-semibold text-neutral-900 dark:text-white">
                Third-Party Services
              </h2>
              <p className="text-sm text-neutral-500">
                External integrations for editing, floor plans, and 3D tours
              </p>
            </div>
            <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {/* Cubicasa */}
              <div className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-4">
                  <div className="rounded-lg bg-green-100 p-2 dark:bg-green-900/30">
                    <FileText className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <div className="font-medium text-neutral-900 dark:text-white">Cubicasa</div>
                    <div className="text-sm text-neutral-500">Floor plan service</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {thirdPartyStatus.cubicasa?.configured ? (
                    <span className="flex items-center gap-1 text-sm text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      Active
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-sm text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      Ready
                    </span>
                  )}
                  <Button size="sm" variant="ghost" asChild>
                    <a href="https://app.cubi.casa" target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </div>

              {/* Zillow 3D */}
              <div className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-4">
                  <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900/30">
                    <Home className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <div className="font-medium text-neutral-900 dark:text-white">Zillow 3D Home</div>
                    <div className="text-sm text-neutral-500">3D virtual tours</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1 text-sm text-neutral-600">
                    <Settings2 className="h-4 w-4" />
                    Manual
                  </span>
                  <Button size="sm" variant="ghost" asChild>
                    <a href="https://zillow.com/3d-home" target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Add Webhook Modal */}
      <Dialog open={showWebhookModal} onOpenChange={setShowWebhookModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Webhook</DialogTitle>
            <DialogDescription>
              Configure a webhook to trigger automations when events occur.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label
                htmlFor="webhook-name"
                className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300"
              >
                Name
              </label>
              <input
                id="webhook-name"
                type="text"
                value={newWebhook.name}
                onChange={(e) => setNewWebhook({ ...newWebhook, name: e.target.value })}
                className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                placeholder="My Zapier Webhook"
              />
            </div>
            <div>
              <label
                htmlFor="webhook-url"
                className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300"
              >
                Webhook URL
              </label>
              <input
                id="webhook-url"
                type="url"
                value={newWebhook.webhook_url}
                onChange={(e) => setNewWebhook({ ...newWebhook, webhook_url: e.target.value })}
                className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                placeholder="https://hooks.zapier.com/..."
              />
            </div>
            <div>
              <label
                htmlFor="webhook-trigger"
                className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300"
              >
                Trigger Event
              </label>
              <select
                id="webhook-trigger"
                value={newWebhook.trigger_event}
                onChange={(e) => setNewWebhook({ ...newWebhook, trigger_event: e.target.value })}
                className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
              >
                {Object.entries(EVENT_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="webhook-description"
                className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300"
              >
                Description (optional)
              </label>
              <input
                id="webhook-description"
                type="text"
                value={newWebhook.description}
                onChange={(e) => setNewWebhook({ ...newWebhook, description: e.target.value })}
                className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                placeholder="Sends notification to Slack..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowWebhookModal(false)}>
              Cancel
            </Button>
            <Button onClick={createWebhook} disabled={!newWebhook.name || !newWebhook.webhook_url}>
              Create Webhook
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
