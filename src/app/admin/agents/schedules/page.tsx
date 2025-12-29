'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Clock,
  Plus,
  Play,
  Pause,
  Trash2,
  Edit2,
  RefreshCw,
  Calendar,
  Zap,
  Bell,
  Bot,
  Check,
} from 'lucide-react'

interface Schedule {
  id: string
  agent_slug: string
  schedule_type: 'cron' | 'interval' | 'event'
  cron_expression: string | null
  interval_minutes: number | null
  event_trigger: string | null
  is_active: boolean
  max_concurrent: number
  last_run_at: string | null
  next_run_at: string | null
  run_count: number
  failure_count: number
  created_at: string
}

const SCHEDULE_TYPES = [
  { value: 'cron', label: 'Cron Schedule', icon: Calendar, description: 'Run at specific times' },
  { value: 'interval', label: 'Interval', icon: Clock, description: 'Run every X minutes' },
  { value: 'event', label: 'Event Trigger', icon: Zap, description: 'Run when event occurs' },
]

const COMMON_CRON = [
  { label: 'Every hour', value: '0 * * * *' },
  { label: 'Every 6 hours', value: '0 */6 * * *' },
  { label: 'Daily at 9 AM', value: '0 9 * * *' },
  { label: 'Daily at 6 PM', value: '0 18 * * *' },
  { label: 'Weekdays at 9 AM', value: '0 9 * * 1-5' },
  { label: 'Weekly on Monday', value: '0 9 * * 1' },
]

const EVENT_TRIGGERS = [
  { value: 'listing_created', label: 'Listing Created' },
  { value: 'listing_delivered', label: 'Listing Delivered' },
  { value: 'order_completed', label: 'Order Completed' },
  { value: 'order_paid', label: 'Order Paid' },
  { value: 'agent_registered', label: 'Agent Registered' },
  { value: 'qc_approved', label: 'QC Approved' },
]

