'use client'

import { useEffect, useState } from 'react'
import {
  Bell,
  BellRing,
  Plus,
  Trash2,
  Edit2,
  ToggleLeft,
  ToggleRight,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  Users,
  Clock,
  RefreshCw,
  Check,
  X,
} from 'lucide-react'

interface Alert {
  id: string
  name: string
  description: string | null
  metric_type: string
  condition: string
  threshold: number
  comparison_period: string
  notification_channels: string[]
  is_active: boolean
  last_triggered_at: string | null
  trigger_count: number
  created_at: string
}

interface AlertHistory {
  id: string
  alert_id: string
  alert_name: string
  triggered_at: string
  metric_value: number
  threshold_value: number
  message: string | null
  acknowledged_at: string | null
}

const METRIC_TYPES = [
  { value: 'revenue', label: 'Revenue', icon: DollarSign },
  { value: 'orders', label: 'Orders', icon: Package },
  { value: 'leads', label: 'Leads', icon: Users },
  { value: 'qc_time', label: 'QC Time', icon: Clock },
  { value: 'delivery_time', label: 'Delivery Time', icon: Clock },
  { value: 'conversion_rate', label: 'Conversion Rate', icon: TrendingUp },
]

const CONDITIONS = [
  { value: 'above', label: 'Goes above' },
  { value: 'below', label: 'Falls below' },
  { value: 'change_percent', label: 'Changes by %' },
]

const PERIODS = [
  { value: 'hour', label: 'Per hour' },
  { value: 'day', label: 'Per day' },
  { value: 'week', label: 'Per week' },
  { value: 'month', label: 'Per month' },
]

