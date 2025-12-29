'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Bell,
  Plus,
  Search,
  RefreshCw,
  ChevronRight,
  Clock,
  Zap,
  Calendar,
  CheckCircle,
  XCircle,
  Mail,
  MessageSquare,
  Play,
  Pause,
  Trash2,
  Settings,
  AlertTriangle,
  ArrowRight,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { SkeletonCard } from '@/components/ui/skeleton'
import { EmptyNotificationsState } from '@/components/ui/empty-state'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface NotificationRule {
  id: string
  name: string
  description: string | null
  trigger_type: 'status_change' | 'time_delay' | 'schedule' | 'integration_complete' | 'integration_failed'
  trigger_conditions: {
    from_status?: string
    to_status?: string
    delay_minutes?: number
    integration_type?: string
    service_types?: string[]
  }
  channels: ('email' | 'sms')[]
  template_id: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

interface NotificationsData {
  rules: NotificationRule[]
  stats: {
    totalRules: number
    activeRules: number
    inactiveRules: number
    byTrigger: Record<string, number>
  }
}

const TRIGGER_CONFIG: Record<string, { label: string; icon: LucideIcon; color: string }> = {
  status_change: {
    label: 'Status Change',
    icon: ArrowRight,
    color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30',
  },
  time_delay: {
    label: 'Time Delay',
    icon: Clock,
    color: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30',
  },
  schedule: {
    label: 'Scheduled',
    icon: Calendar,
    color: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30',
  },
  integration_complete: {
    label: 'Integration Complete',
    icon: CheckCircle,
    color: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30',
  },
  integration_failed: {
    label: 'Integration Failed',
    icon: AlertTriangle,
    color: 'text-red-600 bg-red-100 dark:bg-red-900/30',
  },
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  scheduled: 'Scheduled',
  in_progress: 'In Progress',
  ready_for_qc: 'Ready for QC',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
}

export default function NotificationsPage() {
  const [data, setData] = useState<NotificationsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showNewRuleModal, setShowNewRuleModal] = useState(false)

  const fetchRules = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/notifications')
      if (!response.ok) throw new Error('Failed to fetch')
      const result = await response.json()
      setData(result)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRules()
  }, [fetchRules])

  const filteredRules = data?.rules.filter(
    (rule) =>
      rule.name.toLowerCase().includes(search.toLowerCase()) ||
      rule.description?.toLowerCase().includes(search.toLowerCase())
  ) || []

  const toggleRuleStatus = async (ruleId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/admin/notifications/${ruleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !currentStatus }),
      })

      if (!response.ok) {
        throw new Error('Failed to update rule')
      }

      toast.success(currentStatus ? 'Rule deactivated' : 'Rule activated')
      fetchRules()
    } catch (error) {
      console.error('Toggle rule error:', error)
      toast.error('Failed to update rule status')
    }
  }

  const deleteRule = async (ruleId: string) => {
    if (!window.confirm('Are you sure you want to delete this rule?')) return

    try {
      const response = await fetch(`/api/admin/notifications/${ruleId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete rule')
      }

      toast.success('Rule deleted successfully')
      fetchRules()
    } catch (error) {
      console.error('Delete rule error:', error)
      toast.error('Failed to delete rule')
    }
  }

  const formatDelayTime = (minutes: number) => {
    if (minutes < 60) return `${minutes} minutes`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (mins === 0) return `${hours} hour${hours > 1 ? 's' : ''}`
    return `${hours}h ${mins}m`
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Notification Rules</h1>
          <p className="text-neutral-500 dark:text-neutral-400">
            Configure automated notifications based on triggers
          </p>
        </div>
        <button
          onClick={() => setShowNewRuleModal(true)}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          New Rule
        </button>
      </div>

      {/* Stats */}
      {data && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-blue-100 p-2 dark:bg-blue-900/30">
                <Bell className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-neutral-900 dark:text-white">{data.stats.totalRules}</p>
                <p className="text-sm text-neutral-500">Total Rules</p>
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-emerald-100 p-2 dark:bg-emerald-900/30">
                <Play className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-600">{data.stats.activeRules}</p>
                <p className="text-sm text-neutral-500">Active</p>
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-neutral-100 p-2 dark:bg-neutral-800">
                <Pause className="h-5 w-5 text-neutral-600 dark:text-neutral-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-neutral-600 dark:text-neutral-400">{data.stats.inactiveRules}</p>
                <p className="text-sm text-neutral-500">Inactive</p>
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-amber-100 p-2 dark:bg-amber-900/30">
                <Zap className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                  {data.stats.byTrigger.status_change || 0}
                </p>
                <p className="text-sm text-neutral-500">Status Triggers</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" aria-hidden="true" />
          <input
            type="text"
            placeholder="Search rules..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search notification rules"
            className="w-full rounded-lg border border-neutral-200 bg-white py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
          />
        </div>
        <button
          onClick={fetchRules}
          className="rounded-lg border border-neutral-200 bg-white p-2.5 text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 min-w-[44px] min-h-[44px] flex items-center justify-center"
          aria-label="Refresh notification rules"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Rules List */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <SkeletonCard key={i} className="h-48" />
          ))}
        </div>
      ) : filteredRules.length === 0 ? (
        <EmptyNotificationsState />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {filteredRules.map((rule) => {
            const triggerConfig = TRIGGER_CONFIG[rule.trigger_type]
            const TriggerIcon = triggerConfig.icon

            return (
              <div
                key={rule.id}
                className={cn(
                  'rounded-lg border bg-white p-5 transition-all hover:shadow-md dark:bg-neutral-900',
                  rule.is_active
                    ? 'border-neutral-200 dark:border-neutral-800'
                    : 'border-dashed border-neutral-300 opacity-60 dark:border-neutral-700'
                )}
              >
                {/* Header */}
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn('rounded-lg p-2', triggerConfig.color)}>
                      <TriggerIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-neutral-900 dark:text-white">{rule.name}</h3>
                      <p className="text-xs text-neutral-500">{triggerConfig.label}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => toggleRuleStatus(rule.id, rule.is_active)}
                      className={cn(
                        'rounded-lg p-2.5 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center',
                        rule.is_active
                          ? 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
                          : 'text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                      )}
                      aria-label={rule.is_active ? `Deactivate rule: ${rule.name}` : `Activate rule: ${rule.name}`}
                    >
                      {rule.is_active ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                    </button>
                    <button
                      onClick={() => deleteRule(rule.id)}
                      className="rounded-lg p-2.5 text-neutral-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 min-w-[44px] min-h-[44px] flex items-center justify-center"
                      aria-label={`Delete rule: ${rule.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Description */}
                {rule.description && (
                  <p className="mb-4 text-sm text-neutral-600 dark:text-neutral-400">{rule.description}</p>
                )}

                {/* Trigger Details */}
                <div className="mb-4 rounded-lg bg-neutral-50 p-3 dark:bg-neutral-800/50">
                  {rule.trigger_type === 'status_change' && rule.trigger_conditions.from_status && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="rounded bg-neutral-200 px-2 py-0.5 font-medium text-neutral-700 dark:bg-neutral-700 dark:text-neutral-300">
                        {STATUS_LABELS[rule.trigger_conditions.from_status] || rule.trigger_conditions.from_status}
                      </span>
                      <ArrowRight className="h-4 w-4 text-neutral-400" />
                      <span className="rounded bg-blue-100 px-2 py-0.5 font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                        {STATUS_LABELS[rule.trigger_conditions.to_status || ''] || rule.trigger_conditions.to_status}
                      </span>
                    </div>
                  )}
                  {rule.trigger_type === 'time_delay' && rule.trigger_conditions.delay_minutes && (
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-amber-600" />
                      <span className="text-neutral-700 dark:text-neutral-300">
                        After {formatDelayTime(rule.trigger_conditions.delay_minutes)}
                      </span>
                    </div>
                  )}
                  {(rule.trigger_type === 'integration_complete' || rule.trigger_type === 'integration_failed') && (
                    <div className="flex items-center gap-2 text-sm">
                      <Zap className="h-4 w-4 text-purple-600" />
                      <span className="text-neutral-700 dark:text-neutral-300">
                        {rule.trigger_conditions.integration_type || 'Any integration'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Channels */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-neutral-500">Channels:</span>
                  <div className="flex items-center gap-1">
                    {rule.channels.includes('email') && (
                      <span className="flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                        <Mail className="h-3 w-3" />
                        Email
                      </span>
                    )}
                    {rule.channels.includes('sms') && (
                      <span className="flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                        <MessageSquare className="h-3 w-3" />
                        SMS
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* New Rule Modal */}
      <NewRuleModal
        open={showNewRuleModal}
        onOpenChange={setShowNewRuleModal}
        onSave={async (rule) => {
          try {
            const response = await fetch('/api/admin/notifications', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(rule),
            })

            if (!response.ok) {
              throw new Error('Failed to create rule')
            }

            toast.success('Rule created successfully')
            setShowNewRuleModal(false)
            fetchRules()
          } catch (error) {
            console.error('Create rule error:', error)
            toast.error('Failed to create rule')
            throw error
          }
        }}
      />
    </div>
  )
}

// New Rule Modal Component - Uses accessible Dialog from shadcn/ui
function NewRuleModal({
  open,
  onOpenChange,
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (rule: Partial<NotificationRule>) => Promise<void>
}) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [triggerType, setTriggerType] = useState<NotificationRule['trigger_type']>('status_change')
  const [fromStatus, setFromStatus] = useState('')
  const [toStatus, setToStatus] = useState('')
  const [delayMinutes, setDelayMinutes] = useState(60)
  const [integrationT, setIntegrationT] = useState('')
  const [channels, setChannels] = useState<('email' | 'sms')[]>(['email'])
  const [saving, setSaving] = useState(false)

  // Reset form when modal closes
  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setName('')
      setDescription('')
      setTriggerType('status_change')
      setFromStatus('')
      setToStatus('')
      setDelayMinutes(60)
      setIntegrationT('')
      setChannels(['email'])
    }
    onOpenChange(isOpen)
  }

  const handleSave = async () => {
    if (!name) return

    setSaving(true)
    try {
      const triggerConditions: NotificationRule['trigger_conditions'] = {}

      if (triggerType === 'status_change') {
        triggerConditions.from_status = fromStatus
        triggerConditions.to_status = toStatus
      } else if (triggerType === 'time_delay') {
        triggerConditions.delay_minutes = delayMinutes
      } else if (triggerType === 'integration_complete' || triggerType === 'integration_failed') {
        triggerConditions.integration_type = integrationT
      }

      await onSave({
        name,
        description,
        trigger_type: triggerType,
        trigger_conditions: triggerConditions,
        channels,
        is_active: true,
      })
    } finally {
      setSaving(false)
    }
  }

  const toggleChannel = (channel: 'email' | 'sms') => {
    setChannels((prev) =>
      prev.includes(channel) ? prev.filter((c) => c !== channel) : [...prev, channel]
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Notification Rule</DialogTitle>
          <DialogDescription>
            Configure automated notifications based on triggers like status changes or time delays.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Name */}
          <div>
            <label htmlFor="rule-name" className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Rule Name
            </label>
            <input
              id="rule-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Delivery Complete Notification"
              className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="rule-description" className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Description (optional)
            </label>
            <textarea
              id="rule-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this rule do?"
              rows={2}
              className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
            />
          </div>

          {/* Trigger Type */}
          <div>
            <label htmlFor="trigger-type" className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Trigger Type
            </label>
            <select
              id="trigger-type"
              value={triggerType}
              onChange={(e) => setTriggerType(e.target.value as NotificationRule['trigger_type'])}
              className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
            >
              <option value="status_change">Status Change</option>
              <option value="time_delay">Time Delay</option>
              <option value="integration_complete">Integration Complete</option>
              <option value="integration_failed">Integration Failed</option>
            </select>
          </div>

          {/* Trigger Conditions */}
          {triggerType === 'status_change' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="from-status" className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  From Status
                </label>
                <select
                  id="from-status"
                  value={fromStatus}
                  onChange={(e) => setFromStatus(e.target.value)}
                  className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                >
                  <option value="">Any</option>
                  <option value="pending">Pending</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="in_progress">In Progress</option>
                  <option value="ready_for_qc">Ready for QC</option>
                </select>
              </div>
              <div>
                <label htmlFor="to-status" className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  To Status
                </label>
                <select
                  id="to-status"
                  value={toStatus}
                  onChange={(e) => setToStatus(e.target.value)}
                  className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                >
                  <option value="">Any</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="in_progress">In Progress</option>
                  <option value="ready_for_qc">Ready for QC</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>
          )}

          {triggerType === 'time_delay' && (
            <div>
              <label htmlFor="delay-minutes" className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Delay (minutes)
              </label>
              <input
                id="delay-minutes"
                type="number"
                value={delayMinutes}
                onChange={(e) => setDelayMinutes(parseInt(e.target.value) || 0)}
                min={1}
                className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
              />
            </div>
          )}

          {(triggerType === 'integration_complete' || triggerType === 'integration_failed') && (
            <div>
              <label htmlFor="integration-type" className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Integration Type
              </label>
              <select
                id="integration-type"
                value={integrationT}
                onChange={(e) => setIntegrationT(e.target.value)}
                className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
              >
                <option value="">Any Integration</option>
                <option value="fotello">Fotello (AI Editing)</option>
                <option value="cubicasa">Cubicasa (Floor Plans)</option>
                <option value="zillow_3d">Zillow 3D Tours</option>
              </select>
            </div>
          )}

          {/* Channels */}
          <div>
            <span className="mb-2 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Notification Channels
            </span>
            <div className="flex gap-3" role="group" aria-label="Notification channels">
              <button
                type="button"
                onClick={() => toggleChannel('email')}
                aria-pressed={channels.includes('email')}
                className={cn(
                  'flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors',
                  channels.includes('email')
                    ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                    : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-400'
                )}
              >
                <Mail className="h-4 w-4" aria-hidden="true" />
                Email
              </button>
              <button
                type="button"
                onClick={() => toggleChannel('sms')}
                aria-pressed={channels.includes('sms')}
                className={cn(
                  'flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors',
                  channels.includes('sms')
                    ? 'border-purple-500 bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                    : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-400'
                )}
              >
                <MessageSquare className="h-4 w-4" aria-hidden="true" />
                SMS
              </button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!name || channels.length === 0 || saving}
          >
            {saving ? 'Creating...' : 'Create Rule'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