function ScheduleCard({
  schedule,
  onToggle,
  onDelete,
  onRunNow,
}: {
  schedule: Schedule
  onToggle: () => void
  onDelete: () => void
  onRunNow: () => void
}) {
  const typeConfig = SCHEDULE_TYPES.find(t => t.value === schedule.schedule_type)
  const TypeIcon = typeConfig?.icon || Clock

  const getScheduleDescription = () => {
    if (schedule.schedule_type === 'cron' && schedule.cron_expression) {
      const preset = COMMON_CRON.find(c => c.value === schedule.cron_expression)
      return preset?.label || schedule.cron_expression
    }
    if (schedule.schedule_type === 'interval' && schedule.interval_minutes) {
      if (schedule.interval_minutes >= 60) {
        return `Every ${schedule.interval_minutes / 60} hour(s)`
      }
      return `Every ${schedule.interval_minutes} minutes`
    }
    if (schedule.schedule_type === 'event' && schedule.event_trigger) {
      const event = EVENT_TRIGGERS.find(e => e.value === schedule.event_trigger)
      return `On: ${event?.label || schedule.event_trigger}`
    }
    return 'Not configured'
  }

  return (
    <div className={`rounded-xl border bg-[#1c1c1e] p-5 transition-all ${schedule.is_active ? 'border-white/[0.08]' : 'border-white/[0.04] opacity-60'}`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`rounded-lg p-2.5 ${schedule.is_active ? 'bg-[#0077ff]/10 text-[#0077ff]' : 'bg-[#8e8e93]/10 text-[#8e8e93]'}`}>
            <TypeIcon className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-white">{schedule.agent_slug}</h3>
            <p className="text-sm text-[#8e8e93]">{getScheduleDescription()}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onToggle}
            className={`relative w-12 h-7 rounded-full transition-colors ${schedule.is_active ? 'bg-green-500' : 'bg-[#8e8e93]'}`}
          >
            <span className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform ${schedule.is_active ? 'left-6' : 'left-1'}`} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4">
        <div>
          <p className="text-xs text-[#8e8e93] mb-1">Last Run</p>
          <p className="text-sm text-white">
            {schedule.last_run_at
              ? new Date(schedule.last_run_at).toLocaleString()
              : 'Never'
            }
          </p>
        </div>
        <div>
          <p className="text-xs text-[#8e8e93] mb-1">Next Run</p>
          <p className="text-sm text-white">
            {schedule.next_run_at && schedule.is_active
              ? new Date(schedule.next_run_at).toLocaleString()
              : '-'
            }
          </p>
        </div>
        <div>
          <p className="text-xs text-[#8e8e93] mb-1">Stats</p>
          <p className="text-sm">
            <span className="text-green-400">{schedule.run_count} runs</span>
            {schedule.failure_count > 0 && (
              <span className="text-red-400 ml-2">{schedule.failure_count} failed</span>
            )}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 pt-4 border-t border-white/[0.08]">
        <button
          onClick={onRunNow}
          disabled={!schedule.is_active}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0077ff] text-white text-sm rounded-lg hover:bg-[#0066dd] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Play className="h-3.5 w-3.5" />
          Run Now
        </button>
        <button className="p-1.5 text-[#8e8e93] hover:text-white transition-colors">
          <Edit2 className="h-4 w-4" />
        </button>
        <button
          onClick={onDelete}
          className="p-1.5 text-[#8e8e93] hover:text-red-400 transition-colors ml-auto"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

function CreateScheduleModal({
  isOpen,
  onClose,
  onSave,
  agents,
}: {
  isOpen: boolean
  onClose: () => void
  onSave: (data: Partial<Schedule>) => void
  agents: { slug: string; name: string }[]
}) {
  const [formData, setFormData] = useState({
    agent_slug: '',
    schedule_type: 'interval' as 'cron' | 'interval' | 'event',
    cron_expression: '0 9 * * *',
    interval_minutes: 60,
    event_trigger: 'listing_delivered',
    max_concurrent: 1,
  })

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl border border-white/[0.08] bg-[#1c1c1e] p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Create Schedule</h2>
          <button onClick={onClose} className="text-[#8e8e93] hover:text-white">
            <span className="sr-only">Close</span>
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Agent Selection */}
          <div>
            <label className="block text-sm font-medium text-[#a1a1a6] mb-1.5">
              Agent
            </label>
            <select
              value={formData.agent_slug}
              onChange={(e) => setFormData({ ...formData, agent_slug: e.target.value })}
              className="w-full rounded-lg border border-white/[0.08] bg-[#0a0a0a] px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-[#0077ff]"
              required
            >
              <option value="">Select an agent</option>
              {agents.map((agent) => (
                <option key={agent.slug} value={agent.slug}>
                  {agent.name}
                </option>
              ))}
            </select>
          </div>

          {/* Schedule Type */}
          <div>
            <label className="block text-sm font-medium text-[#a1a1a6] mb-2">
              Schedule Type
            </label>
            <div className="grid grid-cols-3 gap-2">
              {SCHEDULE_TYPES.map((type) => {
                const TypeIcon = type.icon
                return (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, schedule_type: type.value as 'cron' | 'interval' | 'event' })}
                    className={`flex flex-col items-center p-3 rounded-lg border transition-all ${
                      formData.schedule_type === type.value
                        ? 'border-[#0077ff] bg-[#0077ff]/10'
                        : 'border-white/[0.08] hover:border-white/[0.15]'
                    }`}
                  >
                    <TypeIcon className={`h-5 w-5 mb-1 ${formData.schedule_type === type.value ? 'text-[#0077ff]' : 'text-[#8e8e93]'}`} />
                    <span className={`text-xs ${formData.schedule_type === type.value ? 'text-white' : 'text-[#8e8e93]'}`}>
                      {type.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Type-specific config */}
          {formData.schedule_type === 'cron' && (
            <div>
              <label className="block text-sm font-medium text-[#a1a1a6] mb-1.5">
                Cron Expression
              </label>
              <select
                value={formData.cron_expression}
                onChange={(e) => setFormData({ ...formData, cron_expression: e.target.value })}
                className="w-full rounded-lg border border-white/[0.08] bg-[#0a0a0a] px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-[#0077ff]"
              >
                {COMMON_CRON.map((cron) => (
                  <option key={cron.value} value={cron.value}>
                    {cron.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {formData.schedule_type === 'interval' && (
            <div>
              <label className="block text-sm font-medium text-[#a1a1a6] mb-1.5">
                Run Every (minutes)
              </label>
              <input
                type="number"
                value={formData.interval_minutes}
                onChange={(e) => setFormData({ ...formData, interval_minutes: parseInt(e.target.value) })}
                min={5}
                className="w-full rounded-lg border border-white/[0.08] bg-[#0a0a0a] px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-[#0077ff]"
              />
            </div>
          )}

          {formData.schedule_type === 'event' && (
            <div>
              <label className="block text-sm font-medium text-[#a1a1a6] mb-1.5">
                Trigger Event
              </label>
              <select
                value={formData.event_trigger}
                onChange={(e) => setFormData({ ...formData, event_trigger: e.target.value })}
                className="w-full rounded-lg border border-white/[0.08] bg-[#0a0a0a] px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-[#0077ff]"
              >
                {EVENT_TRIGGERS.map((event) => (
                  <option key={event.value} value={event.value}>
                    {event.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-[#a1a1a6] mb-1.5">
              Max Concurrent Executions
            </label>
            <input
              type="number"
              value={formData.max_concurrent}
              onChange={(e) => setFormData({ ...formData, max_concurrent: parseInt(e.target.value) })}
              min={1}
              max={10}
              className="w-full rounded-lg border border-white/[0.08] bg-[#0a0a0a] px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-[#0077ff]"
            />
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
              Create Schedule
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function AgentSchedulesPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [agents, setAgents] = useState<{ slug: string; name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const fetchData = async () => {
    try {
      setLoading(true)
      const [schedulesRes, agentsRes] = await Promise.all([
        fetch('/api/admin/agents/schedules'),
        fetch('/api/admin/agents'),
      ])

      if (schedulesRes.ok) {
        const data = await schedulesRes.json()
        setSchedules(data.schedules || [])
      }

      if (agentsRes.ok) {
        const data = await agentsRes.json()
        setAgents(data.agents?.map((a: { slug: string; name: string }) => ({ slug: a.slug, name: a.name })) || [])
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleToggle = async (scheduleId: string, isActive: boolean) => {
    try {
      await fetch(`/api/admin/agents/schedules/${scheduleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !isActive }),
      })
      setSchedules(schedules.map(s =>
        s.id === scheduleId ? { ...s, is_active: !isActive } : s
      ))
    } catch (error) {
      console.error('Error toggling schedule:', error)
    }
  }

  const handleDelete = async (scheduleId: string) => {
    if (!confirm('Are you sure you want to delete this schedule?')) return

    try {
      await fetch(`/api/admin/agents/schedules/${scheduleId}`, { method: 'DELETE' })
      setSchedules(schedules.filter(s => s.id !== scheduleId))
    } catch (error) {
      console.error('Error deleting schedule:', error)
    }
  }

  const handleRunNow = async (agentSlug: string) => {
    try {
      await fetch(`/api/admin/agents/${agentSlug}/execute`, { method: 'POST' })
      alert('Agent execution started!')
    } catch (error) {
      console.error('Error running agent:', error)
    }
  }

  const handleCreate = async (data: Partial<Schedule>) => {
    try {
      const response = await fetch('/api/admin/agents/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (response.ok) {
        fetchData()
      }
    } catch (error) {
      console.error('Error creating schedule:', error)
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
        <div className="flex items-center gap-4">
          <Link
            href="/admin/agents"
            className="flex items-center gap-1 text-[#8e8e93] hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Clock className="h-6 w-6 text-[#0077ff]" />
              Agent Schedules
            </h1>
            <p className="text-[#8e8e93]">
              Configure automated agent execution
            </p>
          </div>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 rounded-lg bg-[#0077ff] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#0066dd] transition-colors"
        >
          <Plus className="h-4 w-4" />
          Create Schedule
        </button>
      </div>

      {/* Schedules Grid */}
      {schedules.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/[0.08] bg-[#1c1c1e] p-12 text-center">
          <Clock className="mx-auto h-12 w-12 text-[#8e8e93]" />
          <h3 className="mt-4 text-lg font-medium text-white">No schedules configured</h3>
          <p className="mt-2 text-[#8e8e93]">
            Create a schedule to automate agent execution.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#0077ff] px-4 py-2 text-sm font-medium text-white hover:bg-[#0066dd] transition-colors"
          >
            <Plus className="h-4 w-4" />
            Create Your First Schedule
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {schedules.map((schedule) => (
            <ScheduleCard
              key={schedule.id}
              schedule={schedule}
              onToggle={() => handleToggle(schedule.id, schedule.is_active)}
              onDelete={() => handleDelete(schedule.id)}
              onRunNow={() => handleRunNow(schedule.agent_slug)}
            />
          ))}
        </div>
      )}

      <CreateScheduleModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleCreate}
        agents={agents}
      />
    </div>
  )
}