function AlertCard({
  alert,
  onToggle,
  onEdit,
  onDelete,
}: {
  alert: Alert
  onToggle: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const metricInfo = METRIC_TYPES.find((m) => m.value === alert.metric_type)
  const Icon = metricInfo?.icon || TrendingUp

  const conditionText = CONDITIONS.find((c) => c.value === alert.condition)?.label || alert.condition
  const periodText = PERIODS.find((p) => p.value === alert.comparison_period)?.label || alert.comparison_period

  return (
    <div className={`rounded-xl border ${alert.is_active ? 'border-white/[0.08]' : 'border-white/[0.04]'} bg-[#1c1c1e] p-5 transition-all ${!alert.is_active && 'opacity-60'}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className={`rounded-lg p-2.5 ${alert.is_active ? 'bg-[#0077ff]/10 text-[#0077ff]' : 'bg-[#8e8e93]/10 text-[#8e8e93]'}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-white">{alert.name}</h3>
            <p className="text-sm text-[#8e8e93] mt-1">
              {conditionText} {alert.threshold.toLocaleString()} {periodText}
            </p>
            {alert.description && (
              <p className="text-xs text-[#8e8e93] mt-2">{alert.description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onToggle}
            className="p-2 text-[#8e8e93] hover:text-white transition-colors"
            title={alert.is_active ? 'Disable alert' : 'Enable alert'}
          >
            {alert.is_active ? (
              <ToggleRight className="h-5 w-5 text-green-400" />
            ) : (
              <ToggleLeft className="h-5 w-5" />
            )}
          </button>
          <button
            onClick={onEdit}
            className="p-2 text-[#8e8e93] hover:text-white transition-colors"
          >
            <Edit2 className="h-4 w-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-2 text-[#8e8e93] hover:text-red-400 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-4 text-xs">
        <span className="text-[#8e8e93]">
          Triggered {alert.trigger_count} times
        </span>
        {alert.last_triggered_at && (
          <span className="text-[#8e8e93]">
            Last: {new Date(alert.last_triggered_at).toLocaleDateString()}
          </span>
        )}
        <div className="flex items-center gap-1">
          {alert.notification_channels.includes('email') && (
            <span className="rounded bg-[#0a0a0a] px-1.5 py-0.5 text-[#8e8e93]">Email</span>
          )}
          {alert.notification_channels.includes('sms') && (
            <span className="rounded bg-[#0a0a0a] px-1.5 py-0.5 text-[#8e8e93]">SMS</span>
          )}
          {alert.notification_channels.includes('push') && (
            <span className="rounded bg-[#0a0a0a] px-1.5 py-0.5 text-[#8e8e93]">Push</span>
          )}
        </div>
      </div>
    </div>
  )
}

function AlertHistoryItem({
  item,
  onAcknowledge,
}: {
  item: AlertHistory
  onAcknowledge: () => void
}) {
  return (
    <div className="flex items-center gap-4 py-3">
      <div className="rounded-full bg-orange-500/20 p-2">
        <BellRing className="h-4 w-4 text-orange-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white">
          <span className="font-medium">{item.alert_name}</span>
          {' '}{item.message || `reached ${item.metric_value.toLocaleString()} (threshold: ${item.threshold_value.toLocaleString()})`}
        </p>
        <p className="text-xs text-[#8e8e93]">
          {new Date(item.triggered_at).toLocaleString()}
        </p>
      </div>
      {!item.acknowledged_at ? (
        <button
          onClick={onAcknowledge}
          className="rounded-lg bg-[#0a0a0a] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#151515] transition-colors"
        >
          Acknowledge
        </button>
      ) : (
        <span className="flex items-center gap-1 text-xs text-green-400">
          <Check className="h-3 w-3" />
          Acknowledged
        </span>
      )}
    </div>
  )
}

function CreateAlertModal({
  isOpen,
  onClose,
  onSave,
}: {
  isOpen: boolean
  onClose: () => void
  onSave: (alert: Partial<Alert>) => void
}) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    metric_type: 'revenue',
    condition: 'above',
    threshold: 0,
    comparison_period: 'day',
    notification_channels: ['email'],
  })

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-white/[0.08] bg-[#1c1c1e] p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Create Alert</h2>
          <button onClick={onClose} className="text-[#8e8e93] hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#a1a1a6] mb-1.5">
              Alert Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full rounded-lg border border-white/[0.08] bg-[#0a0a0a] px-4 py-2.5 text-white placeholder-[#8e8e93] focus:outline-none focus:ring-2 focus:ring-[#0077ff]"
              placeholder="e.g., Low daily revenue"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#a1a1a6] mb-1.5">
                Metric
              </label>
              <select
                value={formData.metric_type}
                onChange={(e) => setFormData({ ...formData, metric_type: e.target.value })}
                className="w-full rounded-lg border border-white/[0.08] bg-[#0a0a0a] px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-[#0077ff]"
              >
                {METRIC_TYPES.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#a1a1a6] mb-1.5">
                Condition
              </label>
              <select
                value={formData.condition}
                onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                className="w-full rounded-lg border border-white/[0.08] bg-[#0a0a0a] px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-[#0077ff]"
              >
                {CONDITIONS.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#a1a1a6] mb-1.5">
                Threshold
              </label>
              <input
                type="number"
                value={formData.threshold}
                onChange={(e) => setFormData({ ...formData, threshold: parseFloat(e.target.value) })}
                className="w-full rounded-lg border border-white/[0.08] bg-[#0a0a0a] px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-[#0077ff]"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#a1a1a6] mb-1.5">
                Period
              </label>
              <select
                value={formData.comparison_period}
                onChange={(e) => setFormData({ ...formData, comparison_period: e.target.value })}
                className="w-full rounded-lg border border-white/[0.08] bg-[#0a0a0a] px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-[#0077ff]"
              >
                {PERIODS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#a1a1a6] mb-1.5">
              Notification Channels
            </label>
            <div className="flex gap-2">
              {['email', 'sms', 'push'].map((channel) => (
                <button
                  key={channel}
                  type="button"
                  onClick={() => {
                    const channels = formData.notification_channels.includes(channel)
                      ? formData.notification_channels.filter((c) => c !== channel)
                      : [...formData.notification_channels, channel]
                    setFormData({ ...formData, notification_channels: channels })
                  }}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    formData.notification_channels.includes(channel)
                      ? 'bg-[#0077ff] text-white'
                      : 'bg-[#0a0a0a] text-[#8e8e93] hover:text-white'
                  }`}
                >
                  {channel.charAt(0).toUpperCase() + channel.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-white/[0.08] bg-[#0a0a0a] py-2.5 text-white hover:bg-[#151515] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 rounded-lg bg-[#0077ff] py-2.5 text-white hover:bg-[#0066dd] transition-colors"
            >
              Create Alert
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [history, setHistory] = useState<AlertHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const fetchData = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/analytics/alerts')
      if (response.ok) {
        const data = await response.json()
        setAlerts(data.alerts || [])
        setHistory(data.history || [])
      }
    } catch (error) {
      console.error('Error fetching alerts:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleCreateAlert = async (alertData: Partial<Alert>) => {
    try {
      const response = await fetch('/api/admin/analytics/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(alertData),
      })
      if (response.ok) {
        fetchData()
      }
    } catch (error) {
      console.error('Error creating alert:', error)
    }
  }

  const handleToggleAlert = async (alertId: string, isActive: boolean) => {
    try {
      await fetch(`/api/admin/analytics/alerts/${alertId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !isActive }),
      })
      setAlerts(alerts.map((a) =>
        a.id === alertId ? { ...a, is_active: !isActive } : a
      ))
    } catch (error) {
      console.error('Error toggling alert:', error)
    }
  }

  const handleDeleteAlert = async (alertId: string) => {
    if (!confirm('Are you sure you want to delete this alert?')) return

    try {
      await fetch(`/api/admin/analytics/alerts/${alertId}`, { method: 'DELETE' })
      setAlerts(alerts.filter((a) => a.id !== alertId))
    } catch (error) {
      console.error('Error deleting alert:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-[#8e8e93]" />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Bell className="h-6 w-6 text-orange-400" />
            Analytics Alerts
          </h1>
          <p className="text-[#8e8e93]">
            Set up automated alerts for key metrics
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 rounded-lg bg-[#0077ff] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#0066dd] transition-colors"
        >
          <Plus className="h-4 w-4" />
          Create Alert
        </button>
      </div>

      {/* Active Alerts */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">Active Alerts</h2>
        {alerts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/[0.08] bg-[#1c1c1e] p-8 text-center">
            <Bell className="mx-auto h-12 w-12 text-[#8e8e93]" />
            <h3 className="mt-4 text-lg font-medium text-white">No alerts configured</h3>
            <p className="mt-2 text-[#8e8e93]">
              Create an alert to monitor key metrics and get notified.
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#0077ff] px-4 py-2 text-sm font-medium text-white hover:bg-[#0066dd] transition-colors"
            >
              <Plus className="h-4 w-4" />
              Create Your First Alert
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {alerts.map((alert) => (
              <AlertCard
                key={alert.id}
                alert={alert}
                onToggle={() => handleToggleAlert(alert.id, alert.is_active)}
                onEdit={() => {}}
                onDelete={() => handleDeleteAlert(alert.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Alert History */}
      <div className="rounded-xl border border-white/[0.08] bg-[#1c1c1e]">
        <div className="border-b border-white/[0.08] p-4">
          <h2 className="font-semibold text-white flex items-center gap-2">
            <BellRing className="h-5 w-5 text-orange-400" />
            Recent Triggers
          </h2>
        </div>
        <div className="divide-y divide-white/[0.08] p-4">
          {history.length === 0 ? (
            <div className="py-8 text-center text-[#8e8e93]">
              No alerts have been triggered yet
            </div>
          ) : (
            history.slice(0, 10).map((item) => (
              <AlertHistoryItem
                key={item.id}
                item={item}
                onAcknowledge={() => {}}
              />
            ))
          )}
        </div>
      </div>

      <CreateAlertModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleCreateAlert}
      />
    </div>
  )
}
